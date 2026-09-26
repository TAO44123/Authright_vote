import { NextRequest, NextResponse } from "next/server";
import { failure, requireJson, requireOrigin } from "@/lib/api";
import { castVote, getStats } from "@/lib/polls";
import { clientAddress, rateLimit } from "@/lib/rate";
import { getVoter, setVoterCookie } from "@/lib/security";
import { voteSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireOrigin(req);
    requireJson(req);
    const { id } = await params;
    const voter = getVoter(req);
    rateLimit(`vote:${id}:${voter.id}`, 8, 60 * 1000);
    rateLimit(`vote-ip:${clientAddress(req)}`, 120, 60 * 1000);
    const { optionId } = voteSchema.parse(await req.json());
    const result = castVote(id, optionId, voter.id);
    const response = NextResponse.json({ ...result, stats: getStats(id) },
      { headers: { "Cache-Control": "private, no-store" } });
    if (voter.fresh) setVoterCookie(response, voter.id);
    return response;
  } catch (error) {
    return failure(error);
  }
}

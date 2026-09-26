import { NextRequest, NextResponse } from "next/server";
import { findPoll, getStats, getVote, publicPoll } from "@/lib/polls";
import { getVoter, setVoterCookie } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poll = findPoll(id);
  if (!poll) return NextResponse.json({ error: "投票不存在" }, { status: 404 });
  const voter = getVoter(req);
  const ownVote = getVote(id, voter.id);
  const info = publicPoll(poll);
  const canSeeResults = info.status === "ended" || Boolean(ownVote);
  const response = NextResponse.json({
    poll: info,
    ownOptionId: ownVote?.option_id ?? null,
    stats: canSeeResults ? getStats(id) : null,
  }, { headers: { "Cache-Control": "private, no-store" } });
  if (voter.fresh) setVoterCookie(response, voter.id);
  return response;
}

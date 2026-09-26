import { NextRequest, NextResponse } from "next/server";
import { failure, requireJson, requireOrigin } from "@/lib/api";
import { createPoll } from "@/lib/polls";
import { clientAddress, rateLimit } from "@/lib/rate";
import { createPollSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    requireOrigin(req);
    requireJson(req);
    rateLimit(`create:${clientAddress(req)}`, 10, 60 * 60 * 1000);
    const data = createPollSchema.parse(await req.json());
    const id = createPoll(data);
    return NextResponse.json({ id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}

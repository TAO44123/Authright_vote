import { NextRequest, NextResponse } from "next/server";
import { failure, requireJson, requireOrigin } from "@/lib/api";
import { findPoll, PollError } from "@/lib/polls";
import { clientAddress, rateLimit } from "@/lib/rate";
import { createSession, hashToken, managerCookie, setSessionCookie } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireOrigin(req);
    requireJson(req);
    rateLimit(`exchange:${clientAddress(req)}`, 20, 60 * 60 * 1000);
    const { id } = await params;
    const { token } = await req.json() as { token?: unknown };
    const poll = findPoll(id);
    if (!poll || typeof token !== "string" || hashToken(token) !== poll.manager_hash) {
      throw new PollError(403, "管理链接无效或已重置");
    }
    const session = createSession("manager", undefined, id, poll.manager_version);
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    setSessionCookie(response, managerCookie(id), session);
    return response;
  } catch (error) {
    return failure(error);
  }
}

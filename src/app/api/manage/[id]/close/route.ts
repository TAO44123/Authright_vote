import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { failure, requireOrigin } from "@/lib/api";
import { findPoll, logAction, pollStatus, PollError } from "@/lib/polls";
import { managerFromRequest } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireOrigin(req);
    const { id } = await params;
    if (!managerFromRequest(req, id)) throw new PollError(403, "没有管理权限");
    getDb().transaction(() => {
      const poll = findPoll(id);
      if (!poll) throw new PollError(404, "投票不存在");
      if (pollStatus(poll) === "ended") throw new PollError(409, "投票已经结束");
      getDb().prepare("UPDATE polls SET closed_at = ? WHERE id = ?").run(Date.now(), id);
      logAction("manager", id, "close");
    }).immediate();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}

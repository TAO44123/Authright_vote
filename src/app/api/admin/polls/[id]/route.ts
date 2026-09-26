import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { failure, requireJson, requireOrigin } from "@/lib/api";
import { findPoll, getStats, getTrend, logAction, pollStatus, PollError, publicPoll } from "@/lib/polls";
import { adminFromRequest, hashToken, randomToken } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = adminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "请先登录管理员账号" }, { status: 401 });
  const { id } = await params;
  const poll = findPoll(id);
  if (!poll) return NextResponse.json({ error: "投票不存在" }, { status: 404 });
  const audit = getDb().prepare(`SELECT actor_kind AS actorKind, action, created_at AS createdAt
    FROM audit_logs WHERE poll_id = ? ORDER BY created_at DESC LIMIT 50`).all(id);
  return NextResponse.json({ poll: { ...publicPoll(poll), archivedAt: poll.archived_at },
    stats: getStats(id), trend: getTrend(id, poll.starts_at, poll.ends_at), audit },
  { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireOrigin(req);
    requireJson(req);
    const admin = adminFromRequest(req);
    if (!admin) throw new PollError(401, "请先登录管理员账号");
    const { id } = await params;
    const { action } = await req.json() as { action?: unknown };
    if (!["close", "archive", "unarchive", "rotate"].includes(String(action))) {
      throw new PollError(400, "操作无效");
    }
    let newToken: string | null = null;
    getDb().transaction(() => {
      const poll = findPoll(id);
      if (!poll) throw new PollError(404, "投票不存在");
      if (action === "close") {
        if (pollStatus(poll) === "ended") throw new PollError(409, "投票已经结束");
        getDb().prepare("UPDATE polls SET closed_at = ? WHERE id = ?").run(Date.now(), id);
      } else if (action === "archive") {
        if (pollStatus(poll) !== "ended") throw new PollError(409, "只能归档已结束的投票");
        if (poll.archived_at !== null) throw new PollError(409, "投票已归档");
        getDb().prepare("UPDATE polls SET archived_at = ? WHERE id = ?").run(Date.now(), id);
      } else if (action === "unarchive") {
        if (poll.archived_at === null) throw new PollError(409, "投票尚未归档");
        getDb().prepare("UPDATE polls SET archived_at = NULL WHERE id = ?").run(id);
      } else if (action === "rotate") {
        newToken = randomToken();
        getDb().prepare("UPDATE polls SET manager_hash = ?, manager_version = manager_version + 1 WHERE id = ?")
          .run(hashToken(newToken), id);
        getDb().prepare("DELETE FROM sessions WHERE kind = 'manager' AND poll_id = ?").run(id);
      }
      logAction("admin", id, String(action), admin.id);
    }).immediate();
    return NextResponse.json({ ok: true, token: newToken,
      origin: new URL(process.env.APP_ORIGIN || "http://127.0.0.1:3000").origin },
    { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}

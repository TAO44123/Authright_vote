import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { adminFromRequest } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!adminFromRequest(req)) return NextResponse.json({ error: "请先登录管理员账号" }, { status: 401 });
  const page = Math.max(1, Math.min(10000, Math.floor(Number(req.nextUrl.searchParams.get("page")) || 1)));
  const total = (getDb().prepare("SELECT COUNT(*) AS count FROM audit_logs").get() as { count: number }).count;
  const rows = getDb().prepare(`SELECT l.actor_kind AS actorKind, l.action, l.created_at AS createdAt,
    l.poll_id AS pollId, p.title FROM audit_logs l
    JOIN polls p ON p.id = l.poll_id ORDER BY l.created_at DESC LIMIT 50 OFFSET ?`).all((page - 1) * 50);
  return NextResponse.json({ items: rows, page, pages: Math.max(1, Math.ceil(total / 50)), total },
    { headers: { "Cache-Control": "private, no-store" } });
}

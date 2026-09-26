import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { adminFromRequest } from "@/lib/security";
import { PollRow, pollStatus } from "@/lib/polls";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = adminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "请先登录管理员账号" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  const status = req.nextUrl.searchParams.get("status") || "all";
  const archive = req.nextUrl.searchParams.get("archive") || "active";
  const page = Math.max(1, Math.min(10000, Number(req.nextUrl.searchParams.get("page")) || 1));
  const db = getDb();
  const where = ["1 = 1"];
  const args: (string | number)[] = [];
  if (q) {
    where.push("(p.title LIKE ? ESCAPE '\\' OR p.id LIKE ? ESCAPE '\\')");
    const escaped = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    args.push(escaped, escaped);
  }
  if (archive === "active") where.push("p.archived_at IS NULL");
  if (archive === "archived") where.push("p.archived_at IS NOT NULL");
  const now = Date.now();
  if (status === "upcoming") { where.push("p.closed_at IS NULL AND p.starts_at > ?"); args.push(now); }
  if (status === "live") { where.push("p.closed_at IS NULL AND p.starts_at <= ? AND p.ends_at > ?"); args.push(now, now); }
  if (status === "ended") { where.push("(p.closed_at IS NOT NULL OR p.ends_at <= ?)"); args.push(now); }
  const clause = where.join(" AND ");
  const total = (db.prepare(`SELECT COUNT(*) AS count FROM polls p WHERE ${clause}`).get(...args) as { count: number }).count;
  const polls = db.prepare(`SELECT p.*, COUNT(v.id) AS vote_count FROM polls p
    LEFT JOIN votes v ON v.poll_id = p.id WHERE ${clause}
    GROUP BY p.id ORDER BY p.created_at DESC LIMIT 20 OFFSET ?`)
    .all(...args, (page - 1) * 20) as (PollRow & { vote_count: number })[];
  const overview = db.prepare(`SELECT
      (SELECT COUNT(*) FROM polls) AS poll_count,
      (SELECT COUNT(*) FROM polls WHERE closed_at IS NULL AND starts_at <= ? AND ends_at > ?) AS live_count,
      (SELECT COUNT(*) FROM votes) AS vote_count`).get(now, now) as { poll_count: number; live_count: number; vote_count: number };
  return NextResponse.json({ admin: { username: admin.username }, overview,
    items: polls.map((poll) => ({ id: poll.id, title: poll.title, startsAt: poll.starts_at,
      endsAt: poll.ends_at, createdAt: poll.created_at, archivedAt: poll.archived_at,
      status: pollStatus(poll), votes: poll.vote_count })), total, page, pages: Math.max(1, Math.ceil(total / 20)) },
  { headers: { "Cache-Control": "private, no-store" } });
}

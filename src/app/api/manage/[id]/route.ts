import { NextRequest, NextResponse } from "next/server";
import { findPoll, getStats, getTrend, publicPoll } from "@/lib/polls";
import { managerFromRequest } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!managerFromRequest(req, id)) return NextResponse.json({ error: "没有管理权限" }, { status: 403 });
  const poll = findPoll(id);
  if (!poll) return NextResponse.json({ error: "投票不存在" }, { status: 404 });
  return NextResponse.json({ poll: publicPoll(poll), stats: getStats(id),
    trend: getTrend(id, poll.starts_at, poll.ends_at) },
  { headers: { "Cache-Control": "private, no-store" } });
}

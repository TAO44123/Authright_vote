import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { failure, requireJson, requireOrigin } from "@/lib/api";
import { PollError } from "@/lib/polls";
import { clientAddress, rateLimit } from "@/lib/rate";
import { ADMIN_COOKIE, createSession, setSessionCookie, verifyPassword } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    requireOrigin(req);
    requireJson(req);
    rateLimit(`admin-login:${clientAddress(req)}`, 10, 15 * 60 * 1000);
    const data = await req.json() as { username?: unknown; password?: unknown };
    if (typeof data.username !== "string" || typeof data.password !== "string") {
      throw new PollError(400, "请输入用户名和密码");
    }
    const admin = getDb().prepare("SELECT id, username, password_hash FROM admin_users WHERE username = ?")
      .get(data.username.trim()) as { id: string; username: string; password_hash: string } | undefined;
    if (!admin || !verifyPassword(data.password, admin.password_hash)) {
      throw new PollError(401, "用户名或密码错误");
    }
    const response = NextResponse.json({ ok: true, username: admin.username }, { headers: { "Cache-Control": "no-store" } });
    setSessionCookie(response, ADMIN_COOKIE, createSession("admin", admin.id));
    return response;
  } catch (error) {
    return failure(error);
  }
}

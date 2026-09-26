import { NextRequest, NextResponse } from "next/server";
import { failure, requireOrigin } from "@/lib/api";
import { ADMIN_COOKIE, revokeSession } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    requireOrigin(req);
    revokeSession(req.cookies.get(ADMIN_COOKIE)?.value);
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(ADMIN_COOKIE);
    return response;
  } catch (error) {
    return failure(error);
  }
}

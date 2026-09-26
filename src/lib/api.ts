import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PollError } from "@/lib/polls";
import { sameOrigin } from "@/lib/security";
import { ZodError } from "zod";

export function failure(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message || "输入内容无效" }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "请求内容无效" }, { status: 400 });
  }
  if (error instanceof PollError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "服务器暂时无法处理，请稍后重试" }, { status: 500 });
}

export function requireOrigin(req: NextRequest) {
  if (!sameOrigin(req)) throw new PollError(403, "请求来源无效");
}

export function requireJson(req: NextRequest) {
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    throw new PollError(415, "请求格式无效");
  }
}

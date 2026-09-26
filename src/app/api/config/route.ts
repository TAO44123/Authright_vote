import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const origin = new URL(process.env.APP_ORIGIN || "http://127.0.0.1:3000").origin;
  return NextResponse.json({ origin }, { headers: { "Cache-Control": "no-store" } });
}

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { findPoll } from "@/lib/polls";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!findPoll(id)) return NextResponse.json({ error: "投票不存在" }, { status: 404 });
  const origin = process.env.APP_ORIGIN || req.nextUrl.origin;
  const svg = await QRCode.toString(`${origin}/p/${id}`, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#1727AA", light: "#FFFDF7" },
  });
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}

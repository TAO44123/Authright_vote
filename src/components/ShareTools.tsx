"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { copyText, publicOrigin } from "@/lib/client";

export function ShareTools({ pollId }: { pollId: string }) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { publicOrigin().then(setOrigin).catch(() => setError("分享地址暂时无法生成，请刷新页面重试")); }, []);
  const url = origin ? `${origin}/p/${pollId}` : "";
  return <div className="share-strip">
    <div className="link-text" style={{ flexBasis: "100%", marginBottom: 0 }}>{url || error || "正在生成分享地址…"}</div>
    <button type="button" disabled={!url} onClick={async () => { try { await copyText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); setError("复制失败，请手动复制上方链接"); } }}>{copied ? "已复制" : "复制投票链接"}</button>
    <button type="button" onClick={() => setShowQr(!showQr)} aria-expanded={showQr}>{showQr ? "收起二维码" : "显示二维码"}</button>
    {showQr && <div style={{ flexBasis: "100%" }}><div className="qr-box"><Image src={`/api/polls/${pollId}/qr`} alt="投票链接二维码" width={180} height={180} unoptimized /></div></div>}
  </div>;
}

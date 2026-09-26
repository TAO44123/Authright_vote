"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, copyText, PollInfo, publicOrigin } from "@/lib/client";
import { ShareTools } from "@/components/ShareTools";

export default function CreatedPage() {
  const { id } = useParams<{ id: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [originError, setOriginError] = useState("");
  const [copied, setCopied] = useState("");
  const [poll, setPoll] = useState<PollInfo | null>(null);
  const [pollError, setPollError] = useState("");
  useEffect(() => {
    queueMicrotask(() => setToken(new URLSearchParams(location.hash.slice(1)).get("key") || ""));
    publicOrigin().then(setOrigin).catch(() => setOriginError("分享地址暂时无法生成，请刷新页面重试"));
  }, []);
  useEffect(() => {
    let cancelled = false;
    api<{ poll: PollInfo }>(`/api/polls/${id}`)
      .then(({ poll }) => { if (!cancelled) { setPoll(poll); setPollError(""); } })
      .catch(() => { if (!cancelled) setPollError("投票信息暂时无法加载，请刷新页面重试"); });
    return () => { cancelled = true; };
  }, [id]);
  const privateUrl = token && origin ? `${origin}/manage/${id}#key=${token}` : "";
  async function copy(value: string, name: string) { try { await copyText(value); setCopied(name); } catch { setCopied("复制失败，请手动复制"); } }
  return <div className="page-shell" style={{ maxWidth: 850 }}>
    <div className="page-head"><span className="eyebrow">PUBLISHED ✦</span><h1>投票已经发布！</h1><p>两条链接用途不同，请先保存自己的结果链接。</p></div>
    <div className="paper-panel">
      <div className="link-panel private"><h2>01 / 我的结果链接 · 私密</h2><p>只有持有这条链接的人能查看实时统计并管理本场投票。请先保存，不要发到投票群里。</p>
        {privateUrl ? <><div className="link-text">{privateUrl}</div><button className="button button-primary" type="button" onClick={() => copy(privateUrl, "private")}>{copied === "private" ? "已复制" : "复制我的结果链接"}</button></> : originError ? <div className="error-box">{originError}</div> : token === "" ? <div className="error-box">本页未找到私密令牌。若已丢失，请联系管理员人工核实。</div> : <p className="helper">正在生成管理链接…</p>}
      </div>
      <div className="link-panel"><h2>02 / 投票链接 · 分享给大家</h2><p>复制标题、简介和链接，邀请朋友匿名参与，提交后可查看当前结果。</p>
        {poll?.id === id ? <ShareTools key={id} pollId={id} title={poll.title} description={poll.description} defaultShowQr /> : <div className="link-text">{pollError || "正在生成分享内容…"}</div>}
      </div>
      {copied === "复制失败，请手动复制" && <p role="alert">{copied}</p>}
      <p className="helper">活动编号：{id}。编号用于管理员查找活动，不代替私密管理链接。</p>
      <div className="form-actions"><Link className="button button-secondary" href={`/p/${id}`}>查看投票页</Link>{privateUrl && <Link className="button button-primary" href={`/manage/${id}#key=${token}`}>查看我的结果</Link>}</div>
    </div>
  </div>;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { ResultBars } from "@/components/ResultBars";
import { api, copyText, formatDate, formatPollShare, message, PollInfo, postJson, publicOrigin, Stats } from "@/lib/client";

type Detail = { poll: PollInfo & { archivedAt: number | null }; stats: Stats;
  trend: { at: number; votes: number }[];
  audit: { actorKind: string; action: string; createdAt: number }[] };

const actionNames: Record<string, string> = { close: "提前结束", archive: "归档", unarchive: "取消归档", rotate: "重置管理链接" };

export default function AdminPollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareOrigin, setShareOrigin] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const shareLink = shareOrigin ? `${shareOrigin}/p/${id}` : "";
  const shareText = shareLink && data ? formatPollShare(data.poll, shareLink) : "";
  const load = useCallback(async () => {
    try { setData(await api<Detail>(`/api/admin/polls/${id}`)); setError(""); }
    catch (cause) { if (message(cause).includes("登录")) router.push("/admin/login"); else setError(message(cause)); }
  }, [id, router]);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  async function action(name: string) {
    const description = name === "rotate" ? "旧链接及旧发起者会话会立即失效。请在重置后保存并私下交付新链接。" :
      name === "close" ? "结束后不能重新开放，最终结果会公开。" : "此操作会写入管理记录。";
    if (!confirm(`确定${actionNames[name]}这场投票吗？${description}`)) return;
    setBusy(true); setError("");
    try {
      const response = await postJson<{ token: string | null; origin: string }>(`/api/admin/polls/${id}`, { action: name });
      if (response.token) setNewLink(`${response.origin}/manage/${id}#key=${response.token}`);
      await load();
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }

  async function showShareLink() {
    try { setShareOrigin(await publicOrigin()); setError(""); }
    catch (cause) { setError(message(cause)); }
  }

  return <div className="admin-shell">
    <div className="page-head"><span className="eyebrow">POLL DETAILS / {id.slice(0, 6).toUpperCase()}</span><h1>活动详情</h1><p>管理投票、统计和链接。</p></div><AdminNav />
    {error && <div className="error-box" role="alert">{error}</div>}
    {!data && !error && <div className="spinner" aria-label="正在加载" />}
    {data && <div className="paper-panel">
      <span className={`status-badge ${data.poll.status}`}>{data.poll.status === "live" ? "进行中" : data.poll.status === "upcoming" ? "未开始" : "已结束"}</span>
      {data.poll.archivedAt && <span className="status-badge ended" style={{ marginLeft: 8 }}>已归档</span>}
      <h2 style={{ fontSize: 32, margin: "16px 0 8px" }}>{data.poll.title}</h2>
      {data.poll.description && <p style={{ whiteSpace: "pre-wrap" }}>{data.poll.description}</p>}
      <p className="helper">编号：{id}<br />开始：{formatDate(data.poll.startsAt)}<br />截止：{formatDate(data.poll.endsAt)}</p>
      <div className="manage-grid"><div className="metric"><span>总票数</span><b>{data.stats.total}</b></div><div className="metric"><span>选项数</span><b>{data.poll.options.length}</b></div><div className="metric"><span>状态</span><b style={{ fontSize: 24, marginTop: 18 }}>{data.poll.status === "live" ? "进行中" : data.poll.status === "upcoming" ? "未开始" : "已结束"}</b></div></div>
      <ResultBars stats={data.stats} final={data.poll.status === "ended"} />
      <div className="manage-section"><h2>管理操作</h2><div className="form-actions">
        {data.poll.status !== "ended" && <button type="button" className="danger-button" disabled={busy} onClick={() => action("close")}>提前结束</button>}
        {data.poll.status === "ended" && <button type="button" className="button button-secondary" disabled={busy} onClick={() => action(data.poll.archivedAt ? "unarchive" : "archive")}>{data.poll.archivedAt ? "取消归档" : "归档活动"}</button>}
        <button type="button" className="button button-secondary" onClick={() => void showShareLink()}>获取投票分享链接</button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => action("rotate")}>重置管理链接</button>
      </div></div>
      {shareText && <div className="link-panel" role="status"><h2>投票分享内容</h2><p>将标题、简介和链接发给参与者；投票结束后仍可通过链接查看最终结果。</p><div className="link-text" style={{ whiteSpace: "pre-wrap" }}>{shareText}</div><button type="button" className="button button-primary" onClick={async () => { try { await copyText(shareText); setShareCopied(true); } catch { setError("复制失败，请手动复制上方分享内容"); } }}>{shareCopied ? "已复制" : "复制分享内容"}</button></div>}
      {newLink && <div className="link-panel private" role="status"><h2>新的结果管理链接</h2><p>请现在复制并私下交付。旧链接已经失效；离开此页后不会再显示这条链接。</p><div className="link-text">{newLink}</div><button type="button" className="button button-primary" onClick={async () => { await copyText(newLink); setCopied(true); }}>{copied ? "已复制" : "复制新链接"}</button></div>}
      <div className="manage-section"><h2>最近操作</h2><div className="audit-list">{data.audit.length ? data.audit.map((entry, index) => <div className="audit-row" key={`${entry.createdAt}-${index}`}><span>{actionNames[entry.action] || entry.action} · {entry.actorKind === "admin" ? "管理员" : "发起者"}</span><span>{formatDate(entry.createdAt)}</span></div>) : <p className="helper">暂无管理操作。</p>}</div></div>
    </div>}
  </div>;
}

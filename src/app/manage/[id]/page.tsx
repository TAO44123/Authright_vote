"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, formatDate, message, PollInfo, postJson, Stats } from "@/lib/client";
import { ResultBars } from "@/components/ResultBars";
import { ShareTools } from "@/components/ShareTools";

type ManageData = { poll: PollInfo; stats: Stats; trend: { at: number; votes: number }[] };

export default function ManagePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ManageData | null>(null);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const load = useCallback(() => api<ManageData>(`/api/manage/${id}`).then(setData), [id]);

  useEffect(() => {
    async function initialize() {
      try {
        const token = new URLSearchParams(location.hash.slice(1)).get("key");
        if (token) {
          await postJson(`/api/manage/${id}/exchange`, { token });
          history.replaceState(null, "", `/manage/${id}`);
        }
        await load();
      } catch (cause) { setError(message(cause)); }
    }
    initialize();
    const timer = setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 5000);
    const onVisible = () => { if (!document.hidden) load().catch(() => {}); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [id, load]);

  async function close() {
    if (!confirm("确定提前结束这场投票吗？结束后将不能继续投票，结果会公开。")) return;
    setClosing(true); setError("");
    try { await postJson(`/api/manage/${id}/close`, {}); await load(); }
    catch (cause) { setError(message(cause)); }
    finally { setClosing(false); }
  }

  if (!data) return <div className="page-shell">{error ? <div className="error-box" role="alert">{error}。请检查私密链接是否完整，或联系管理员。</div> : <div className="spinner" aria-label="正在加载" />}</div>;
  const { poll, stats, trend } = data;
  const max = Math.max(1, ...trend.map((item) => item.votes));
  return <div className="page-shell">
    <div className="page-head"><span className="eyebrow">MY POLL / {id.slice(0, 6).toUpperCase()}</span><h1>我的投票结果</h1><p>这条页面只对持有私密管理链接的人开放。</p></div>
    <div className="paper-panel"><span className={`status-badge ${poll.status}`}>{poll.status === "live" ? "正在进行" : poll.status === "upcoming" ? "未开始" : "已结束"}</span><h2 style={{ fontSize: 30, letterSpacing: "-.05em", margin: "16px 0 7px" }}>{poll.title}</h2><p className="helper">开始：{formatDate(poll.startsAt)}　截止：{formatDate(poll.endsAt)}</p>
      <div className="manage-grid"><div className="metric"><span>总票数</span><b>{stats.total}</b></div><div className="metric"><span>选项数量</span><b>{poll.options.length}</b></div><div className="metric"><span>当前状态</span><b style={{ fontSize: 24, marginTop: 18 }}>{poll.status === "live" ? "进行中" : poll.status === "upcoming" ? "未开始" : "已结束"}</b></div></div>
      <div className="manage-section"><ResultBars stats={stats} final={poll.status === "ended"} /></div>
      <div className="manage-section"><h2>投票趋势</h2>{trend.length ? <><div className="trend" role="img" aria-label={`最近 ${trend.length} 个时段的投票趋势`}>
        {trend.map((item) => <div className="trend-bar" key={item.at} style={{ height: `${Math.max(7, item.votes / max * 100)}%` }} title={`${formatDate(item.at)}：${item.votes} 票`} />)}
      </div><p className="trend-caption">每柱表示一个时间段收到的票数；把鼠标停在柱上可查看时间。</p></> : <p className="helper">目前还没有投票记录。</p>}</div>
      <div className="manage-section"><h2>分享给大家</h2><p className="helper">公开投票链接可以分享；请保存创建时获得的私密管理链接。</p><ShareTools pollId={id} /></div>
      {error && <div className="error-box" role="alert">{error}</div>}
      {poll.status !== "ended" && <div className="manage-section" style={{ borderTop: "2px solid var(--ink)", paddingTop: 23 }}><h2>管理活动</h2><button type="button" className="danger-button" disabled={closing} onClick={close}>{closing ? "正在结束…" : "提前结束投票"}</button><p className="helper">结束后无法重新开放，最终结果会对所有访问者公开。</p></div>}
    </div>
  </div>;
}

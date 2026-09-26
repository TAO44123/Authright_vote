"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, formatCountdown, formatDate, message, PollInfo, postJson, Stats } from "@/lib/client";
import { ResultBars } from "@/components/ResultBars";
import { ShareTools } from "@/components/ShareTools";

type PublicData = { poll: PollInfo; ownOptionId: string | null; stats: Stats | null };

export default function PollPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PublicData | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    const value = await api<PublicData>(`/api/polls/${id}`);
    setData(value);
    setUpdatedAt(Date.now());
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => { setNow(Date.now()); load().catch((cause) => setError(message(cause))); });
    const countdown = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 5000);
    const onVisible = () => { if (!document.hidden) load().catch(() => {}); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(countdown); clearInterval(refresh); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  async function submit() {
    if (!selected || loading) return;
    setLoading(true); setError("");
    try {
      await postJson(`/api/polls/${id}/vote`, { optionId: selected });
      await load();
    } catch (cause) { setError(message(cause)); await load().catch(() => {}); }
    finally { setLoading(false); }
  }

  if (!data) return <div className="poll-layout">{error ? <div className="error-box" role="alert">{error}</div> : <div className="spinner" aria-label="正在加载" />}</div>;
  const { poll, ownOptionId, stats } = data;
  const status = poll.closedAt || now >= poll.endsAt ? "ended" : now < poll.startsAt ? "upcoming" : "live";
  const showResults = status === "ended" || Boolean(ownOptionId);
  return <div className="poll-layout">
    <article className="poll-card">
      <div className="poll-top"><strong>一票之间 / VOTE</strong><span className="issue">NO. {id.slice(0, 6).toUpperCase()}</span></div>
      <div className="poll-status"><span className="eyebrow">{status === "live" ? "本 周 热 议 ✦" : status === "upcoming" ? "即 将 开 始 ✦" : "最 终 票 数 ✦"}</span></div>
      {status === "ended" && <div className="poll-ended-stamp" role="status">已结束</div>}
      <h1 className="poll-title">{poll.title}</h1>
      {poll.description && <p className="poll-description">{poll.description}</p>}
      <div className="poll-meta"><span>匿名投票 / 单选</span><span>{status === "live" ? <>倒计时 <strong>{formatCountdown(poll.endsAt - now)}</strong></> : status === "upcoming" ? <>开始于 <strong>{formatDate(poll.startsAt)}</strong></> : <>截止于 <strong>{formatDate(poll.closedAt || poll.endsAt)}</strong></>}</span></div>
      {status === "upcoming" && <div className="notice">活动尚未开始，届时再来投出你的一票。</div>}
      {status === "live" && !ownOptionId && <>
        <div className="choice-list" role="group" aria-label="请选择一个选项">
          {poll.options.map((option, index) => <button type="button" className={`choice ${selected === option.id ? "selected" : ""}`} aria-pressed={selected === option.id} key={option.id} onClick={() => setSelected(option.id)}>
            <span className="choice-dot" aria-hidden="true">{selected === option.id ? "✓" : ""}</span><span className="choice-label">{option.label}</span><span className="choice-num">{String(index + 1).padStart(2, "0")}</span>
          </button>)}
        </div>
        {error && <div className="error-box" role="alert">{error}</div>}
        <button type="button" className="button button-primary vote-submit" disabled={!selected || loading} onClick={submit}>{loading ? "提交中…" : "就选这个！"}</button>
        <p className="poll-fineprint">匿名参与 · 提交后不能改票</p>
      </>}
      {showResults && stats && <><div aria-live="polite">{ownOptionId && <div className="success-box">✓ 已收到你的一票。{status === "ended" ? "下面是最终结果。" : "下面是当前结果。"}</div>}</div><ResultBars stats={stats} ownOptionId={ownOptionId} final={status === "ended"} />{updatedAt && status === "live" && <p className="helper">最近更新：{new Date(updatedAt).toLocaleTimeString("zh-CN")}</p>}</>}
      {status === "ended" && !stats && <p className="helper">正在读取最终结果…</p>}
    </article>
    <ShareTools pollId={id} title={poll.title} description={poll.description} />
  </div>;
}

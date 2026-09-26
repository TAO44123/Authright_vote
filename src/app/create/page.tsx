"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { message, postJson, randomUuid } from "@/lib/client";

function toLocalInput(timestamp: number) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(timestamp - offset).toISOString().slice(0, 16);
}

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [scheduled, setScheduled] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [timezone, setTimezone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef<{ createKey: string; managerToken: string; fingerprint: string } | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setStartsAt(toLocalInput(Date.now() + 60 * 60 * 1000));
      setEndsAt(toLocalInput(Date.now() + 24 * 60 * 60 * 1000));
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    });
  }, []);

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((item, position) => position === index ? value : item));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (loading) return;
    if (!title.trim()) return setError("请填写投票标题");
    if (description.trim().length > 80) return setError("补充说明最多 80 字");
    if (options.length < 2 || options.some((value) => !value.trim())) return setError("请填写至少两个选项");
    const start = scheduled ? new Date(startsAt).getTime() : Date.now();
    const end = new Date(endsAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= Date.now()) {
      return setError("请设置晚于开始时间的截止时间");
    }
    const fingerprint = JSON.stringify({ title: title.trim(), description: description.trim(),
      options: options.map((value) => value.trim()), scheduled, startsAt: scheduled ? startsAt : null, endsAt });
    if (!attempt.current || attempt.current.fingerprint !== fingerprint) {
      attempt.current = { createKey: randomUuid(), managerToken: generateToken(), fingerprint };
    }
    setLoading(true);
    try {
      const result = await postJson<{ id: string }>("/api/polls", {
        title: title.trim(), description: description.trim(), options: options.map((value) => value.trim()),
        startsAt: start, endsAt: end,
        createKey: attempt.current.createKey, managerToken: attempt.current.managerToken,
      });
      router.push(`/created/${result.id}#key=${attempt.current.managerToken}`);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  }

  return <div className="page-shell">
    <div className="page-head"><span className="eyebrow">CREATE A POLL ✦</span><h1>发起一场投票</h1><p>写下问题，邀请大家一起做决定。</p></div>
    <form className="paper-panel" onSubmit={submit}>
      <div className="form-grid">
        <section className="form-section"><h2>01 / 你的问题</h2>
          <div className="field"><label htmlFor="poll-title">投票标题 *</label><input id="poll-title" maxLength={100} required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：周五聚餐，吃什么？" /></div>
          <div className="field"><label htmlFor="poll-description">补充说明（最多 80 字）</label><textarea id="poll-description" maxLength={80} aria-describedby="poll-description-count" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="给大家一点背景信息，也可以留空。" /><p id="poll-description-count" className="helper">{description.length} / 80 字</p></div>
        </section>
        <section className="form-section"><h2>02 / 可以选择什么？</h2>
          {options.map((option, index) => <div className="option-entry" key={index}>
            <span className="option-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <input aria-label={`选项 ${index + 1}`} maxLength={100} value={option} onChange={(e) => updateOption(index, e.target.value)} placeholder={`选项 ${index + 1}`} required />
            {options.length > 2 && <button className="small-action" type="button" onClick={() => setOptions((current) => current.filter((_, position) => position !== index))} aria-label={`删除选项 ${index + 1}`}>删除</button>}
          </div>)}
          {options.length < 8 && <button type="button" className="button button-secondary add-option-button" onClick={() => setOptions((current) => [...current, ""])}>＋ 添加选项</button>}
          <p className="helper option-helper">单选投票，支持 2–8 个选项。提交选票后不能修改。</p>
        </section>
        <section className="form-section"><h2>03 / 活动时间</h2>
          <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 17 }}><input type="checkbox" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} /> 预约开始时间</label>
          <div className="inline-fields">
            {scheduled && <div className="field"><label htmlFor="starts-at">开始时间</label><input id="starts-at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required /></div>}
            <div className="field"><label htmlFor="ends-at">截止时间 *</label><input id="ends-at" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required /></div>
          </div><p className="helper">当前时区：{timezone}。到期后自动停止投票。</p>
        </section>
      </div>
      <div className="notice">发布后会生成两条链接：投票链接分享给大家；“我的结果链接”由你自己保存，可随时查看统计。</div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="form-actions"><button type="submit" className="button button-primary" disabled={loading}>{loading ? "正在发布…" : "发布投票"}</button><span className="helper">发布后标题、选项和时间将锁定</span></div>
    </form>
  </div>;
}

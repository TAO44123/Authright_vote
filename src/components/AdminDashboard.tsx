"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { api, formatDate, message } from "@/lib/client";

type ListData = {
  admin: { username: string };
  overview: { poll_count: number; live_count: number; vote_count: number };
  items: { id: string; title: string; startsAt: number; endsAt: number; status: "upcoming" | "live" | "ended"; archivedAt: number | null; votes: number }[];
  total: number; page: number; pages: number;
};

export function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<ListData | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [archive, setArchive] = useState("active");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const params = new URLSearchParams({ q: search, status, archive, page: String(page) });
    try { setData(await api<ListData>(`/api/admin/polls?${params}`)); setError(""); }
    catch (cause) { if (message(cause).includes("登录")) router.push("/admin/login"); else setError(message(cause)); }
  }, [search, status, archive, page, router]);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  return <div className="admin-shell">
    <div className="page-head"><span className="eyebrow">CONTROL ROOM ✦</span><h1>全部投票</h1><p>查看活动状态、票数和历史记录。</p></div>
    <AdminNav />
    {!data && !error && <div className="spinner" aria-label="正在加载" />}
    {error && <div className="error-box" role="alert">{error}</div>}
    {data && <>
      <p className="helper">管理员：{data.admin.username}</p>
      <div className="manage-grid"><div className="metric"><span>累计活动</span><b>{data.overview.poll_count}</b></div><div className="metric"><span>进行中</span><b>{data.overview.live_count}</b></div><div className="metric"><span>累计票数</span><b>{data.overview.vote_count}</b></div></div>
      <form className="admin-filter" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(query); }}>
        <label>搜索标题或编号<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入关键词" /></label>
        <label>状态<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">全部状态</option><option value="upcoming">未开始</option><option value="live">进行中</option><option value="ended">已结束</option></select></label>
        <label>归档<select value={archive} onChange={(event) => { setArchive(event.target.value); setPage(1); }}><option value="active">未归档</option><option value="all">全部记录</option><option value="archived">已归档</option></select></label>
        <button className="button button-primary" type="submit" style={{ minHeight: 43, padding: "8px 15px" }}>搜索</button>
      </form>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>投票</th><th>状态</th><th>票数</th><th>截止时间</th><th>记录</th></tr></thead><tbody>
        {data.items.map((item) => <tr key={item.id}><td><Link href={`/admin/polls/${item.id}`}>{item.title}</Link><div className="helper">{item.id}</div></td><td><span className={`status-badge ${item.status}`}>{item.status === "live" ? "进行中" : item.status === "upcoming" ? "未开始" : "已结束"}</span></td><td>{item.votes}</td><td>{formatDate(item.endsAt)}</td><td>{item.archivedAt ? "已归档" : "正常"}</td></tr>)}
        {data.items.length === 0 && <tr><td colSpan={5}>暂无符合条件的投票。</td></tr>}
      </tbody></table></div>
      <div className="pagination"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>← 上一页</button><span>第 {data.page} / {data.pages} 页 · 共 {data.total} 场</span><button type="button" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>下一页 →</button></div>
    </>}
  </div>;
}

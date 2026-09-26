"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { api, formatDate, message } from "@/lib/client";

type Item = { actorKind: string; action: string; createdAt: number; pollId: string; title: string };
const actionNames: Record<string, string> = { close: "提前结束", archive: "归档", unarchive: "取消归档", rotate: "重置管理链接" };

export default function AuditPage() {
  const router = useRouter();
  const [data, setData] = useState<{ items: Item[]; page: number; pages: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => { api<{ items: Item[]; page: number; pages: number; total: number }>(`/api/admin/audit?page=${page}`).then(setData).catch((cause) => {
    if (message(cause).includes("登录")) router.push("/admin/login"); else setError(message(cause));
  }); }, [page, router]);
  return <div className="admin-shell"><div className="page-head"><span className="eyebrow">AUDIT LOG</span><h1>操作记录</h1><p>查看全部管理操作，按时间从新到旧排列。</p></div><AdminNav />
    {error && <div className="error-box" role="alert">{error}</div>}
    {!data && !error && <div className="spinner" aria-label="正在加载" />}
    {data && <><div className="table-wrap"><table className="data-table"><thead><tr><th>时间</th><th>活动</th><th>操作</th><th>执行者</th></tr></thead><tbody>
      {data.items.map((entry, index) => <tr key={`${entry.createdAt}-${index}`}><td>{formatDate(entry.createdAt)}</td><td><Link href={`/admin/polls/${entry.pollId}`}>{entry.title}</Link><div className="helper">{entry.pollId}</div></td><td>{actionNames[entry.action] || entry.action}</td><td>{entry.actorKind === "admin" ? "管理员" : "发起者"}</td></tr>)}
      {data.items.length === 0 && <tr><td colSpan={4}>暂无操作记录。</td></tr>}
    </tbody></table></div><div className="pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>← 上一页</button><span>第 {data.page} / {data.pages} 页 · 共 {data.total} 条</span><button disabled={page >= data.pages} onClick={() => setPage(page + 1)}>下一页 →</button></div></>}
  </div>;
}

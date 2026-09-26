"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

export function AdminNav() {
  const path = usePathname();
  const router = useRouter();
  return <nav className="admin-nav" aria-label="管理员导航">
    <Link className={path === "/admin" || path.startsWith("/admin/polls") ? "current" : ""} href="/admin">全部投票</Link>
    <Link className={path === "/admin/audit" ? "current" : ""} href="/admin/audit">操作记录</Link>
    <button type="button" onClick={async () => { try { await postJson("/api/admin/logout", {}); } finally { router.push("/admin/login"); } }}>退出登录</button>
  </nav>;
}

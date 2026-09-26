"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { message, postJson } from "@/lib/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await postJson("/api/admin/login", { username, password }); router.push("/admin"); }
    catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  return <div className="page-shell" style={{ maxWidth: 650 }}>
    <div className="page-head"><span className="eyebrow">ADMIN ACCESS</span><h1>管理员登录</h1><p>查看所有投票、历史记录和管理操作。</p></div>
    <form className="paper-panel" onSubmit={login}>
      <div className="field"><label htmlFor="admin-username">用户名</label><input id="admin-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></div>
      <div className="field"><label htmlFor="admin-password">密码</label><input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="button button-primary" disabled={busy} type="submit">{busy ? "登录中…" : "进入后台"}</button>
    </form>
  </div>;
}

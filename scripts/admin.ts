import { randomUUID } from "node:crypto";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import { getDb, migrateDb } from "../src/lib/db";
import { hashPassword } from "../src/lib/security";

async function passwordPrompt(label: string) {
  if (!process.stdin.isTTY) throw new Error("管理员维护命令需要在交互终端运行");
  process.stdout.write(label);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  const value = await new Promise<string>((resolve, reject) => {
    let buffer = "";
    function onKey(_char: string, key: { name?: string; ctrl?: boolean }) {
      if (key.ctrl && key.name === "c") {
        process.stdin.off("keypress", onKey);
        process.stdout.write("\n");
        reject(new Error("已取消"));
      } else if (key.name === "return" || key.name === "enter" || _char === "\n" || _char === "\r") {
        process.stdin.off("keypress", onKey);
        process.stdout.write("\n");
        resolve(buffer);
      } else if (key.name === "backspace") {
        buffer = buffer.slice(0, -1);
      } else if (_char && !key.ctrl) {
        buffer += _char;
      }
    }
    process.stdin.on("keypress", onKey);
  }).finally(() => { process.stdin.setRawMode(false); process.stdin.pause(); });
  return value;
}

const mode = process.argv[2];
if (mode !== "init" && mode !== "reset") throw new Error("仅支持 init 或 reset");
migrateDb();
const db = getDb();
const count = (db.prepare("SELECT COUNT(*) AS count FROM admin_users").get() as { count: number }).count;
if (mode === "init" && count > 0) throw new Error("管理员已存在，请使用重置密码命令");
if (mode === "reset" && count === 0) throw new Error("管理员不存在，请先初始化");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const username = mode === "init" ? (await rl.question("管理员用户名：")).trim() : "";
rl.close();
if (mode === "init" && !/^[a-zA-Z0-9_-]{3,32}$/.test(username)) throw new Error("用户名需为 3–32 位英文字母、数字、下划线或连字符");
const password = await passwordPrompt("管理员密码（至少 12 位，输入隐藏）：");
if (password.length < 12) throw new Error("密码至少需要 12 位");
const confirmed = await passwordPrompt("再次输入密码：");
if (password !== confirmed) throw new Error("两次输入的密码不一致");
const now = Date.now();
db.transaction(() => {
  if (mode === "init") {
    db.prepare("INSERT INTO admin_users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), username, hashPassword(password), now, now);
  } else {
    const admin = db.prepare("SELECT id FROM admin_users LIMIT 1").get() as { id: string };
    db.prepare("UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?")
      .run(hashPassword(password), now, admin.id);
    db.prepare("DELETE FROM sessions WHERE kind = 'admin'").run();
  }
}).immediate();
console.log(mode === "init" ? "管理员创建完成。" : "管理员密码已重置，旧登录会话已撤销。");

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { getDb } from "../src/lib/db";

const dir = resolve(process.env.BACKUP_DIR || "./backups");
mkdirSync(dir, { recursive: true });
const name = `voting-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`;
const path = resolve(dir, name);
await getDb().backup(path);
const copy = new Database(path, { readonly: true });
const result = copy.pragma("integrity_check", { simple: true });
copy.close();
if (result !== "ok") throw new Error(`备份完整性检查失败: ${result}`);
console.log(`备份完成且通过完整性检查：${path}`);

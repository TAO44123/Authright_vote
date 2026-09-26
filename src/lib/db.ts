import Database from "better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

let connection: Database.Database | undefined;

export function databasePath() {
  const configured = process.env.SQLITE_PATH || "./data/voting.sqlite";
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

export function getDb(): Database.Database {
  if (connection) return connection;
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });
  connection = new Database(path);
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
  connection.pragma("busy_timeout = 5000");
  return connection;
}

export function migrateDb() {
  const db = getDb();
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)");
  const migrationDir = join(process.cwd(), "db", "migrations");
  const names = readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort();
  const applied = new Set(
    (db.prepare("SELECT name FROM schema_migrations").all() as { name: string }[]).map((row) => row.name),
  );
  for (const name of names) {
    if (applied.has(name)) continue;
    const sql = readFileSync(join(migrationDir, name), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(name, Date.now());
    }).immediate();
  }
  return names.length;
}

import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { hashToken, randomToken, voterHash } from "@/lib/security";
import type { z } from "zod";
import type { createPollSchema } from "@/lib/validation";

export type PollRow = {
  id: string;
  title: string;
  description: string;
  starts_at: number;
  ends_at: number;
  closed_at: number | null;
  archived_at: number | null;
  manager_hash: string;
  manager_version: number;
  created_at: number;
};

export type OptionRow = { id: string; poll_id: string; label: string; position: number };

export class PollError extends Error {
  constructor(public status: number, message: string, public code = "POLL_ERROR") { super(message); }
}

export function findPoll(id: string) {
  return getDb().prepare("SELECT * FROM polls WHERE id = ?").get(id) as PollRow | undefined;
}

export function optionsFor(id: string) {
  return getDb().prepare("SELECT id, poll_id, label, position FROM poll_options WHERE poll_id = ? ORDER BY position")
    .all(id) as OptionRow[];
}

export function pollStatus(poll: PollRow, now = Date.now()) {
  if (poll.closed_at !== null || now >= poll.ends_at) return "ended" as const;
  if (now < poll.starts_at) return "upcoming" as const;
  return "live" as const;
}

export function publicPoll(poll: PollRow) {
  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    startsAt: poll.starts_at,
    endsAt: poll.ends_at,
    closedAt: poll.closed_at,
    status: pollStatus(poll),
    options: optionsFor(poll.id).map(({ id, label, position }) => ({ id, label, position })),
  };
}

export function createPoll(data: z.infer<typeof createPollSchema>) {
  const db = getDb();
  return db.transaction(() => {
    const existing = db.prepare("SELECT id, manager_hash FROM polls WHERE create_key = ?")
      .get(data.createKey) as { id: string; manager_hash: string } | undefined;
    if (existing) {
      if (existing.manager_hash !== hashToken(data.managerToken)) throw new PollError(409, "创建标识已使用");
      return existing.id;
    }
    const id = randomToken(9);
    const now = Date.now();
    db.prepare(`INSERT INTO polls
      (id, title, description, starts_at, ends_at, manager_hash, create_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, data.title, data.description, data.startsAt, data.endsAt,
        hashToken(data.managerToken), data.createKey, now);
    const insertOption = db.prepare("INSERT INTO poll_options (id, poll_id, label, position) VALUES (?, ?, ?, ?)");
    data.options.forEach((label, position) => insertOption.run(randomUUID(), id, label, position));
    return id;
  }).immediate();
}

export function getVote(pollId: string, voterId: string) {
  return getDb().prepare("SELECT option_id FROM votes WHERE poll_id = ? AND voter_hash = ?")
    .get(pollId, voterHash(pollId, voterId)) as { option_id: string } | undefined;
}

export function castVote(pollId: string, optionId: string, voterId: string) {
  const db = getDb();
  return db.transaction(() => {
    const poll = findPoll(pollId);
    if (!poll) throw new PollError(404, "投票不存在");
    const prior = getVote(pollId, voterId);
    if (prior) {
      if (prior.option_id !== optionId) throw new PollError(409, "你已投票，无法修改", "ALREADY_VOTED");
      return { optionId, duplicate: true };
    }
    if (pollStatus(poll) !== "live") throw new PollError(409, "当前不在投票时间内", "NOT_LIVE");
    const option = db.prepare("SELECT id FROM poll_options WHERE poll_id = ? AND id = ?")
      .get(pollId, optionId);
    if (!option) throw new PollError(400, "选项无效");
    db.prepare("INSERT INTO votes (id, poll_id, option_id, voter_hash, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), pollId, optionId, voterHash(pollId, voterId), Date.now());
    return { optionId, duplicate: false };
  }).immediate();
}

export function getStats(pollId: string) {
  const db = getDb();
  const rows = db.prepare(`SELECT o.id, o.label, o.position, COUNT(v.id) AS votes
    FROM poll_options o LEFT JOIN votes v ON v.poll_id = o.poll_id AND v.option_id = o.id
    WHERE o.poll_id = ? GROUP BY o.id ORDER BY o.position`).all(pollId) as
    { id: string; label: string; position: number; votes: number }[];
  const total = rows.reduce((sum, row) => sum + row.votes, 0);
  return {
    total,
    options: rows.map((row) => ({ ...row, percent: total ? Math.round(row.votes / total * 100) : 0 })),
  };
}

export function getTrend(pollId: string, startsAt: number, endsAt: number) {
  const duration = endsAt - startsAt;
  const interval = duration <= 24 * 60 * 60 * 1000 ? 60 * 60 * 1000 :
    duration <= 7 * 24 * 60 * 60 * 1000 ? 6 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const rows = getDb().prepare(`SELECT CAST((created_at - ?) / ? AS INTEGER) AS bucket, COUNT(*) AS votes
    FROM votes WHERE poll_id = ? GROUP BY bucket ORDER BY bucket`)
    .all(startsAt, interval, pollId) as { bucket: number; votes: number }[];
  return rows.map((row) => ({ at: startsAt + row.bucket * interval, votes: row.votes }));
}

export function logAction(actorKind: "admin" | "manager", pollId: string, action: string, adminId?: string) {
  getDb().prepare("INSERT INTO audit_logs (id, actor_kind, admin_id, poll_id, action, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(randomUUID(), actorKind, adminId ?? null, pollId, action, Date.now());
}

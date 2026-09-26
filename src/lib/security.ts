import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const ADMIN_COOKIE = "ypzj_admin";
export const VOTER_COOKIE = "ypzj_voter";

function secret(name: "VOTER_SECRET") {
  const value = process.env[name];
  if (!value || value.length < 32 || value.startsWith("replace-with-")) {
    throw new Error(`${name} 必须设为至少 32 个字符的随机值`);
  }
  return value;
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function signature(value: string) {
  return createHmac("sha256", secret("VOTER_SECRET")).update(value).digest("base64url");
}

function constantTimeEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function getVoter(req: NextRequest) {
  const raw = req.cookies.get(VOTER_COOKIE)?.value;
  if (raw) {
    const [id, sign, extra] = raw.split(".");
    if (!extra && id && sign && id.length >= 30 && constantTimeEquals(sign, signature(id))) {
      return { id, fresh: false };
    }
  }
  return { id: randomToken(), fresh: true };
}

export function setVoterCookie(response: NextResponse, id: string) {
  response.cookies.set(VOTER_COOKIE, `${id}.${signature(id)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function voterHash(pollId: string, voterId: string) {
  return createHmac("sha256", secret("VOTER_SECRET"))
    .update(pollId).update(":").update(voterId).digest("hex");
}

export function managerCookie(pollId: string) {
  return `ypzj_mgr_${pollId}`;
}

export function createSession(kind: "admin" | "manager", adminId?: string, pollId?: string, managerVersion?: number) {
  const token = randomToken();
  const now = Date.now();
  const maxAge = kind === "admin" ? 60 * 60 * 12 : 60 * 60 * 24 * 30;
  getDb().prepare(`INSERT INTO sessions
    (token_hash, kind, admin_id, poll_id, manager_version, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(hashToken(token), kind, adminId ?? null, pollId ?? null, managerVersion ?? null, now + maxAge * 1000, now);
  return { token, maxAge };
}

export function setSessionCookie(response: NextResponse, name: string, session: { token: string; maxAge: number }) {
  response.cookies.set(name, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session.maxAge,
  });
}

export function adminFromRequest(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return getDb().prepare(`SELECT a.id, a.username FROM sessions s
    JOIN admin_users a ON a.id = s.admin_id
    WHERE s.token_hash = ? AND s.kind = 'admin' AND s.expires_at > ?`)
    .get(hashToken(token), Date.now()) as { id: string; username: string } | undefined ?? null;
}

export function managerFromRequest(req: NextRequest, pollId: string) {
  if (adminFromRequest(req)) return true;
  const token = req.cookies.get(managerCookie(pollId))?.value;
  if (!token) return false;
  const row = getDb().prepare(`SELECT s.token_hash FROM sessions s
    JOIN polls p ON p.id = s.poll_id
    WHERE s.token_hash = ? AND s.kind = 'manager' AND s.poll_id = ?
      AND s.manager_version = p.manager_version AND s.expires_at > ?`)
    .get(hashToken(token), pollId, Date.now());
  return Boolean(row);
}

export function revokeSession(token: string | undefined) {
  if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  return constantTimeEquals(actual.toString("hex"), hash);
}

export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const expected = new URL(process.env.APP_ORIGIN || "http://127.0.0.1:3000");
  if (origin === expected.origin) return true;
  if (process.env.NODE_ENV !== "development" || expected.protocol !== "http:") return false;
  try {
    const local = new URL(origin);
    return local.protocol === "http:" && local.port === expected.port &&
      (local.hostname === "127.0.0.1" || local.hostname === "localhost");
  } catch {
    return false;
  }
}

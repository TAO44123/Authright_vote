import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { NextRequest } from "next/server";

const dir = mkdtempSync(join(tmpdir(), "authright-voting-test-"));
process.env.SQLITE_PATH = join(dir, "test.sqlite");
process.env.APP_ORIGIN = "http://localhost:3000";
process.env.SESSION_SECRET = "a".repeat(64);
process.env.VOTER_SECRET = "b".repeat(64);

const { migrateDb, getDb } = await import("../src/lib/db");
const { createPoll, castVote, getStats, PollError } = await import("../src/lib/polls");
const { getVoter, createSession, managerCookie, managerFromRequest, hashPassword, verifyPassword, sameOrigin } = await import("../src/lib/security");
const { GET: getPublicPoll } = await import("../src/app/api/polls/[id]/route");
const { GET: getConfig } = await import("../src/app/api/config/route");
const { randomUuid } = await import("../src/lib/client");

migrateDb();

function sample(overrides: Partial<Parameters<typeof createPoll>[0]> = {}) {
  const now = Date.now();
  return {
    title: "周五聚餐，吃什么？",
    description: "测试活动",
    options: ["日式烧鸟", "川味火锅", "意式披萨"],
    startsAt: now - 60_000,
    endsAt: now + 3_600_000,
    managerToken: "t".repeat(43),
    createKey: randomUUID(),
    ...overrides,
  };
}

test("同一创建请求重试不会生成第二场活动", () => {
  const input = sample();
  const first = createPoll(input);
  const second = createPoll(input);
  assert.equal(first, second);
  const count = getDb().prepare("SELECT COUNT(*) AS count FROM polls WHERE create_key = ?").get(input.createKey) as { count: number };
  assert.equal(count.count, 1);
});

test("同一匿名身份只计一票，换选项会被拒绝", () => {
  const id = createPoll(sample());
  const options = getDb().prepare("SELECT id FROM poll_options WHERE poll_id = ? ORDER BY position").all(id) as { id: string }[];
  const first = castVote(id, options[0].id, "voter-a");
  const retry = castVote(id, options[0].id, "voter-a");
  assert.equal(first.duplicate, false);
  assert.equal(retry.duplicate, true);
  assert.throws(() => castVote(id, options[1].id, "voter-a"), (error: unknown) => error instanceof PollError && error.code === "ALREADY_VOTED");
  castVote(id, options[1].id, "voter-b");
  assert.equal(getStats(id).total, 2);
  assert.deepEqual(getStats(id).options.map((item) => item.votes), [1, 1, 0]);
});

test("未开始、已截止和已关闭的活动都拒绝新选票", () => {
  const now = Date.now();
  for (const input of [
    sample({ startsAt: now + 60_000, endsAt: now + 120_000 }),
    sample({ startsAt: now - 120_000, endsAt: now - 60_000 }),
  ]) {
    const id = createPoll(input);
    const option = getDb().prepare("SELECT id FROM poll_options WHERE poll_id = ? LIMIT 1").get(id) as { id: string };
    assert.throws(() => castVote(id, option.id, randomUUID()), (error: unknown) => error instanceof PollError && error.code === "NOT_LIVE");
  }
  const id = createPoll(sample());
  getDb().prepare("UPDATE polls SET closed_at = ? WHERE id = ?").run(Date.now(), id);
  const option = getDb().prepare("SELECT id FROM poll_options WHERE poll_id = ? LIMIT 1").get(id) as { id: string };
  assert.throws(() => castVote(id, option.id, "late-voter"), (error: unknown) => error instanceof PollError && error.code === "NOT_LIVE");
});

test("进行中未投票者拿不到票数，投票后才能看到", async () => {
  const id = createPoll(sample());
  const url = `http://localhost:3000/api/polls/${id}`;
  const first = await getPublicPoll(new NextRequest(url), { params: Promise.resolve({ id }) });
  const firstBody = await first.json();
  assert.equal(firstBody.stats, null);
  const cookie = first.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const voter = getVoter(new NextRequest(url, { headers: { cookie } }));
  const optionId = firstBody.poll.options[0].id as string;
  castVote(id, optionId, voter.id);
  const second = await getPublicPoll(new NextRequest(url, { headers: { cookie } }), { params: Promise.resolve({ id }) });
  const secondBody = await second.json();
  assert.equal(secondBody.ownOptionId, optionId);
  assert.equal(secondBody.stats.total, 1);
  const stranger = await getPublicPoll(new NextRequest(url), { params: Promise.resolve({ id }) });
  assert.equal((await stranger.json()).stats, null);
});

test("重置管理链接后旧会话失效，管理员密码校验正常", () => {
  const id = createPoll(sample());
  const session = createSession("manager", undefined, id, 1);
  const request = new NextRequest(`http://localhost:3000/manage/${id}`, { headers: { cookie: `${managerCookie(id)}=${session.token}` } });
  assert.equal(managerFromRequest(request, id), true);
  getDb().prepare("UPDATE polls SET manager_version = 2 WHERE id = ?").run(id);
  assert.equal(managerFromRequest(request, id), false);
  const encoded = hashPassword("a-long-test-password");
  assert.equal(verifyPassword("a-long-test-password", encoded), true);
  assert.equal(verifyPassword("wrong-password", encoded), false);
});

test("局域网地址用于分享，且局域网与本机开发页面可提交请求", async () => {
  const previousOrigin = process.env.APP_ORIGIN;
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    process.env.APP_ORIGIN = "http://192.168.1.164:3000";
    Object.assign(process.env, { NODE_ENV: "development" });
    assert.deepEqual(await (await getConfig()).json(), { origin: "http://192.168.1.164:3000" });
    for (const origin of ["http://192.168.1.164:3000", "http://127.0.0.1:3000", "http://localhost:3000"]) {
      assert.equal(sameOrigin(new NextRequest("http://192.168.1.164:3000/api/polls", { headers: { origin } })), true);
    }
    assert.equal(sameOrigin(new NextRequest("http://192.168.1.164:3000/api/polls", { headers: { origin: "http://example.com" } })), false);
    assert.equal(sameOrigin(new NextRequest("http://192.168.1.164:3000/api/polls", { headers: { origin: "http://localhost:3001" } })), false);
  } finally {
    if (previousOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previousOrigin;
    if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previousNodeEnv });
  }
});

test("局域网 HTTP 页面可生成符合格式的创建请求编号", () => {
  assert.match(randomUuid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

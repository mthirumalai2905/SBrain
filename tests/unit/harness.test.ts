import assert from "node:assert/strict";
import { test } from "node:test";
import { createSeed } from "../../lib/seed";
import { canEdit, canRecordPublication, canReview, canUseAgent } from "../../lib/rbac";
import { createArticle, findDuplicate, transitionArticle } from "../../lib/workflow";
import { applyPlan } from "../../lib/harness/apply";
import { assertAudit, auditEvent } from "../../lib/harness/log";
import { redact } from "../../lib/harness/redact";
import { RetryableError, withRetry } from "../../lib/harness/retry";
import { parsePlan } from "../../lib/groq";
import type { PublicUser } from "../../lib/types";

const owner: PublicUser = { id: "usr_owner", name: "Owner", email: "owner@brain.local", role: "owner" };
const editor: PublicUser = { id: "usr_editor", name: "Editor", email: "editor@brain.local", role: "editor" };
const viewer: PublicUser = { id: "usr_viewer", name: "Viewer", email: "viewer@brain.local", role: "viewer" };

test("redacts secrets in the shared log schema", () => {
  const event = assertAudit(
    auditEvent({
      timestamp: "2026-11-04T00:00:00.000Z",
      run_id: "run_1",
      actor: "agent",
      site: "synx",
      tool: "echo",
      input: "key gsk_exampleSecretValue",
      result: "Bearer abc.def",
      status: "ok",
      duration_ms: 12,
      retry_count: 0,
      approval_id: null,
      error: "token=super-secret",
    }),
  );
  assert.equal(event.input.includes("gsk_"), false);
  assert.equal(event.result.includes("Bearer abc"), false);
  assert.equal(event.error?.includes("super-secret"), false);
});

test("retries only retryable failures", async () => {
  let calls = 0;
  const value = await withRetry(async () => {
    calls += 1;
    if (calls < 3) throw new RetryableError("again");
    return "ok";
  }, 3, async () => undefined);
  assert.equal(value, "ok");
  assert.equal(calls, 3);
  await assert.rejects(() => withRetry(async () => { throw new Error("nope"); }, 3, async () => undefined));
});

test("role gates match the control centre", () => {
  assert.equal(canUseAgent("viewer"), false);
  assert.equal(canEdit("editor"), true);
  assert.equal(canEdit("reviewer"), false);
  assert.equal(canReview("reviewer"), true);
  assert.equal(canRecordPublication("editor"), false);
  assert.equal(canRecordPublication("owner"), true);
});

test("status changes follow the publishing states and block duplicates", () => {
  const db = createSeed();
  const created = createArticle(db, {
    siteId: "realtimeweb",
    title: "Evening note",
    body: "A note.",
    section: "/blog",
    author: "Editor",
    documentUrl: "",
    source: "manual",
    actor: editor,
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.article.status, "review_required");
  const skipped = transitionArticle(db, created.article.id, "published", owner, "Too soon.", "https://realtimeweb.org/blog/evening-note");
  assert.equal(skipped.ok, false);
  const approved = transitionArticle(db, created.article.id, "approved", owner, "Approved.");
  assert.equal(approved.ok, true);
  const duplicate = createArticle(db, {
    siteId: "realtimeweb",
    title: "Evening note",
    body: "Again.",
    section: "/blog",
    author: "Editor",
    documentUrl: "",
    source: "manual",
    actor: editor,
  });
  assert.equal(duplicate.ok, true);
  if (!duplicate.ok) return;
  assert.equal(duplicate.article.status, "failed");
  assert.ok(findDuplicate(db, "realtimeweb", "Evening note", "evening-note"));
});

test("destructive publish is blocked and a dry run does not write", () => {
  const db = createSeed();
  const before = db.articles.length;
  const blocked = applyPlan(db, "Publish the evening note", owner, null, {
    reply: "",
    dryRun: false,
    tools: [{ name: "publish", input: { site: "synx" } }],
  });
  assert.match(blocked.reply, /blocked/i);
  assert.equal(blocked.steps[0]?.ok, false);
  const preview = applyPlan(db, "dry run draft", editor, null, {
    reply: "",
    dryRun: true,
    tools: [{ name: "create_article", input: { site: "skalle", title: "Lab note" } }],
  });
  assert.match(preview.reply, /Would run create_article/);
  assert.equal(db.articles.length, before);
});

test("a viewer cannot draft through the harness", () => {
  const db = createSeed();
  const result = applyPlan(db, "Draft something", viewer, null, {
    reply: "",
    dryRun: false,
    tools: [{ name: "create_article", input: { site: "synx", title: "Nope" } }],
  });
  assert.match(result.reply, /cannot/i);
  assert.equal(db.articles.some((article) => article.title === "Nope"), false);
});

test("parses a model tool plan", () => {
  const plan = parsePlan('```json\n{"reply":"Checking.","tools":[{"name":"list_articles","input":{"waiting":"true"}}]}\n```', "What is waiting?");
  assert.equal(plan?.tools[0]?.name, "list_articles");
  assert.equal(plan?.tools[0]?.input?.waiting, "true");
  assert.equal(parsePlan("not json", "hello"), null);
});

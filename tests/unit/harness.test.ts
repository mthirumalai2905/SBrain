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
import { assertSealedPush, isCodePush, isRepoQuestion, namedSiteIds, stageCodePush } from "../../lib/prompt-stage";
import { answerRepoQuestion } from "../../lib/repo-read";
import { executeAgent } from "../../lib/agent";
import { openPullWithApi } from "../../lib/github";
import { documentBrief } from "../../lib/change";
import {
  GITHUB_APP_ID,
  GITHUB_APP_INSTALLATION_ID,
  githubCredentialsReady,
  githubPrivateKey,
  githubRepoSlug,
} from "../../lib/github-credentials";
import { prepareCodePush, raisePullRequest, repoForSite, type PreparedPull } from "../../lib/pull-request";
import { findArticleFile, patchEndingQuestion } from "../../lib/repo-edit";
import { carriedTask, classifyTask } from "../../lib/turn";
import { codeArticleChange } from "../../lib/code-agent";
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
  assert.equal(redact("token ghs_exampleInstallationToken").includes("ghs_"), false);
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

test("a code push seals one site design and rejects a mixed brief", () => {
  const db = createSeed();
  const synx = db.sites.find((site) => site.id === "synx");
  const realtimeweb = db.sites.find((site) => site.id === "realtimeweb");
  assert.ok(synx && realtimeweb);
  const sealed = stageCodePush(db, "Push an article to Synx titled \"Signal\".", editor);
  assert.equal(sealed.ok, true);
  if (!sealed.ok || !synx || !realtimeweb) return;
  assert.equal(sealed.value.siteId, "synx");
  assert.equal(sealed.value.intent, "article");
  assert.deepEqual(sealed.value.allowedPaths, ["/news"]);
  assert.equal(sealed.value.prompt.includes(synx.formatting.trim()), true);
  assert.equal(sealed.value.prompt.includes(realtimeweb.formatting.trim()), false);
  assert.equal(assertSealedPush(sealed.value, "Push an article to Synx titled \"Signal\".").ok, true);
  assert.equal(assertSealedPush(sealed.value, "Push an article to Skalle.").ok, false);
  const mixed = stageCodePush(db, "Revamp the article on Synx and Skalle.", editor);
  assert.equal(mixed.ok, false);
  const morph = stageCodePush(db, "Push an article to Morph Space.", editor);
  assert.equal(morph.ok, false);
  const held = executeAgent(db, "Commit a content change on Real Time Web.", viewer, null, {
    reply: "Pushing now.",
    dryRun: false,
    tools: [{ name: "publish", input: { site: "realtimeweb" } }],
  });
  assert.equal(held.steps[0]?.tool, "prompt_stage");
  assert.equal(held.steps[0]?.ok, false);
  assert.equal(held.steps.some((step) => step.tool === "publish"), false);
});

test("a sealed file change opens one pull request and does not merge", async () => {
  const db = createSeed();
  const approval = "| 2026-11-09 | owner | GitHub | Open one pull request on the repository for the site named in the brief. Do not merge. Do not deploy. | Approved |";
  const brief = ['Push an article to Synx titled "Signal".', "file: content/news/signal.md", "```md", "# Signal", "```"].join("\n");
  const env = {
    GITHUB_APP_ID: "1",
    GITHUB_APP_INSTALLATION_ID: "2",
    GITHUB_APP_PRIVATE_KEY_PATH: "D:\\unused.pem",
    GITHUB_REPO_SYNX: "acme/synx",
  };
  const blocked = prepareCodePush(db, brief, editor, { approvalText: "# Approvals\n", env, keyReady: true });
  let calls = 0;
  const skipped = await raisePullRequest(blocked, {
    async open() {
      calls += 1;
      return { url: "https://github.com/acme/synx/pull/1", number: 1 };
    },
  });
  assert.equal(skipped.ok, false);
  assert.equal(calls, 0);
  const locked = prepareCodePush(db, `${brief}\nfile: package-lock.json\n\`\`\`\n{}\n\`\`\``, editor, { approvalText: approval, env, keyReady: true });
  assert.equal(locked.pull, null);
  const plan = prepareCodePush(db, brief, editor, { approvalText: approval, env, keyReady: true });
  assert.ok(plan.pull);
  const opened = await raisePullRequest(plan, {
    async open(pull: PreparedPull) {
      calls += 1;
      assert.equal(pull.owner, "acme");
      assert.equal(pull.files[0]?.path, "content/news/signal.md");
      assert.equal(pull.files[0]?.content.includes("# Signal"), true);
      return { url: "https://github.com/acme/synx/pull/7", number: 7 };
    },
  });
  assert.equal(opened.ok, true);
  if (!opened.ok) return;
  assert.equal(opened.url, "https://github.com/acme/synx/pull/7");
  assert.equal(calls, 1);

  const seen: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    seen.push(`${init?.method ?? "GET"} ${url}`);
    const payload = url.endsWith("/acme/synx")
      ? { default_branch: "main" }
      : url.includes("/git/ref/")
        ? { object: { sha: "parent" } }
        : url.includes("/git/commits/parent")
          ? { tree: { sha: "tree" } }
          : url.endsWith("/git/blobs")
            ? { sha: "blob" }
            : url.endsWith("/git/trees")
              ? { sha: "nexttree" }
              : url.endsWith("/git/commits")
                ? { sha: "commit" }
                : url.endsWith("/git/refs")
                  ? {}
                  : url.endsWith("/pulls")
                    ? { html_url: "https://github.com/acme/synx/pull/9", number: 9 }
                    : {};
    return new Response(JSON.stringify(payload), { status: 200 });
  };
  const api = await openPullWithApi(
    {
      siteId: "synx",
      intent: "article",
      owner: "acme",
      repo: "synx",
      branch: "brain/abc12345",
      title: "Signal",
      body: "Brief",
      section: "/news",
      files: [{ path: "content/news/signal.md", content: "# Signal" }],
      approvalId: "apr_github_pr",
    },
    "ghs_testtokenvalue",
    fetchImpl,
  );
  assert.equal(api.number, 9);
  assert.equal(seen.some((call) => call.includes("/merge")), false);
  assert.equal(seen.some((call) => call.startsWith("POST") && call.endsWith("/pulls")), true);
});

test("a document follows the chosen intent and opens one pull request", async () => {
  const db = createSeed();
  const approval = "| 2026-11-09 | owner | GitHub | Open one pull request on the repository for the site named in the brief. Do not merge. Do not deploy. | Approved |";
  const env = {
    GITHUB_APP_ID: "1",
    GITHUB_APP_INSTALLATION_ID: "2",
    GITHUB_APP_PRIVATE_KEY_PATH: "D:\\unused.pem",
    GITHUB_REPO_SYNX: "acme/synx",
    GITHUB_REPO_SKALLE: "acme/skalle",
  };
  const body = "A note about content and a revamp on Skalle.";
  const brief = documentBrief({ title: "Signal", body, documentUrl: "https://docs.google.com/document/d/example" });
  const plan = prepareCodePush(db, brief, editor, {
    approvalText: approval,
    env,
    keyReady: true,
    siteId: "synx",
    intentId: "article",
    document: { title: "Signal", body },
  });
  assert.equal(plan.pull?.siteId, "synx");
  assert.equal(plan.pull?.intent, "article");
  assert.equal(plan.pull?.files[0]?.path, "news/signal.md");
  assert.equal(plan.pull?.section, "/news");
  const opened = await raisePullRequest(plan, {
    async open(pull) {
      assert.equal(pull.files[0]?.content.includes("# Signal"), true);
      return { url: "https://github.com/acme/synx/pull/4", number: 4 };
    },
  });
  assert.equal(opened.ok, true);
  const copy = prepareCodePush(db, brief, editor, {
    approvalText: approval,
    env,
    keyReady: true,
    siteId: "synx",
    intentId: "content",
    document: { title: "Signal", body: "A note." },
  });
  assert.equal(copy.pull, null);
  const morph = prepareCodePush(db, brief, editor, {
    approvalText: approval,
    env,
    keyReady: true,
    siteId: "morph",
    intentId: "article",
    document: { title: "Signal", body: "A note." },
  });
  assert.equal(morph.promptOk, false);
  assert.equal(morph.pull, null);
  const chronicle = prepareCodePush(db, brief, editor, {
    approvalText: approval,
    env,
    keyReady: true,
    siteId: "skalle",
    intentId: "article",
    document: { title: "Signal", body: "A note.", section: "/chronicles" },
  });
  assert.equal(chronicle.pull?.files[0]?.path, "chronicles/signal.md");
  assert.equal(chronicle.pull?.section, "/chronicles");
  const wrong = prepareCodePush(db, brief, editor, {
    approvalText: approval,
    env,
    keyReady: true,
    siteId: "skalle",
    intentId: "article",
    document: { title: "Signal", body: "A note.", section: "/system" },
  });
  assert.equal(wrong.promptOk, true);
  assert.equal(wrong.pull, null);
  const unknown = prepareCodePush(db, brief, editor, {
    approvalText: approval,
    env,
    keyReady: true,
    siteId: "synx",
    intentId: "launch",
    document: { title: "Signal", body: "A note." },
  });
  assert.equal(unknown.promptOk, false);
});

test("a question about a repository is answered instead of asking for an intent", async () => {
  const { generateKeyPairSync } = await import("node:crypto");
  const pem = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs1", format: "pem" }).toString();
  const asked = "okayso canu tell me waht was teh latest commit to the repo of synx";
  assert.equal(isRepoQuestion(asked), true);
  assert.equal(isCodePush(asked), false);
  assert.equal(isCodePush('Push an article to Synx titled "Signal".'), true);
  const db = createSeed();
  const missing = await answerRepoQuestion(db, asked, { env: {} });
  assert.equal(missing.reply.includes("Name one intent"), false);
  assert.match(missing.reply, /not configured/i);
  const named = await answerRepoQuestion(db, "what is the latest commit on skalleaLP", {
    env: { GITHUB_REPO_SKALLE: "Synx-tools/skalleaLP" },
  });
  assert.equal(named.siteId, "skalle");
  assert.match(named.reply, /Synx-tools\/skalleaLP/);
  assert.equal(namedSiteIds("canu tell me what the latest commit to snxLP is about")[0], "synx");
  assert.equal(namedSiteIds("what is the latest commit on skalleaiLP")[0], "skalle");
  const bodies: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (typeof init?.body === "string") bodies.push(init.body);
    if (url.includes("/access_tokens")) return Response.json({ token: "ghs_testtokenvalue" });
    return Response.json([
      {
        sha: "abc1234deadbeef",
        html_url: "https://github.com/acme/synx/commit/abc1234deadbeef",
        commit: { message: "Raise the signal\n\nmore", author: { name: "Ada", date: "2026-11-09T10:00:00Z" } },
      },
    ]);
  };
  const answer = await answerRepoQuestion(db, asked, {
    env: {
      GITHUB_APP_ID: "1",
      GITHUB_APP_INSTALLATION_ID: "2",
      GITHUB_APP_PRIVATE_KEY_PATH: "D:\\unused.pem",
      GITHUB_REPO_SYNX: "acme/synx",
    },
    fetchImpl,
    pem,
  });
  assert.equal(answer.ok, true);
  assert.match(answer.reply, /Raise the signal/);
  assert.match(answer.reply, /abc1234/);
  assert.equal(answer.reply.includes("ghs_"), false);
  assert.match(bodies[0] ?? "", /"contents":"read"/);
  assert.equal((bodies[0] ?? "").includes("write"), false);
});

test("a follow-up continues the open request and an invented title is refused", () => {
  const db = createSeed();
  const revamp = "can u do a simple revamp i want small name change in the article of fried or foe the choice is still ours so at the end in the title we dont have a question mark and i belvie we need to have one so do that and riase a PR in the synx repo";
  const sealed = stageCodePush(db, revamp, editor);
  assert.equal(sealed.ok, true);
  if (sealed.ok) {
    assert.equal(sealed.value.siteId, "synx");
    assert.equal(sealed.value.intent, "revamp");
  }
  const write = carriedTask(undefined, "so i want u to write an article about how ai is taking jobs and then make a push or a raise PR to the repository");
  assert.equal(classifyTask(write.task).need, "site");
  const picked = carriedTask(
    { instruction: write.instruction, reply: "Name one website: Synx, Real Time Web, Morph Space, or Skalle AI.", task: write.task },
    "synx",
  );
  const article = classifyTask(picked.task);
  assert.equal(article.kind, "write");
  assert.equal(article.siteId, "synx");
  assert.equal(article.pull, true);
  assert.match(article.topic, /how ai is taking jobs/i);
  const listed = carriedTask(
    { instruction: "list articles", reply: "Name one website: Synx, Real Time Web, Morph Space, or Skalle AI.", task: "list articles" },
    "synx",
  );
  const list = classifyTask(listed.task);
  assert.equal(list.kind, "list");
  assert.equal(list.siteId, "synx");
  const before = db.articles.length;
  const invented = applyPlan(db, "can u write an article for synx", editor, null, {
    reply: "Drafted.",
    dryRun: false,
    tools: [{ name: "create_article", input: { site: "synx", title: "Synx Update: New Features and Insights" } }],
  });
  assert.match(invented.reply, /what should the article be about/i);
  assert.equal(db.articles.length, before);
  const bare = classifyTask("can u write an article for synx");
  assert.equal(bare.kind, "write");
  assert.equal(bare.need, "topic");
  assert.equal(bare.siteId, "synx");
  const spoken = "canu write an article for synx website regarding how ai is a good freidn to man kind and then riase a PR";
  assert.equal(isRepoQuestion(spoken), false);
  assert.equal(isCodePush(spoken), true);
  const requested = classifyTask(spoken);
  assert.equal(requested.kind, "write");
  assert.equal(requested.siteId, "synx");
  assert.equal(requested.pull, true);
  assert.equal(requested.need, "");
  assert.match(requested.topic, /good freidn to man kind/i);
});

test("a title question mark is added to the matching repository file", async () => {
  const source = 'title: "Friend or foe? The choice is still ours",\n';
  const other = '{ type: "h2", text: "The choice is still ours" }\n';
  const patched = patchEndingQuestion(source, "fried or foe the choice is still ours");
  assert.equal(patched.ok, true);
  if (!patched.ok) return;
  assert.match(patched.content, /The choice is still ours\?/);
  const { generateKeyPairSync } = await import("node:crypto");
  const pem = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs1", format: "pem" }).toString();
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/access_tokens")) return Response.json({ token: "ghs_testtokenvalue" });
    if (url.includes("/git/trees/")) {
      return Response.json({
        tree: [
          { path: "src/lib/posts.ts", type: "blob" },
          { path: "src/lib/friendArticle.ts", type: "blob" },
          { path: "public/img/news-friend-hero.jpg", type: "blob" },
        ],
      });
    }
    if (url.endsWith("/contents/src/lib/posts.ts")) return Response.json({ content: Buffer.from(source).toString("base64") });
    if (url.endsWith("/contents/src/lib/friendArticle.ts")) return Response.json({ content: Buffer.from(other).toString("base64") });
    return Response.json({ message: "missing" }, { status: 404 });
  };
  const found = await findArticleFile(
    { GITHUB_APP_ID: "1", GITHUB_APP_INSTALLATION_ID: "2", GITHUB_APP_PRIVATE_KEY_PATH: "D:\\unused.pem" },
    "Synx-tools",
    "Synx",
    "fried or foe the choice is still ours",
    fetchImpl,
    pem,
  );
  assert.equal(found.ok, true);
  if (!found.ok) return;
  assert.equal(found.path, "src/lib/posts.ts");
  const approval = "| 2026-11-09 | owner | GitHub | Open one pull request on the repository for the site named in the brief. Do not merge. Do not deploy. | Approved |";
  const db = createSeed();
  const plan = prepareCodePush(db, "Revamp the article of fried or foe on Synx and add a question mark.", editor, {
    approvalText: approval,
    env: { GITHUB_APP_ID: "1", GITHUB_APP_INSTALLATION_ID: "2", GITHUB_APP_PRIVATE_KEY_PATH: "D:\\unused.pem", GITHUB_REPO_SYNX: "acme/synx" },
    keyReady: true,
    siteId: "synx",
    intentId: "revamp",
    title: "Question mark on the title",
    files: [{ path: found.path, content: patched.content }],
  });
  assert.equal(plan.pull?.files[0]?.path, "src/lib/posts.ts");
  const secret = prepareCodePush(db, "Revamp Synx.", editor, {
    approvalText: approval,
    env: { GITHUB_APP_ID: "1", GITHUB_APP_INSTALLATION_ID: "2", GITHUB_APP_PRIVATE_KEY_PATH: "D:\\unused.pem", GITHUB_REPO_SYNX: "acme/synx" },
    keyReady: true,
    siteId: "synx",
    intentId: "revamp",
    files: [{ path: ".env.local", content: "SECRET=1" }],
  });
  assert.equal(secret.pull, null);
});

test("an article pull request edits the website code instead of adding markdown", () => {
  const posts = 'export const posts: Post[] = [\n  {\n    slug: "friend-or-foe",\n  },\n];\n';
  const page = [
    'import { raisingBlocks, RAISING_SLUG, type ArticleBlock } from "@/lib/raisingArticle";',
    "const essays: Record<string, ArticleBlock[]> = {",
    "  [RAISING_SLUG]: raisingBlocks,",
    "};",
    "",
  ].join("\n");
  const design = "News articles use /news/{slug}.";
  const coded = codeArticleChange({
    siteId: "synx",
    title: "How AI is a good friend",
    body: "How AI is a good friend\n\nAI can sit beside people and help them choose.\n\nThis draft stays with the subject you named. It does not add names, numbers, or events that were not in the request.",
    design,
    sources: { "src/lib/posts.ts": posts, "src/app/news/[slug]/page.tsx": page },
    now: new Date("2026-11-09T00:00:00Z"),
  });
  assert.equal(coded.ok, true);
  if (!coded.ok) return;
  assert.equal(coded.files.some((file) => file.path.endsWith(".md")), false);
  const module = coded.files.find((file) => file.path.endsWith("Article.ts"));
  const registry = coded.files.find((file) => file.path === "src/lib/posts.ts");
  const route = coded.files.find((file) => file.path.endsWith("page.tsx"));
  assert.match(module?.content ?? "", /AI can sit beside people/);
  assert.equal((module?.content ?? "").includes("This draft stays with the subject"), false);
  assert.match(module?.content ?? "", /Site prompt: News articles use/);
  assert.match(registry?.content ?? "", /how-ai-is-a-good-friend/);
  assert.match(route?.content ?? "", /HOW_AI_IS_A_GOOD_FRIEND_SLUG/);
  const duplicate = codeArticleChange({
    siteId: "synx",
    title: "Friend or foe",
    body: "Already there.",
    design,
    sources: { "src/lib/posts.ts": posts, "src/app/news/[slug]/page.tsx": page },
  });
  assert.equal(duplicate.ok, false);
  const journal = codeArticleChange({
    siteId: "realtimeweb",
    title: "Evening note",
    body: "The lamp is still on.",
    design: "Posts use /blog/{slug}.",
    sources: { "lib/blog.ts": 'export const posts: BlogPost[] = [\n];\n' },
  });
  assert.equal(journal.ok, true);
  if (journal.ok) assert.equal(journal.files[0]?.path, "lib/blog.ts");
  const morph = codeArticleChange({ siteId: "morph", title: "Note", body: "A note.", design: "", sources: {} });
  assert.equal(morph.ok, false);
});

test("github credentials stay out of a partial environment", () => {
  assert.equal(GITHUB_APP_ID, "5678168");
  assert.equal(GITHUB_APP_INSTALLATION_ID, "180136178");
  assert.equal(githubPrivateKey({}).includes("PRIVATE KEY"), false);
  assert.equal(githubCredentialsReady({ GITHUB_APP_ID: "1", GITHUB_APP_INSTALLATION_ID: "2", GITHUB_APP_PRIVATE_KEY_PATH: "D:\\unused.pem" }), false);
  const inline = "-----BEGIN RSA PRIVATE KEY-----\nMII\n-----END RSA PRIVATE KEY-----\n";
  assert.equal(githubCredentialsReady({ GITHUB_APP_ID: "1", GITHUB_APP_INSTALLATION_ID: "2", GITHUB_APP_PRIVATE_KEY: inline }), true);
  assert.equal(githubPrivateKey(process.env).includes("PRIVATE KEY"), true);
  assert.equal(repoForSite("synx", {}), null);
  assert.equal(githubRepoSlug("morph", process.env), process.env.GITHUB_REPO_MORPH?.trim() || "Synx-tools/morph-space");
});

test("parses a model tool plan", () => {
  const plan = parsePlan('```json\n{"reply":"Checking.","tools":[{"name":"list_articles","input":{"waiting":"true"}}]}\n```', "What is waiting?");
  assert.equal(plan?.tools[0]?.name, "list_articles");
  assert.equal(plan?.tools[0]?.input?.waiting, "true");
  assert.equal(parsePlan("not json", "hello"), null);
});

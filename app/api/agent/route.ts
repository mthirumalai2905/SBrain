import { executeAgent, instructionNeedsProbe, recordAgentRun } from "@/lib/agent";
import { articleCodeFiles } from "@/lib/code-publish";
import { getSession } from "@/lib/auth";
import { noteChange, runChange, storeOpenedChange } from "@/lib/change";
import { githubHost } from "@/lib/github";
import { draftFromTopic, planInstruction } from "@/lib/groq";
import { probeSites } from "@/lib/health";
import { prepareCodePush, repoForSite, type CodePushPlan } from "@/lib/pull-request";
import { canOperate, canUseAgent } from "@/lib/rbac";
import { findArticleFile, patchEndingQuestion } from "@/lib/repo-edit";
import { answerRepoQuestion } from "@/lib/repo-read";
import { mutate, readDb } from "@/lib/store";
import { articleCopy, carriedTask, classifyTask, listArticles, needReply, type Turn } from "@/lib/turn";
import type { PublicUser } from "@/lib/types";
import { createArticle, siteById } from "@/lib/workflow";

function publishingSection(siteId: string) {
  const site = siteById(readDb(), siteId);
  return site?.sections.find((section) => section.kind === "news" || section.kind === "journal")?.path ?? "";
}

async function finishPull(instruction: string, task: string, user: PublicUser, prepared: CodePushPlan) {
  const started = Date.now();
  const result = await runChange(prepared, prepared.pull ? githubHost() : null);
  const site = (result.ok ? result.pull.siteId : result.pull?.siteId) ?? "";
  const approvalId = (result.ok ? result.pull.approvalId : result.pull?.approvalId) ?? null;
  return mutate((db) => {
    noteChange(db, {
      site,
      status: result.status,
      result: result.ok ? result.url : result.error,
      error: result.ok ? null : result.error,
      approvalId,
      started,
      actor: "agent",
      kind: "agent",
    });
    if (!result.ok) {
      return recordAgentRun(
        db,
        instruction,
        user,
        result.error,
        [
          { id: crypto.randomUUID(), tool: "prompt_stage", summary: result.promptOk ? "Prompt sealed for one site." : result.error, ok: result.promptOk },
          { id: crypto.randomUUID(), tool: "open_pull_request", summary: result.error, ok: false },
        ].filter((step, index) => result.promptOk || index === 0),
        task,
      );
    }
    const saved = storeOpenedChange(db, user, { pull: result.pull, url: result.url, source: "agent" });
    return recordAgentRun(
      db,
      instruction,
      user,
      saved.message,
      [
        { id: crypto.randomUUID(), tool: "prompt_stage", summary: "Prompt sealed for one site.", ok: true },
        { id: crypto.randomUUID(), tool: "open_pull_request", summary: result.url, ok: true },
      ],
      task,
    );
  });
}

async function retitle(turn: Turn, user: PublicUser) {
  const repo = repoForSite(turn.siteId);
  if (!repo) {
    return { reply: "That website's repository is not configured, so I can't change the title.", pull: null as CodePushPlan | null };
  }
  let found: Awaited<ReturnType<typeof findArticleFile>>;
  try {
    found = await findArticleFile(process.env, repo.owner, repo.name, turn.articleName);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub did not return the article.";
    return { reply: `I couldn't read ${repo.owner}/${repo.name}. ${message}`, pull: null };
  }
  if (!found.ok) return { reply: found.error, pull: null };
  const patched = patchEndingQuestion(found.content, turn.articleName);
  if (!patched.ok) return { reply: patched.error, pull: null };
  const prepared = prepareCodePush(readDb(), turn.task, user, {
    siteId: turn.siteId,
    intentId: turn.intentId || "content",
    title: `Question mark on ${patched.title}`,
    files: [{ path: found.path, content: patched.content }],
  });
  return { reply: prepared.error, pull: prepared };
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!canUseAgent(user.role)) return Response.json({ error: "You have read-only access." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { instruction?: string } | null;
  const typed = body?.instruction?.trim() ?? "";
  if (!typed) return Response.json({ error: "Write an instruction first." }, { status: 400 });
  if (typed.length > 100_000) return Response.json({ error: "That instruction is too long." }, { status: 400 });

  const snapshot = readDb();
  const previous = snapshot.runs.find((run) => run.actorId === user.id);
  const carried = carriedTask(previous, typed);
  const turn = classifyTask(carried.task);
  if (carried.task.length > 100_000) return Response.json({ error: "That instruction is too long." }, { status: 400 });

  const ask = async (reply: string) => {
    const run = await mutate((db) =>
      recordAgentRun(db, carried.instruction, user, reply, [{ id: crypto.randomUUID(), tool: "prompt_stage", summary: reply, ok: false }], carried.task),
    );
    return Response.json({ run });
  };

  if (turn.need) return ask(needReply(turn.need));

  if (turn.kind === "repo") {
    const answer = await answerRepoQuestion(snapshot, carried.task);
    const run = await mutate((db) =>
      recordAgentRun(db, carried.instruction, user, answer.reply, [{ id: crypto.randomUUID(), tool: "read_repo", summary: answer.reply, ok: answer.ok }], carried.task),
    );
    return Response.json({ run });
  }

  if (turn.kind === "list") {
    const reply = listArticles(snapshot, turn.siteId);
    const run = await mutate((db) =>
      recordAgentRun(db, carried.instruction, user, reply, [{ id: crypto.randomUUID(), tool: "list_articles", summary: reply, ok: true }], carried.task),
    );
    return Response.json({ run });
  }

  if (turn.kind === "write") {
    const drafted = await draftFromTopic(turn.topic);
    const copy = articleCopy(turn.topic, drafted);
    if (turn.pull) {
      const site = siteById(snapshot, turn.siteId);
      const coded = await articleCodeFiles(process.env, {
        siteId: turn.siteId,
        title: copy.title,
        body: copy.body,
        design: site?.formatting ?? "",
        section: publishingSection(turn.siteId),
        intentId: "article",
        author: user.name,
        publishing: true,
      });
      if (!coded.ok) return ask(coded.error);
      const prepared = prepareCodePush(snapshot, carried.task, user, {
        siteId: turn.siteId,
        intentId: "article",
        title: copy.title,
        files: coded.files,
      });
      const run = await finishPull(carried.instruction, carried.task, user, prepared);
      return Response.json({ run });
    }
    const section = publishingSection(turn.siteId);
    const run = await mutate((db) => {
      if (!section) {
        const reply = "That website has no article path. The draft stays closed.";
        return recordAgentRun(db, carried.instruction, user, reply, [{ id: crypto.randomUUID(), tool: "create_article", summary: reply, ok: false }], carried.task);
      }
      const result = createArticle(db, {
        siteId: turn.siteId,
        title: copy.title,
        body: copy.body,
        section,
        author: user.name,
        documentUrl: "",
        source: "agent",
        actor: user,
        intent: "article",
      });
      const reply = result.ok ? result.message : result.error;
      return recordAgentRun(db, carried.instruction, user, reply, [{ id: crypto.randomUUID(), tool: "create_article", summary: reply, ok: result.ok }], carried.task);
    });
    return Response.json({ run });
  }

  if (turn.kind === "retitle") {
    const edited = await retitle(turn, user);
    if (!edited.pull?.pull) return ask(edited.reply || edited.pull?.error || "The title change stays closed.");
    const run = await finishPull(carried.instruction, carried.task, user, edited.pull);
    return Response.json({ run });
  }

  if (turn.kind === "push") {
    const prepared = prepareCodePush(snapshot, carried.task, user, { siteId: turn.siteId, intentId: turn.intentId });
    const run = await finishPull(carried.instruction, carried.task, user, prepared);
    return Response.json({ run });
  }

  const history = snapshot.runs
    .filter((run) => run.actorId === user.id)
    .slice(0, 4)
    .reverse()
    .map((run) => ({ instruction: run.instruction, reply: run.reply }));
  const plan = await planInstruction(carried.instruction, snapshot, history).catch(() => null);
  const wantsProbe = Boolean(plan?.tools.some((tool) => tool.name === "probe_health")) || (!plan && instructionNeedsProbe(carried.instruction));
  let probes = null;
  if (wantsProbe && canOperate(user.role)) probes = await probeSites(snapshot.sites);
  const run = await mutate((db) => executeAgent(db, carried.instruction, user, probes, plan));
  return Response.json({ run });
}

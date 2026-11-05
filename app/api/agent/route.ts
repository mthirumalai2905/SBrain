import { executeAgent, instructionNeedsProbe } from "@/lib/agent";
import { getSession } from "@/lib/auth";
import { planInstruction } from "@/lib/groq";
import { probeSites } from "@/lib/health";
import { canOperate, canUseAgent } from "@/lib/rbac";
import { mutate, readDb } from "@/lib/store";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!canUseAgent(user.role)) return Response.json({ error: "You have read-only access." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { instruction?: string } | null;
  const instruction = body?.instruction?.trim() ?? "";
  if (!instruction) return Response.json({ error: "Write an instruction first." }, { status: 400 });
  if (instruction.length > 4000) return Response.json({ error: "That instruction is too long." }, { status: 400 });

  const snapshot = readDb();
  const plan = await planInstruction(instruction, snapshot).catch(() => null);
  const wantsProbe = Boolean(plan?.tools.some((tool) => tool.name === "probe_health")) || (!plan && instructionNeedsProbe(instruction));
  let probes = null;
  if (wantsProbe && canOperate(user.role)) {
    probes = await probeSites(snapshot.sites);
  }
  const run = await mutate((db) => executeAgent(db, instruction, user, probes, plan));
  return Response.json({ run });
}

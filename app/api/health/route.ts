import { recordProbes } from "@/lib/agent";
import { getSession } from "@/lib/auth";
import { probeSites } from "@/lib/health";
import { canOperate } from "@/lib/rbac";
import { mutate, readDb } from "@/lib/store";
import { addLog, reopenFailedJobs, runQueuedJobs } from "@/lib/workflow";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!canOperate(user.role)) return Response.json({ error: "Health checks are limited to owners and operators." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { action?: string; kind?: string; authorised?: boolean } | null;

  if (body?.action === "probe" || (body?.action === "recover" && body.kind === "probe")) {
    if (body.action === "recover" && !body.authorised) {
      return Response.json({ error: "Turn on authorisation before running recovery." }, { status: 400 });
    }
    const probes = await probeSites(readDb().sites);
    await mutate((db) => recordProbes(db, probes, user.name));
    const unhealthy = probes.filter((probe) => !probe.ok);
    const message = unhealthy.length
      ? `Checked ${probes.length} URLs. ${unhealthy.length} did not look healthy. The VPS was not accessed.`
      : `Checked ${probes.length} URLs. The public pages responded. The VPS was not accessed.`;
    return Response.json({ message });
  }

  if (body?.action === "recover" && body.kind === "retry-jobs") {
    if (!body.authorised) return Response.json({ error: "Turn on authorisation before running recovery." }, { status: 400 });
    const processed = await mutate((db) => {
      const reopened = reopenFailedJobs(db);
      const ran = runQueuedJobs(db, user.name);
      addLog(db, {
        kind: "system",
        actor: user.name,
        action: "Recovery",
        target: "Formatting jobs",
        detail: `Authorised locally. Reopened ${reopened}. Ran ${ran}. No website was contacted.`,
      });
      return ran;
    });
    return Response.json({
      message: processed
        ? "Retried the formatting jobs inside Brain and checked the result. No website was contacted."
        : "There was no failed formatting job to retry.",
    });
  }

  return Response.json({ error: "That recovery is not available." }, { status: 400 });
}

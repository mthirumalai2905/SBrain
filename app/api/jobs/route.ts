import { getSession } from "@/lib/auth";
import { mutate } from "@/lib/store";
import { runQueuedJobs } from "@/lib/workflow";

export async function POST() {
  const user = await getSession();
  if (!user) return Response.json({ processed: 0 });
  const processed = await mutate((db) => runQueuedJobs(db, "Brain"));
  return Response.json({ processed });
}

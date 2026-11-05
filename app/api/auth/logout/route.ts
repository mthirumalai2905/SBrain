import { clearSession, getSession } from "@/lib/auth";
import { addLog } from "@/lib/workflow";
import { mutate } from "@/lib/store";

export async function POST() {
  const user = await getSession();
  if (user) {
    await mutate((db) => {
      addLog(db, { kind: "auth", actor: user.name, action: "Signed out", target: user.email, detail: "" });
    });
  }
  await clearSession();
  return Response.json({ ok: true });
}

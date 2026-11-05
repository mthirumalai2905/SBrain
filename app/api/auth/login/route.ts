import { getSession, setSession, verifyPassword } from "@/lib/auth";
import { addLog } from "@/lib/workflow";
import { mutate, readDb } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const user = readDb().users.find((item) => item.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return Response.json({ error: "Those details don’t match a Brain account." }, { status: 401 });
  }
  await setSession(user.id);
  await mutate((db) => {
    addLog(db, { kind: "auth", actor: user.name, action: "Signed in", target: user.email, detail: user.role });
  });
  return Response.json({ ok: true });
}

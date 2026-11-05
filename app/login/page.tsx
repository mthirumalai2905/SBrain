import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";
import { liveDb } from "@/lib/live";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");
  const accounts = (await liveDb()).users.map(({ id, name, email, role }) => ({ id, name, email, role }));
  return (
    <main className="gate">
      <div className="gate-inner">
        <span className="brand-logo lg">
          <img src="/icons/brain.jpg" alt="" />
        </span>
        <h1>Brain</h1>
        <p className="lede">Sign in to the Synx control centre.</p>
        <LoginForm accounts={accounts} />
      </div>
    </main>
  );
}

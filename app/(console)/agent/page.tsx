import type { Metadata } from "next";
import { AgentPanel } from "@/components/agent-panel";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { liveDb } from "@/lib/live";
import { canUseAgent } from "@/lib/rbac";

export const metadata: Metadata = { title: "AI Agent" };

export default async function AgentPage() {
  const user = await requireUser();
  const db = await liveDb();
  return (
    <div className="agent-screen">
      <PageHeader
        title="AI Agent"
        lede="Instructions stay inside Brain. The agent can draft, approve, roll back, and check public pages. It cannot publish to the live websites."
      />
      <AgentPanel runs={db.runs} enabled={canUseAgent(user.role)} />
    </div>
  );
}

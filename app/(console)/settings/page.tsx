import type { Metadata } from "next";
import { AppearanceControl } from "@/components/appearance";
import { PageHeader, Group } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { liveDb } from "@/lib/live";
import { roleDetail, roleLabel } from "@/lib/rbac";
import type { Role } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

const roles: Role[] = ["owner", "editor", "reviewer", "operator", "viewer"];

export default async function SettingsPage() {
  const user = await requireUser();
  const db = await liveDb();
  return (
    <div>
      <PageHeader title="Settings" lede="Appearance, access, and connections." />
      <div className="stack narrow">
        <Group title="Appearance" footer="Light and Dark are full themes. System follows this device.">
          <AppearanceControl />
        </Group>
        <Group title="Signed in">
          <div className="row">
            <span className="row-main">
              <span className="row-title">{user.name}</span>
              <span className="row-sub">
                {user.email} · {roleLabel[user.role]}
              </span>
            </span>
          </div>
        </Group>
        <Group title="Access" footer="Roles are enforced on every change. A viewer can read. An operator can check health. An editor drafts. A reviewer approves. An owner records a published URL.">
          {roles.map((role) => (
            <div className="row" key={role}>
              <span className="row-main">
                <span className="row-title">{roleLabel[role]}</span>
                <span className="row-sub">{roleDetail[role]}</span>
              </span>
              {user.role === role ? <span className="row-aside you">You</span> : null}
            </div>
          ))}
        </Group>
        <Group title="Integrations" footer="Credentials are not stored. None were provided, and Brain does not invent API keys, database URLs, or server logins.">
          <div className="row">
            <span className="row-main">
              <span className="row-title">Google Drive</span>
              <span className="row-sub">Watch list in Brain: {db.drive.folders.join(", ")}.</span>
            </span>
            <span className="row-aside">Off</span>
          </div>
          <div className="row">
            <span className="row-main">
              <span className="row-title">Website publishing</span>
              <span className="row-sub">Synx, Real Time Web, Morph Space, and Skalle AI.</span>
            </span>
            <span className="row-aside">Off</span>
          </div>
          <div className="row">
            <span className="row-main">
              <span className="row-title">VPS host agent</span>
              <span className="row-sub">CPU, memory, disk, Nginx, and the database.</span>
            </span>
            <span className="row-aside">Off</span>
          </div>
          <div className="row">
            <span className="row-main">
              <span className="row-title">Model provider</span>
              <span className="row-sub">The agent uses Brain’s own tools.</span>
            </span>
            <span className="row-aside">Off</span>
          </div>
        </Group>
        <Group title="Boundaries">
          <div className="row">
            <span className="row-main">
              <span className="row-title">What was inspected</span>
              <span className="row-sub">
                Public pages for synx.tools, realtimeweb.org, morph.space, and skalle.ai, plus the local Skalle Discord bot notes. The website repositories were not on this machine.
              </span>
            </span>
          </div>
          <div className="row">
            <span className="row-main">
              <span className="row-title">What Brain will not do</span>
              <span className="row-sub">It does not rebuild those sites, write to their deployments, or restart their services.</span>
            </span>
          </div>
        </Group>
      </div>
    </div>
  );
}

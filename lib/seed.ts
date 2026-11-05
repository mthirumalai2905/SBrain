import { randomBytes, scryptSync } from "crypto";
import type { DB } from "./types";

export const LOCAL_PASSWORD = "brain-local";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function user(id: string, name: string, email: string, role: DB["users"][number]["role"]) {
  return { id, name, email, role, passwordHash: hashPassword(LOCAL_PASSWORD) };
}

export function createSeed(): DB {
  const now = new Date().toISOString();
  return {
    version: 1,
    users: [
      user("usr_owner", "Owner", "owner@brain.local", "owner"),
      user("usr_editor", "Editor", "editor@brain.local", "editor"),
      user("usr_reviewer", "Reviewer", "reviewer@brain.local", "reviewer"),
      user("usr_operator", "Operator", "operator@brain.local", "operator"),
      user("usr_viewer", "Viewer", "viewer@brain.local", "viewer"),
    ],
    sites: [
      {
        id: "synx",
        name: "Synx",
        slug: "synx",
        publicUrl: "https://synx.tools",
        summary: "Tool suite for domain owners, developers, and consumers on the Real Time Web.",
        stack: "Next.js, observed from the public HTML. Source repository was not on this machine.",
        formatting:
          "News articles use /news/{slug}. Other public paths include /tools, /bios, /dns, /pass, /skalle, /morph, /who, /articles, and /real-time-web-position. The content fields inside the Next.js project were not available to inspect.",
        deploymentNote:
          "Left on its current deployment. synx.tools/morph is a page of this same site. Brain does not rebuild or publish to it.",
        connector: "not_configured",
        checks: ["https://synx.tools/", "https://synx.tools/morph"],
        sections: [
          { id: "synx-news", label: "News", path: "/news", kind: "news", note: "Observed article URLs such as /news/raising-a-superintelligence." },
          { id: "synx-articles", label: "Articles", path: "/articles", kind: "page" },
          { id: "synx-tools", label: "Tools", path: "/tools", kind: "page" },
          { id: "synx-bios", label: "BIOS", path: "/bios", kind: "page" },
          { id: "synx-dns", label: "DNS", path: "/dns", kind: "page" },
          { id: "synx-pass", label: "Pass", path: "/pass", kind: "page" },
          { id: "synx-skalle", label: "Skalle", path: "/skalle", kind: "page" },
          { id: "synx-morph", label: "Morph", path: "/morph", kind: "page", note: "Marketing page served by the Synx site, not by morph.space." },
          { id: "synx-who", label: "Who", path: "/who", kind: "page" },
          { id: "synx-position", label: "Position", path: "/real-time-web-position", kind: "page" },
          { id: "synx-legal", label: "Legal", path: "/legal", kind: "legal" },
        ],
      },
      {
        id: "realtimeweb",
        name: "Real Time Web",
        slug: "realtimeweb",
        publicUrl: "https://realtimeweb.org",
        summary: "Standalone site for the architecture and the journal.",
        stack: "Next.js App Router, observed from /_next chunks and app routes. Source repository was not on this machine.",
        formatting:
          "The journal index title is “Journals”. Posts use /blog/{slug}. Documentation uses /docs. The public document sets a dark theme. Exact front-matter fields were not in the repository set on this machine.",
        deploymentNote: "Left on its current deployment. www.realtimeweb.org and realtimeweb.org both respond.",
        connector: "not_configured",
        checks: ["https://realtimeweb.org/", "https://www.realtimeweb.org/blog"],
        sections: [
          { id: "rtw-blog", label: "Journal", path: "/blog", kind: "journal", note: "Index title observed as Journals." },
          { id: "rtw-docs", label: "Docs", path: "/docs", kind: "docs" },
          { id: "rtw-hood", label: "Hood", path: "/hood/implementation/blueprint", kind: "page" },
          { id: "rtw-contact", label: "Contact", path: "/contact", kind: "page" },
        ],
      },
      {
        id: "morph",
        name: "Morph Space",
        slug: "morph",
        publicUrl: "https://morph.space",
        summary: "Where people, agents, and machines enter the Real Time Web. The public app shell is separate from the Synx marketing page.",
        stack: "Vite single-page app. The document title is synx-dns. A Cloudflare analytics beacon is present. No server-rendered content routes were in the HTML.",
        formatting:
          "No article schema was exposed by the public app. Drafts for Morph Space stay in Brain under a holding section until a connector exists. The long-form Morph page currently lives at synx.tools/morph.",
        deploymentNote: "https://morph.space was not modified. It is a different deployment from synx.tools.",
        connector: "not_configured",
        checks: ["https://morph.space/"],
        sections: [
          {
            id: "morph-holding",
            label: "Holding drafts",
            path: "/drafts",
            kind: "holding",
            note: "Brain-side only. This path was not observed on morph.space.",
          },
        ],
      },
      {
        id: "skalle",
        name: "Skalle AI",
        slug: "skalle",
        publicUrl: "https://skalle.ai",
        summary: "Interface for authorised Real Time Web operations.",
        stack: "Next.js with Turbopack, observed from the public HTML. Source repository was not on this machine.",
        formatting:
          "Public paths include /articles, /chronicles, /system, /research, /lab, /architecture, and /careers. Fonts named on the page are Outfit, JetBrains Mono, and Archivo Black. Their content schema was not in a local repository.",
        deploymentNote: "Left on its current deployment. Brain does not publish to skalle.ai.",
        connector: "not_configured",
        checks: ["https://skalle.ai/"],
        sections: [
          { id: "skalle-articles", label: "Articles", path: "/articles", kind: "journal" },
          { id: "skalle-chronicles", label: "Chronicles", path: "/chronicles", kind: "journal" },
          { id: "skalle-system", label: "System", path: "/system", kind: "page" },
          { id: "skalle-research", label: "Research", path: "/research", kind: "page" },
          { id: "skalle-lab", label: "Lab", path: "/lab", kind: "page" },
          { id: "skalle-architecture", label: "Architecture", path: "/architecture", kind: "page" },
          { id: "skalle-careers", label: "Careers", path: "/careers", kind: "page" },
        ],
      },
    ],
    articles: [],
    jobs: [],
    probes: [],
    runs: [],
    logs: [
      {
        id: "log_seed",
        at: now,
        kind: "system",
        actor: "Brain",
        action: "Installed",
        target: "Control centre",
        detail: "Local store created. Live websites were not contacted during setup.",
      },
    ],
    drive: {
      connected: false,
      folders: ["Incoming"],
      files: [],
    },
  };
}

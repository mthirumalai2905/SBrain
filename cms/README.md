# Synx Brain

Multi-site headless CMS. One admin manages content for many websites.

- `apps/api`: Fastify + Prisma + PostgreSQL (JWT auth, roles, content types, entries, media, public delivery API)
- `apps/admin`: React + Vite admin UI

## Run it

```bash
npm install
npm run db:up                        # Postgres in Docker on localhost:5433 (or point DATABASE_URL at your own)
cp apps/api/.env.example apps/api/.env   # then set JWT_SECRET
npm run db:migrate                  # applies the migrations (creates tables)
npm run dev                          # API on :4000 and admin on :5173 together
```

Open the admin; the first account you create becomes the super admin.

## Concepts

- **Site**: one website/domain set. Has an API key and a list of domains.
- **Roles per site**: ADMIN (types, team, settings), EDITOR (content, media), VIEWER (read). Super admins can do everything and create sites/users.
- **Content type**: fields you define (text, textarea, richtext, number, boolean, date, image, select, json).
- **Entry**: content of a type, DRAFT or PUBLISHED.

## Delivery API (for your websites)

Read-only, published entries only. Identify the site with `x-api-key` (or `?key=`), or let it match the request Origin against the site's domains.

```
GET /public/:type              -> { total, items: [...] }   (?limit=50&offset=0)
GET /public/:type/:idOrSlug    -> entry
```

```ts
const res = await fetch('https://cms.example.com/public/posts', { headers: { 'x-api-key': KEY } });
```

Do not ship the API key in browser code you want kept secret. It only grants read access to published content, so it is fine for public sites; use domain matching if you prefer no key.

## Production

`npm run build`, then `npm run deploy -w apps/api` (migrations) and `npm start -w apps/api`. Set `JWT_SECRET`, `DATABASE_URL`, `PUBLIC_URL` (used in media URLs), `ADMIN_ORIGIN` (CORS for the admin). Uploads go to `UPLOAD_DIR` on local disk; use a persistent volume, or swap `routes/media.ts` for S3.

## Pages and sections (page builder)

A content type has a kind: **List**, **Single document**, **Page** or **Section block**. A page holds an ordered list of sections; each section is an instance of a Section block type and has its own fields. Fields of type **List of items** (`array`) hold repeating objects such as stats or steps.

Public API for a page (sections are flat, in order, each with `_key` and `_type`):

```json
{ "slug": "home", "title": "Home", "sections": [ { "_key": "...", "_type": "hero", "heading": "..." } ] }
```

## Live preview

Structure is for editing content. **Live preview** is a separate screen: pick a page or document, see it large on the left, and edit it in the panel on the right. Changes show on the page as you type, and Publish / Save draft sits at the bottom of the panel.

- **Edit switch:** with it on, clicking text or an image on the page selects that field in the panel (images open the image picker with upload). Turn it off to use the page normally.
- **Site / Basic:** Site shows your real website. Basic is a built-in view that works with no setup and is clickable the same way.
- **Setup for Site:** set the site's *Preview URL* under Settings. Home opens at that address, other pages at `/<slug>`. Then add three things to your site:

```html
<!-- 1. Include the script (it does nothing outside the CMS preview) -->
<script src="https://YOUR-CMS/sdk/visual-editing.js"></script>

<!-- 2. Mark up what editors can click -->
<h1 data-synx-edit="page.title">Home</h1>
<section data-synx-key="{section._key}">
  <h2 data-synx-edit="{section._key}.heading">...</h2>
  <img data-synx-image="{section._key}.image" src="...">
  <p data-synx-edit="{section._key}.items.2.text">...</p>
</section>

<script>
// 3. Render the draft the CMS sends while editing
window.addEventListener('synx:preview', (e) => {
  const entry = e.detail.entry; // { slug, ...fields, sections: [{ _key, _type, ...fields }] }
  renderPage(entry);
});
</script>
```

The script is served by the CMS at `/sdk/visual-editing.js`. It does nothing outside the CMS preview frame. Edit paths are `<target>.<field>`, where target is `page` or a section `_key`, and items of a list field add `.<index>.<subfield>`.

## Morph Space site (`apps/morph-space`)

The Morph Space website, copied from the design project and connected to this CMS. Its pages are built from the sections kept in the **Morph Space** site here (Home, How it works, Features, Pricing, Contact, plus Header, Footer and Website Settings).

```bash
cp apps/morph-space/.env.example apps/morph-space/.env.local   # then paste the site's delivery key (Settings)
npm run dev:site                                               # http://localhost:5180
```

- Set the site's **Preview URL** (Settings) to `http://localhost:5180` and it opens in **Live preview** with click-to-edit.
- If the CMS is off or the key is missing, every page shows the text built into the site (the `defaults` in each page file).
- Animated demo panels and the hero video stay in the site's code; the CMS controls their text and which picture a block shows.
- Extra fields on the contact form (company, website, resume upload) stay in `src/lib/content.ts`.

## AI assistant (Live preview › AI assistant)

A chat panel beside the editor. Pick Claude, ChatGPT or Gemini, describe a change or paste a Google Doc link, and the assistant fills in the page. It never saves or publishes: its changes show up in the editor as unsaved edits (with Undo), and you press Save or Publish, which asks to confirm.

Set it up in `apps/api/.env` (see `.env.example`), then restart the API:

- **Providers:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`. A provider without a key is greyed out. Optional `*_MODEL` and `*_BASE_URL` per provider.
- **Google Drive:** paste a Google Doc, Sheet or Slides link that is shared as "Anyone with the link can view". Private files are refused. Only Google's own addresses are contacted.
- **MCP servers:** `MCP_SERVERS=[{"name":"notes","url":"https://…/mcp","token":"…"}]`. Only tools the server marks read-only are offered, unless the server has `"allowWrites": true`.
- **API sources:** `API_SOURCES=[{"name":"products","baseUrl":"https://api.example.com/v1","token":"…","description":"…"}]`. GET only, and only that host.

Keys stay on the server; they are never sent to the browser or written to the log. Anything read from a Doc, MCP tool or API is treated as source material, not as instructions.

### Adding connectors from Settings

**Settings › AI connectors** (site admins) is where you add MCP servers and REST APIs for a site: type, name, address, key, and (for MCP) whether tools that change data are allowed. **Test** connects and reports the tool count or HTTP status. Keys are stored encrypted (AES-256-GCM, key from `CONNECTOR_KEY`, or `JWT_SECRET` if that is not set), are never shown again and never leave the server. MCP and API settings in `.env` still work for the whole install; a site's own connector wins if the name is the same. The AI models themselves (Claude, ChatGPT, Gemini) still use keys in `apps/api/.env`.

The assistant is in **Live preview** (the AI assistant tab) and in **Structure** (the ✦ AI assistant button in the editor bar, which opens a panel on the right).

### AI keys are set in Settings

**Settings › AI assistant › AI models** is where you add the Claude, ChatGPT and Gemini keys (and, optionally, which model each one uses). Each has a **Test** button. Keys are stored encrypted on the server (AES-256-GCM), only the last four characters are ever shown, and a key saved here wins over `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` in `apps/api/.env`, which still work as a fallback.

Settings is split into sections: **Website** (name, addresses, preview address), **AI assistant** (models and connectors), **Connect your website** (the key your front end uses), **Team**, and **All sites** (super admins).

## Connect AI tools (the CMS as an MCP server)

Claude (web, desktop app, Claude Code), ChatGPT, Codex, Gemini CLI, Cursor, VS Code, Windsurf and any other tool that speaks MCP can read and edit a site through the CMS, using their own plans (no API credits).

1. **Settings › Connect AI tools** (one site) or **Settings › All sites** (every site): add a key for each AI tool. Every key can be shown and copied at any time (they are stored encrypted), and removed on its own. Choose what it may do: read only; read and save drafts; or also publish and change live pages.
2. Press **Setup** on a key. It lists exactly what that tool asks for with the key filled in: a **Name** and an **MCP server URL** for apps with an "Add custom connector" form (Claude, ChatGPT), or a command / config snippet for Claude Code, Codex, Gemini CLI, Cursor, VS Code and Windsurf.

**Apps that connect from the internet** (Claude's "Add custom connector", ChatGPT) cannot reach `localhost`; they need a public https address, and their form has no field for a key, so the key goes inside the address: `https://<public address>/mcp/k/<key>`. To get one without exposing the whole CMS, run `npm run mcp:public` (a tiny door on port 4010 that forwards only `/mcp/k/<key>` and answers 404 to everything else) and point a tunnel at it, for example `cloudflared tunnel --url http://localhost:4010`. Paste the https address it prints into the box at the top of the Connect AI tools screen. Never point a tunnel at port 4000 while sign-in is off. The key is never written to the logs. Tools on this computer use `http://localhost:4000/mcp` with an `Authorization: Bearer <key>` header.

Tools: `get_site`, `list_documents`, `get_document`, `create_draft_copy`, `create_draft_page`, `update_draft`; with the all-sites key also `list_sites` and a `site` argument on every tool; with the publish level also `preview_publish` + `publish_page` and `preview_live_edit` + `update_live_page`.

**Anything that changes the live site is confirmed in the AI tool, not in the CMS.** The AI first calls a `preview_*` tool, which changes nothing and returns what would change plus a short-lived token for exactly those changes. It must show you and ask. Only then does it call the matching live tool, which needs the token and your confirmation in your own words, and which is marked as a destructive tool so the AI app shows its own Allow / Deny button. Do not choose "Always allow" for `publish_page` or `update_live_page`: the CMS cannot stop an AI app you have told to always allow. Requests from a web page (they carry an Origin header) are refused, and removing a key takes effect immediately.

## Notifications and version history

- **Bell** (top bar): shows who added, edited, published or deleted something on the site, including changes made by AI tools (shown as "Claude (AI)", "Cursor (AI)" and so on). The badge counts changes by other people since you last opened it.
- **Email**: members of a site get one email per batch of changes (sent a minute after the first one), never about their own changes. Each person can turn it off in the bell menu. It needs an SMTP account: set `SMTP_HOST` (and `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) in `apps/api/.env`, see `.env.example`. Without it nothing is sent and the changes wait for up to a day.
- **History** (button in every page and document): every save is kept (the latest 60 per document), with who made it and what changed. **Restore** puts an older version back. The page keeps its current status, and the restore is itself added to the history so it can be undone. The history of a deleted document is kept too.

## Synx Tools site

`apps/synx-tools` is the Synx Tools website (port 5181), the design of the Synx project rebuilt as a React app that reads all its pages, header, footer, articles and team from this CMS (site "Synx Tools"). `npm run dev` starts it with the others, or `npm run dev:synx` on its own. It needs `apps/synx-tools/.env.local` with `VITE_CMS_URL` and the site delivery key (`VITE_CMS_KEY`, see Settings), and the site's Preview URL set to `http://localhost:5181` for Live preview and click to edit. See `apps/synx-tools/AGENTS.md`.

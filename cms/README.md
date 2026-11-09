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

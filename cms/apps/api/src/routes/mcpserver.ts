import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../db.js';
import { validateData, type Field } from '../fields.js';
import { applyChanges, describeFields, type SectionDef, type SectionRow } from '../agent/edit.js';
import { hashKey } from './mcpkeys.js';
import { recordChange, type Actor } from '../activity.js';
import { diffDocs, draftProblems, previewDraft, previewToken, publishDraft, tokenValid } from '../agent/publish.js';

/**
 * The CMS as an MCP server, so Claude (Claude Code / Claude Desktop) can work on a site's content.
 *
 * - Streamable HTTP, answered with plain JSON (no sessions). One endpoint: POST /mcp.
 * - The Bearer key picks the site: Claude only ever sees that one site.
 * - Claude can read everything, create new draft pages, and edit pages that are still drafts. It can NOT change the status of
 *   anything or touch a page that is live (it makes a draft copy of it instead). A "read" key can only read.
 * - A "publish" key may also change a LIVE page directly, or publish a draft, but only after the USER confirms in the AI tool: preview_publish says what
 *   would change and returns a token; publish_page needs that token and the user's confirmation, and is marked as a
 *   destructive tool so the AI app (Claude, Cursor...) shows its own Allow / Deny button before running it.
 * - Requests that carry an Origin header (a web page, not Claude) are refused.
 */
const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05'];
const adminUrl = () => (process.env.ADMIN_ORIGIN ?? 'http://localhost:5173').split(',')[0];
const newId = () => 's' + randomBytes(5).toString('hex');

type Perm = 'read' | 'draft' | 'publish';
/** What a tool needs: one site and what the key may do there. */
interface Auth { siteId: string; perm: Perm; label: string }
/** Who is calling: a key for one site, or the key for all sites (then every call says which site). */
interface Principal { perm: Perm; all: boolean; siteId?: string; label: string }
const asPerm = (p: unknown): Perm => (p === 'read' || p === 'publish' ? p : 'draft');

/** The key can come in the Authorization header, or inside the address (/mcp/k/<key>) for apps that only ask for a name and a URL. */
async function authenticate(req: FastifyRequest): Promise<Principal | null> {
  const fromAddress = (req.params as { key?: string } | undefined)?.key;
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '');
  const key = fromAddress || m?.[1];
  if (!key) return null;
  const row = await prisma.mcpKey.findUnique({ where: { hash: hashKey(key) } });
  return row ? { all: row.siteId === null, siteId: row.siteId ?? undefined, perm: asPerm(row.perm), label: row.label } : null;
}

/** With the all-sites key, find the site a call is about by its name or slug. */
async function pickSite(p: Principal, requested: unknown): Promise<{ siteId: string } | { error: string }> {
  if (!p.all) return { siteId: p.siteId! };
  const sites = await prisma.site.findMany({ orderBy: { createdAt: 'asc' } });
  const list = sites.map((x) => x.name).join(', ');
  const want = String(requested ?? '').trim().toLowerCase();
  if (!want) return { error: `Say which site this is about with the "site" argument. Sites: ${list}.` };
  const hit = sites.find((x) => x.slug.toLowerCase() === want || x.name.toLowerCase() === want) ?? sites.find((x) => x.name.toLowerCase().includes(want));
  return hit ? { siteId: hit.id } : { error: `No site called "${requested}". Sites: ${list}.` };
}

const siteArg = { type: 'string', description: 'Which site this is about: its name or slug (see list_sites).' };
const listSitesTool = { name: 'list_sites', description: 'List the sites this key can reach, with how much content each has. Call this first, then pass the site name in the "site" argument of every other tool.', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true } };

const PUBLISH_TOOLS = ['preview_publish', 'publish_page', 'preview_live_edit', 'update_live_page'];
const text = (t: string, isError = false) => ({ content: [{ type: 'text', text: t }], ...(isError ? { isError: true } : {}) });
const json = (v: unknown) => text(JSON.stringify(v, null, 1));

const editShape = {
  edits: {
    type: 'array',
    description: 'Changes to field values. path is "page.<field>" for the page itself, or "<sectionKey>.<field>" for a section. For list fields use "<sectionKey>.<listField>.<index>.<subfield>" (index starts at 0), or set the whole list with "<sectionKey>.<listField>".',
    items: { type: 'object', properties: { path: { type: 'string' }, value: { description: 'The new value: a string, number, boolean, or for a list an array of objects.' } }, required: ['path', 'value'] },
  },
  add_sections: {
    type: 'array', description: 'New sections to add.',
    items: { type: 'object', properties: { type: { type: 'string', description: 'A section type slug (see get_site).' }, data: { type: 'object', description: 'The section fields.' }, after_key: { type: 'string', description: 'Key of the section to insert after, "start" for the top, or leave out to add at the end.' } }, required: ['type', 'data'] },
  },
  remove_section_keys: { type: 'array', items: { type: 'string' }, description: 'Keys of sections to remove.' },
};

const tools = [
  { name: 'get_site', description: 'Describe this site: its page and section types (with every field), and the single documents such as Header and Footer. Read this first to learn what can be edited.', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true } },
  { name: 'list_documents', description: 'List the pages and single documents (Header, Footer, Website Settings) with their status and last change.', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true } },
  { name: 'get_document', description: 'Read one page or single document in full. Sections are listed in order, each with its "key" (use that key in edit paths).', inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'The page slug, for example "home".' }, type: { type: 'string', description: 'The type slug of a single document, for example "header" or "footer".' } } }, annotations: { readOnlyHint: true } },
  { name: 'create_draft_copy', description: 'Copy a page into a new DRAFT, so it can be edited safely. Live pages cannot be edited directly; copy first, edit the copy, and the owner publishes it from the CMS.', inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'The page to copy.' }, new_slug: { type: 'string', description: 'Slug for the copy (optional, defaults to "<slug>-draft").' } }, required: ['slug'] }, annotations: { readOnlyHint: false, destructiveHint: false } },
  { name: 'create_draft_page', description: 'Create a new page as a DRAFT.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, slug: { type: 'string', description: 'Lowercase letters, digits and dashes.' }, sections: { type: 'array', description: 'Optional starting sections.', items: { type: 'object', properties: { type: { type: 'string' }, data: { type: 'object' } }, required: ['type', 'data'] } } }, required: ['title', 'slug'] }, annotations: { readOnlyHint: false, destructiveHint: false } },
  { name: 'preview_publish', description: 'Step 1 of publishing. Says exactly what would change if this draft went live, and returns a token. It does NOT publish anything. Show the user the summary and ask whether to publish it.', inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'The draft page.' }, replaces: { type: 'string', description: 'Slug of the live page this draft should replace (optional; otherwise the draft goes live under its own address).' } }, required: ['slug'] }, annotations: { readOnlyHint: true } },
  { name: 'publish_page', description: 'Step 2 of publishing. MAKES THE DRAFT LIVE ON THE WEBSITE. Only call this after the user has clearly said yes to the summary from preview_publish. It needs that token and the user\'s confirmation in their own words. The user\'s AI app will also ask them to allow this call.', inputSchema: { type: 'object', properties: { slug: { type: 'string' }, replaces: { type: 'string', description: 'Same value you gave to preview_publish.' }, token: { type: 'string', description: 'The token from preview_publish.' }, user_confirmation: { type: 'string', description: 'What the user said to confirm, in their own words.' } }, required: ['slug', 'token', 'user_confirmation'] }, annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false } },
  { name: 'preview_live_edit', description: 'Step 1 of changing a LIVE page directly. Says exactly what would change and returns a token. It does NOT change anything. Show the user the summary and ask whether to apply it.', inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'The live page.' }, ...editShape }, required: ['slug'] }, annotations: { readOnlyHint: true } },
  { name: 'update_live_page', description: 'Step 2 of changing a LIVE page directly. CHANGES THE LIVE WEBSITE IMMEDIATELY. Only call this after the user has clearly said yes to the summary from preview_live_edit, with exactly the same changes. It needs that token and the user\'s confirmation in their own words. The user\'s AI app will also ask them to allow this call.', inputSchema: { type: 'object', properties: { slug: { type: 'string' }, ...editShape, token: { type: 'string', description: 'The token from preview_live_edit.' }, user_confirmation: { type: 'string', description: 'What the user said to confirm, in their own words.' } }, required: ['slug', 'token', 'user_confirmation'] }, annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false } },
  { name: 'update_draft', description: 'Edit a page that is still a DRAFT: change field values, add sections, remove sections. Pages that are live cannot be edited; use create_draft_copy first. Nothing is published.', inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'The draft page slug.' }, ...editShape }, required: ['slug'] }, annotations: { readOnlyHint: false, destructiveHint: false } },
];

export default async function (app: FastifyInstance) {
  async function run(name: string, args: Record<string, any>, auth: Auth) {
    const types = await prisma.contentType.findMany({ where: { siteId: auth.siteId }, orderBy: { createdAt: 'asc' } });
    const pageType = types.find((t) => t.kind === 'page');
    const sectionDefs: SectionDef[] = types.filter((t) => t.kind === 'section').map((t) => ({ slug: t.slug, name: t.name, fields: t.fields as unknown as Field[] }));
    const canWrite = auth.perm !== 'read';
    const aiActor: Actor = { id: null, name: `${auth.label} (AI)`, source: 'ai' };
    const readOnlyMsg = 'This key is read-only. Create a key that can save drafts under Settings › Connect Claude.';

    type Found = { error: string } | { entry: NonNullable<Awaited<ReturnType<typeof prisma.entry.findFirst>>>; type: (typeof types)[number] };
    const findDoc = async (a: { slug?: string; type?: string }): Promise<Found> => {
      if (a.type) {
        const t = types.find((x) => x.slug === a.type);
        if (!t) return { error: `No document type "${a.type}". Types: ${types.map((x) => x.slug).join(', ')}` };
        const entry = await prisma.entry.findFirst({ where: { siteId: auth.siteId, contentTypeId: t.id, ...(t.kind === 'singleton' ? {} : { slug: a.slug ?? '' }) } });
        return entry ? ({ entry, type: t }) : ({ error: 'That document does not exist yet.' });
      }
      if (a.slug) {
        const entry = await prisma.entry.findFirst({ where: { siteId: auth.siteId, slug: a.slug, contentTypeId: { in: types.filter((t) => t.kind === 'page').map((t) => t.id) } } });
        const type = entry && types.find((t) => t.id === entry.contentTypeId);
        return entry && type ? ({ entry, type }) : ({ error: `No page with the slug "${a.slug}". Use list_documents to see them.` });
      }
      return { error: 'Give a page "slug", or the "type" of a single document.' };
    };
    const split = (data: Record<string, unknown>) => { const { sections, ...rest } = data; return { rest, sections: (Array.isArray(sections) ? sections : []) as SectionRow[] }; };

    if (name === 'get_site') {
      const site = await prisma.site.findUniqueOrThrow({ where: { id: auth.siteId } });
      const pages = types.filter((t) => t.kind === 'page');
      const singles = types.filter((t) => t.kind === 'singleton');
      const lines = [`Site: ${site.name}`, '', !canWrite ? 'This key is read-only.' : auth.perm === 'publish' ? 'You can read everything, create and edit draft pages, change a live page with preview_live_edit then update_live_page, and publish a draft with preview_publish then publish_page. Anything that changes the live site needs the user\'s explicit OK first: show them the preview and ask in this chat. Their AI app will also show its own Allow button.' : 'You can read everything, create draft pages and edit draft pages. You cannot publish.', ''];
      if (!types.length) lines.push('This site has no content types yet, so there is nothing to edit.');
      for (const t of pages) lines.push(`Page type "${t.slug}" (${t.name}) fields:`, describeFields(t.fields as unknown as Field[]), '');
      if (sectionDefs.length) { lines.push('Section types a page can contain:'); for (const d of sectionDefs) lines.push(`* ${d.slug} (${d.name}):`, describeFields(d.fields)); lines.push(''); }
      for (const t of singles) lines.push(`Single document "${t.slug}" (${t.name}) fields:`, describeFields(t.fields as unknown as Field[]), '');
      lines.push('Edit paths: "page.<field>" for a page\'s own fields, "<sectionKey>.<field>" for a section (keys come from get_document), "<sectionKey>.<listField>.<index>.<subfield>" for list items. Image and video fields take the address of a file already in the media library. Colour fields take a hex code. Icon fields take "icon:<name>".');
      return text(lines.join('\n'));
    }

    if (name === 'list_documents') {
      const entries = await prisma.entry.findMany({ where: { siteId: auth.siteId }, orderBy: { updatedAt: 'desc' } });
      return json(entries.map((e) => {
        const t = types.find((x) => x.id === e.contentTypeId);
        const sections = Array.isArray((e.data as Record<string, unknown>).sections) ? ((e.data as Record<string, unknown>).sections as unknown[]).length : undefined;
        return { type: t?.slug, kind: t?.kind, slug: e.slug, status: e.status, sections, updatedAt: e.updatedAt };
      }));
    }

    if (name === 'get_document') {
      const f = await findDoc(args);
      if ('error' in f) return text(f.error, true);
      const { rest, sections } = split(f.entry.data as Record<string, unknown>);
      return json({ type: f.type.slug, slug: f.entry.slug, status: f.entry.status, updatedAt: f.entry.updatedAt, fields: rest, ...(f.type.kind === 'page' ? { sections: sections.map((s) => ({ key: s.id, type: s.type, ...s.data })) } : {}) });
    }

    // ---- everything below changes data: drafts only ----
    if (!canWrite) return text(readOnlyMsg, true);

    if (name === 'create_draft_copy') {
      const f = await findDoc({ slug: String(args.slug ?? '') });
      if ('error' in f) return text(f.error, true);
      if (f.type.kind !== 'page') return text('Only pages can be copied.', true);
      const base = String(args.new_slug || `${f.entry.slug}-draft`).toLowerCase();
      if (!/^[a-z0-9-]+$/.test(base)) return text('new_slug may only use lowercase letters, digits and dashes.', true);
      let slug = base;
      for (let n = 2; await prisma.entry.findFirst({ where: { contentTypeId: f.type.id, slug } }); n++) slug = `${base}-${n}`;
      const created = await prisma.entry.create({ data: { siteId: auth.siteId, contentTypeId: f.type.id, slug, data: f.entry.data as object, status: 'DRAFT', publishedAt: null } });
      await recordChange({ entry: created, actor: aiActor });
      return text(`Created the draft "${created.slug}" as a copy of "${f.entry.slug}". It is not live. Edit it with update_draft, and open it in ${adminUrl()} to review and publish.`);
    }

    if (name === 'create_draft_page') {
      if (!pageType) return text('This site has no page type yet.', true);
      const slug = String(args.slug ?? '');
      if (!/^[a-z0-9-]+$/.test(slug)) return text('slug may only use lowercase letters, digits and dashes.', true);
      if (await prisma.entry.findFirst({ where: { contentTypeId: pageType.id, slug } })) return text(`A page with the slug "${slug}" already exists.`, true);
      const docFields = pageType.fields as unknown as Field[];
      const start = applyChanges(docFields, sectionDefs, true, { data: { title: String(args.title ?? '') }, sections: [] }, { add_sections: Array.isArray(args.sections) ? args.sections : [] }, newId);
      const v = validateData(docFields, start.data);
      if (v.errors.length) return text(`Not created: ${v.errors.join('; ')}`, true);
      const created = await prisma.entry.create({ data: { siteId: auth.siteId, contentTypeId: pageType.id, slug, data: { ...v.data, sections: start.sections } as object, status: 'DRAFT', publishedAt: null } });
      await recordChange({ entry: created, actor: aiActor });
      return text(`Created the draft page "${created.slug}".${start.problems.length ? ` Some sections were skipped: ${start.problems.join(' | ')}` : ''} It is not live. Review it in ${adminUrl()}.`);
    }

    if (name === 'update_draft') {
      const f = await findDoc({ slug: String(args.slug ?? '') });
      if ('error' in f) return text(f.error, true);
      if (f.entry.status !== 'DRAFT') return text(`"${f.entry.slug}" is live, so update_draft cannot edit it. Call create_draft_copy with slug "${f.entry.slug}" and edit the copy${auth.perm === 'publish' ? ', or change the live page directly with preview_live_edit then update_live_page (the user must confirm)' : ''}.`, true);
      const { rest, sections } = split(f.entry.data as Record<string, unknown>);
      const docFields = f.type.fields as unknown as Field[];
      const r = applyChanges(docFields, sectionDefs, f.type.kind === 'page', { data: rest, sections }, args, newId);
      if (!r.applied) return text(`Nothing was changed. ${r.problems.join(' | ')}`, true);
      const v = validateData(docFields, r.data);
      if (v.errors.length) return text(`Not saved: ${v.errors.join('; ')}`, true);
      const saved = await prisma.entry.update({ where: { id: f.entry.id }, data: { data: { ...v.data, ...(f.type.kind === 'page' ? { sections: r.sections } : {}) } as object } });
      await recordChange({ entry: saved, before: f.entry, actor: aiActor });
      return text(`Saved ${r.applied} change${r.applied === 1 ? '' : 's'} to the draft "${f.entry.slug}". It is not live.${r.problems.length ? ` These were skipped, fix and resend them: ${r.problems.join(' | ')}` : ''} Review it in ${adminUrl()}.`);
    }

    if (name === 'preview_live_edit' || name === 'update_live_page') {
      if (auth.perm !== 'publish') return text('This key cannot change live pages. Create a key with that permission under Settings › Connect Claude.', true);
      const f = await findDoc({ slug: String(args.slug ?? '') });
      if ('error' in f) return text(f.error, true);
      if (f.type.kind !== 'page') return text('Only pages can be changed this way.', true);
      if (f.entry.status !== 'PUBLISHED') return text(`"${f.entry.slug}" is a draft, so use update_draft.`, true);
      const change = { edits: args.edits, add_sections: args.add_sections, remove_section_keys: args.remove_section_keys };
      const { rest, sections } = split(f.entry.data as Record<string, unknown>);
      const docFields = f.type.fields as unknown as Field[];
      const r = applyChanges(docFields, sectionDefs, true, { data: rest, sections }, change, newId);
      if (r.problems.length) return text(`Not applied. Fix these first: ${r.problems.join(' | ')}`, true);
      if (!r.applied) return text('Nothing would change.', true);
      const v = validateData(docFields, r.data);
      if (v.errors.length) return text(`Not applied: ${v.errors.join('; ')}`, true);
      const edit = 'edit:' + createHash('sha256').update(JSON.stringify(change)).digest('hex').slice(0, 24);

      if (name === 'preview_live_edit') {
        const sectionName = (slug: string) => sectionDefs.find((d) => d.slug === slug)?.name ?? slug;
        const lines = diffDocs(f.entry.data as Record<string, unknown>, { ...v.data, sections: r.sections }, sectionName, f.type.name)
          .map((c) => (c.kind === 'edit' ? `- ${c.where} › ${c.field}: "${c.from || '(empty)'}" → "${c.to || '(empty)'}"` : c.kind === 'add' ? `- Add section: ${c.where}` : `- Remove section: ${c.where}`));
        return text([
          'PREVIEW ONLY. Nothing has been changed.',
          `These changes would go LIVE immediately on "${f.entry.slug}":`,
          ...lines,
          '',
          `NEXT: show the user this summary and ask "Apply this to the live page now?". Only if they clearly say yes, call update_live_page with slug "${f.entry.slug}", exactly the same edits / add_sections / remove_section_keys, token "${previewToken(f.entry, edit)}" and their confirmation in user_confirmation. Their AI app will also ask them to allow that call. The token works for 10 minutes and only for these exact changes to this exact version of the page.`,
        ].join('\n'));
      }

      const said = String(args.user_confirmation ?? '').trim();
      if (said.length < 2) return text('Ask the user to confirm first, then pass their answer as user_confirmation.', true);
      if (!tokenValid(f.entry, edit, String(args.token ?? ''))) return text('That token is missing, has expired (10 minutes), or the changes or the page are not the ones previewed. Call preview_live_edit again, show the user the new summary and get their OK.', true);
      const live = await prisma.entry.update({ where: { id: f.entry.id }, data: { data: { ...v.data, sections: r.sections } as object } });
      await recordChange({ entry: live, before: f.entry, action: 'edited', actor: aiActor });
      app.log.info({ liveEdit: { site: auth.siteId, page: f.entry.slug, via: 'AI tool, confirmed by the user in the AI app' } }, 'live page changed');
      return text(`Done. ${r.applied} change${r.applied === 1 ? '' : 's'} applied to the LIVE page "${f.entry.slug}". (User confirmation: "${said.slice(0, 120)}")`);
    }

    if (name === 'preview_publish' || name === 'publish_page') {
      if (auth.perm !== 'publish') return text('This key cannot publish. Create a key with that permission under Settings › Connect Claude.', true);
      const f = await findDoc({ slug: String(args.slug ?? '') });
      if ('error' in f) return text(f.error, true);
      if (f.type.kind !== 'page') return text('Only pages can be published this way.', true);
      if (f.entry.status !== 'DRAFT') return text(`"${f.entry.slug}" is already live.`, true);
      let replaces = '';
      if (args.replaces) {
        replaces = String(args.replaces);
        const target = await prisma.entry.findFirst({ where: { siteId: auth.siteId, contentTypeId: f.type.id, slug: replaces } });
        if (!target) return text(`There is no page "${replaces}" to replace.`, true);
        if (target.id === f.entry.id) return text('A page cannot replace itself.', true);
      }
      const problems = await draftProblems(auth.siteId, f.entry);
      if (problems.length) return text(`It is not ready to publish: ${problems.join('; ')}. Fix it with update_draft first.`, true);

      if (name === 'preview_publish') {
        const { changes } = await previewDraft(auth.siteId, f.entry, replaces);
        const lines = changes.map((c) => (c.kind === 'edit' ? `- ${c.where} › ${c.field}: "${c.from || '(empty)'}" → "${c.to || '(empty)'}"` : c.kind === 'add' ? `- Add section: ${c.where}` : `- Remove section: ${c.where}`));
        return text([
          'PREVIEW ONLY. Nothing has been published.',
          replaces ? `Publishing "${f.entry.slug}" would REPLACE the live page "${replaces}" with this content.` : `Publishing "${f.entry.slug}" would make it live as its own page at "${f.entry.slug}".`,
          '',
          lines.length ? 'Changes:' : 'No differences from the live page.',
          ...lines,
          '',
          `NEXT: show the user this summary and ask "Publish this live now?". Only if they clearly say yes, call publish_page with slug "${f.entry.slug}"${replaces ? `, replaces "${replaces}"` : ''}, token "${previewToken(f.entry, replaces)}" and their confirmation in user_confirmation. Their AI app will also ask them to allow that call. The token works for 10 minutes and only for this exact version of the draft.`,
        ].join('\n'));
      }

      const said = String(args.user_confirmation ?? '').trim();
      if (said.length < 2) return text('Ask the user to confirm first, then pass their answer as user_confirmation.', true);
      if (!tokenValid(f.entry, replaces, String(args.token ?? ''))) return text('That token is missing, has expired (10 minutes), or the draft changed after the preview. Call preview_publish again, show the user the new summary and get their OK.', true);
      const done = await publishDraft(auth.siteId, f.entry, replaces, aiActor);
      if (!done.ok) return text(done.error, true);
      app.log.info({ publish: { site: auth.siteId, page: done.published, via: 'AI tool, confirmed by the user in the AI app' } }, 'page published');
      return text(`Published. "${done.published}" is now LIVE on the website. (User confirmation: "${said.slice(0, 120)}")`);
    }

    return text(`Unknown tool "${name}".`, true);
  }

  // Claude is not a web page, so a request that carries an Origin (a browser) is refused outright.
  const handle = async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.headers.origin) return reply.code(403).send({ error: 'Not allowed from a web page.' });
    const auth = await authenticate(req);
    if (!auth) return reply.code(401).header('www-authenticate', 'Bearer').send({ error: 'Missing or invalid key. Create one under Settings › Connect AI tools.' });

    const msg = req.body as { jsonrpc?: string; id?: number | string; method?: string; params?: any };
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return reply.code(400).send({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } });
    const ok = (result: unknown) => reply.send({ jsonrpc: '2.0', id: msg.id, result });
    const fail = (code: number, message: string) => reply.send({ jsonrpc: '2.0', id: msg.id ?? null, error: { code, message } });

    // notifications have no id and get no reply body
    if (msg.id === undefined) return reply.code(202).send();

    switch (msg.method) {
      case 'initialize': {
        const asked = msg.params?.protocolVersion;
        return ok({ protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'synx-brain', version: '0.1.0' }, instructions: auth.all ? 'Synx Brain CMS, all sites. Start with list_sites, then pass the site name in the "site" argument of every other tool. Then get_site, list_documents and get_document. Anything that changes a live page needs the user\'s confirmation.' : 'Synx Brain CMS. Start with get_site, then list_documents and get_document. Anything that changes a live page needs the user\'s confirmation.' });
      }
      case 'ping': return ok({});
      case 'tools/list': {
        const allowed = auth.perm === 'read' ? tools.filter((t) => t.annotations.readOnlyHint && !PUBLISH_TOOLS.includes(t.name)) : auth.perm === 'draft' ? tools.filter((t) => !PUBLISH_TOOLS.includes(t.name)) : tools;
        if (!auth.all) return ok({ tools: allowed });
        // the all-sites key: every tool also takes a "site"
        const withSite = allowed.map((t) => ({ ...t, inputSchema: { ...t.inputSchema, properties: { site: siteArg, ...(t.inputSchema as { properties: object }).properties }, required: ['site', ...(((t.inputSchema as { required?: string[] }).required) ?? [])] } }));
        return ok({ tools: [listSitesTool, ...withSite] });
      }
      case 'tools/call': {
        const name = String(msg.params?.name ?? '');
        const isList = name === 'list_sites' && auth.all;
        if (!isList && (!tools.some((t) => t.name === name) || (auth.perm !== 'publish' && PUBLISH_TOOLS.includes(name)))) return fail(-32602, `Unknown tool: ${name}`);
        try {
          const given = (msg.params?.arguments ?? {}) as Record<string, any>;
          if (isList) {
            const sites = await prisma.site.findMany({ orderBy: { createdAt: 'asc' } });
            const out = [];
            for (const x of sites) {
              const [types, pages] = await Promise.all([prisma.contentType.count({ where: { siteId: x.id } }), prisma.entry.count({ where: { siteId: x.id, contentType: { kind: 'page' } } })]);
              out.push({ site: x.name, slug: x.slug, pages, ready: types > 0 ? 'has content types' : 'empty: no content types yet' });
            }
            return ok(json(out));
          }
          const where = await pickSite(auth, given.site);
          if ('error' in where) return ok(text(where.error, true));
          const { site: _ignored, ...args } = given;
          app.log.info({ mcp: { site: where.siteId, tool: name } }, 'Claude tool call');
          return ok(await run(name, args, { siteId: where.siteId, perm: auth.perm, label: auth.label }));
        } catch (e) {
          app.log.error(e);
          return ok(text('Something went wrong on the server. Try again.', true));
        }
      }
      default: return fail(-32601, `Method not found: ${msg.method}`);
    }
  };
  app.post('/mcp', { bodyLimit: 2 * 1024 * 1024 }, handle);
  app.post('/mcp/k/:key', { bodyLimit: 2 * 1024 * 1024 }, handle);

  // no server-to-client stream and no sessions to end
  app.get('/mcp/k/:key', async (_req, reply) => reply.code(405).header('allow', 'POST').send({ error: 'Use POST.' }));
  app.get('/mcp', async (_req, reply) => reply.code(405).header('allow', 'POST').send({ error: 'Use POST.' }));
  app.delete('/mcp', async (_req, reply) => reply.code(405).header('allow', 'POST').send({ error: 'Use POST.' }));
}

/**
 * Sets up the RTW site in the CMS: the content structure (rtw-schema.ts) and all its content, read straight from the
 * RealTimeWeb.org prototype so nothing is retyped.
 *
 *   npm run seed:rtw -w apps/api            (the API must be running; AUTH_DISABLED in dev)
 *
 * Documentation pages come from content/docs/**.mdx, the Journals articles from lib/blog.ts and the article components in
 * components/blog (read with the TypeScript compiler, so the text, links, hints, figures and diagram names come across).
 * Safe to run again: types and documents are matched by slug and updated, pictures are uploaded once.
 * Env: CMS_URL (default http://localhost:4000), RTW_LP (default ../../../../../therealwebpoc next to the repo), RTW_SITE (slug, default rtw)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { rtwTypes } from './rtw-schema.js';

const CMS = process.env.CMS_URL ?? 'http://localhost:4000';
const LP = resolve(process.env.RTW_LP ?? resolve(import.meta.dirname, '../../../../../therealwebpoc'));
const SITE_SLUG = process.env.RTW_SITE ?? 'rtw';

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(CMS + path, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: init.body ? { 'content-type': 'application/json' } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 700)}`);
  return (text ? JSON.parse(text) : null) as T;
}
const load = async <T>(rel: string): Promise<T> => import(pathToFileURL(resolve(LP, rel)).href);

/* ------------------------------------------------------------------ site, types */
type Site = { id: string; slug: string; name: string };
type Type = { id: string; slug: string };
type Entry = { id: string; slug: string | null; contentTypeId: string };

const sites = await call<Site[]>('/sites');
const site = sites.find((s) => s.slug === SITE_SLUG);
if (!site) throw new Error(`No site with the slug "${SITE_SLUG}"`);
const base = `/sites/${site.id}`;
console.log(`Site: ${site.name} (${site.id})`);

const existingTypes = await call<Type[]>(`${base}/types`);
for (const def of rtwTypes) {
  const have = existingTypes.find((t) => t.slug === def.slug);
  if (have) await call(`${base}/types/${have.id}`, { method: 'PUT', body: def });
  else await call(`${base}/types`, { body: def });
}
const types = await call<Type[]>(`${base}/types`);
const typeId = (slug: string) => types.find((t) => t.slug === slug)!.id;
console.log(`Structure: ${rtwTypes.length} types ready`);

/* ------------------------------------------------------------------ pictures */
type Media = { originalName: string; url: string };
const media = new Map((await call<Media[]>(`${base}/media`)).map((m) => [m.originalName, m.url]));
const mime: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

/** Uploads a file from the RTW public folder once and returns its CMS address. "/blog/x.png" is stored as "blog-x.png". */
async function up(publicPath: string | undefined): Promise<string | undefined> {
  if (!publicPath) return undefined;
  const name = publicPath.replace(/^\//, '').replace(/\//g, '-');
  const have = media.get(name);
  if (have) return have;
  const ext = name.split('.').pop()!.toLowerCase();
  if (!mime[ext]) { console.warn(`  skipped ${publicPath}: ${ext} files cannot be uploaded`); return undefined; }
  let bytes: Buffer;
  try { bytes = await readFile(resolve(LP, 'public', publicPath.replace(/^\//, ''))); } catch { console.warn(`  missing file ${publicPath}`); return undefined; }
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mime[ext] }), name);
  const res = await fetch(`${CMS}${base}/media`, { method: 'POST', body: form });
  if (!res.ok) { console.warn(`  could not upload ${publicPath}: ${res.status} ${(await res.text()).slice(0, 120)}`); return undefined; }
  const m = (await res.json()) as Media;
  media.set(name, m.url);
  console.log(`  uploaded ${publicPath}`);
  return m.url;
}

/* ------------------------------------------------------------------ entries */
let existing = await call<Entry[]>(`${base}/entries`);
async function put(typeSlug: string, slug: string | null, data: Record<string, unknown>, status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED') {
  const tid = typeId(typeSlug);
  const have = existing.find((e) => e.contentTypeId === tid && (slug === null || e.slug === slug));
  const saved = have
    ? await call<Entry>(`${base}/entries/${have.id}`, { method: 'PUT', body: { slug, data, status } })
    : await call<Entry>(`${base}/entries`, { body: { slug, data, status, contentTypeId: tid } });
  if (!have) existing = [...existing, saved];
  return have ? 'updated' : 'added';
}
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''));
let n = 0;
const sec = (type: string, data: Record<string, unknown>) => ({ id: `${type}-${++n}`, type, data });

/* ================================================================== documentation (MDX) */
type Block = Record<string, unknown>;

function frontmatter(raw: string) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  const data: Record<string, string> = {};
  if (!m) return { data, content: raw };
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { data, content: m[2] };
}

/** An MDX body becomes blocks: runs of markdown, and one block for each diagram or note component on a line of its own. */
function mdxBlocks(content: string): Block[] {
  const lines = content.split(/\r?\n/);
  const blocks: Block[] = [];
  let md: string[] = [];
  const flush = () => {
    const t = md.join('\n').trim();
    if (t) blocks.push({ type: 'markdown', text: t });
    md = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = /^<([A-Z][A-Za-z0-9]*)\b([^>]*?)(\/?)>\s*$/.exec(line.trim());
    if (open && open[1] !== 'GlossaryTerm') {
      const [, tag, attrs, selfClose] = open;
      const attr = (k: string) => new RegExp(`${k}="([^"]*)"`).exec(attrs)?.[1];
      let inner = '';
      if (!selfClose) {
        const body: string[] = [];
        for (i++; i < lines.length && lines[i].trim() !== `</${tag}>`; i++) body.push(lines[i].trim());
        inner = body.filter(Boolean).join(' ');
      }
      flush();
      if (tag === 'SpecStatus') blocks.push(clean({ type: 'spec-status', status: attr('status'), text: inner }));
      else if (tag === 'EcosystemLink') blocks.push(clean({ type: 'ecosystem-link', to: attr('to'), text: inner }));
      else if (tag === 'ClarificationBanner') blocks.push({ type: 'clarification' });
      else if (tag === 'GlossaryTable') blocks.push({ type: 'glossary-table' });
      else blocks.push({ type: 'diagram', diagram: tag });
      continue;
    }
    md.push(line);
  }
  flush();
  return blocks;
}

function walkDocs(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walkDocs(p) : p.endsWith('.mdx') ? [p] : [];
  });
}

const { nav } = await load<{ nav: { title: string; items: { title: string; href: string; status?: string; chapter?: string; nested?: boolean }[] }[] }>('lib/navigation.ts');
const navFor = new Map<string, { group: string; chapter?: string; title: string; order: number; nested: boolean }>();
let navOrder = 0;
for (const g of nav) for (const it of g.items) navFor.set(it.href.replace(/^\/(docs|hood)\/?/, '').replace(/\/$/, ''), { group: g.title, chapter: it.chapter, title: it.title, order: ++navOrder, nested: !!it.nested });

console.log('Documentation');
const docRoot = resolve(LP, 'content/docs');
const docFiles = walkDocs(docRoot).sort();
let docCount = 0;
for (const file of docFiles) {
  const rel = file.slice(docRoot.length + 1).replace(/\\/g, '/').replace(/\.mdx$/, '');
  const parts = rel === 'index' ? [] : rel.endsWith('/index') ? rel.slice(0, -6).split('/') : rel.split('/');
  const path = parts.join('/');
  const slug = parts.length ? parts.join('--') : 'overview';
  const { data, content } = frontmatter(readFileSync(file, 'utf8'));
  const place = navFor.get(path);
  const r = await put('doc', slug, clean({
    title: data.title, description: data.description, status: data.status || 'published', path,
    group: place?.group, chapter: place?.chapter, navTitle: place?.title, order: place?.order ?? 999 + docCount, nested: place?.nested ?? false,
    body: mdxBlocks(content),
  }));
  docCount++;
  console.log(`  ${r} doc / ${slug}`);
}

/* ================================================================== Journals (blog) */
const src = (rel: string) => ts.createSourceFile(rel, readFileSync(resolve(LP, rel), 'utf8'), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const tagOf = (el: ts.JsxElement | ts.JsxSelfClosingElement) => (ts.isJsxElement(el) ? el.openingElement.tagName.getText() : el.tagName.getText());
const attrsOf = (el: ts.JsxElement | ts.JsxSelfClosingElement) => {
  const list = ts.isJsxElement(el) ? el.openingElement.attributes.properties : el.attributes.properties;
  const out: Record<string, string> = {};
  for (const a of list) {
    if (!ts.isJsxAttribute(a) || !a.initializer) continue;
    const name = a.name.getText();
    const init = a.initializer;
    if (ts.isStringLiteral(init)) out[name] = init.text;
    else if (ts.isJsxExpression(init) && init.expression && (ts.isStringLiteral(init.expression) || ts.isNoSubstitutionTemplateLiteral(init.expression))) out[name] = init.expression.text;
    else if (ts.isJsxExpression(init) && init.expression) out[name] = init.expression.getText();
  }
  return out;
};
const childrenOf = (el: ts.JsxElement | ts.JsxSelfClosingElement): readonly ts.JsxChild[] => (ts.isJsxElement(el) ? el.children : []);

/** JSX text rule: lines are trimmed and joined by one space, and whitespace that contains a line break at an edge is dropped. */
function jsxText(raw: string) {
  const lines = raw.split(/\r?\n/);
  let out = '';
  lines.forEach((l, i) => {
    let t = l.replace(/\t/g, ' ');
    if (i !== 0) t = t.trimStart();
    if (i !== lines.length - 1) t = t.trimEnd();
    if (t) out += (out && !out.endsWith(' ') && i > 0 ? ' ' : '') + t;
  });
  return out;
}

function inline(children: readonly ts.JsxChild[]): string {
  let out = '';
  for (const c of children) {
    if (ts.isJsxText(c)) out += jsxText(c.text);
    else if (ts.isJsxExpression(c)) {
      const e = c.expression;
      if (e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e))) out += e.text;
    } else if (ts.isJsxSelfClosingElement(c)) {
      if (tagOf(c) === 'br') out += '\n';
    } else if (ts.isJsxElement(c)) {
      const tag = tagOf(c);
      const a = attrsOf(c);
      const inner = inline(c.children);
      if (tag === 'TermHint') out += `<GlossaryTerm id="${a.id}">${inner}</GlossaryTerm>`;
      else if (tag === 'Link' || tag === 'a') out += `[${inner}](${a.href})`;
      else if (tag === 'strong' || tag === 'b') out += `**${inner}**`;
      else if (tag === 'em' || tag === 'i') out += `*${inner}*`;
      else if (tag === 'code') out += `\`${inner}\``;
      else out += inner;
    }
  }
  return out.replace(/ +\n/g, '\n').trim();
}

const POSTS: Record<string, [string, string]> = {
  'the-last-it-project': ['LastITProject', 'LastITProject'],
  'smart-shoes': ['SmartShoes', 'SmartShoes'],
  'smart-umbrella': ['SmartUmbrella', 'SmartUmbrella'],
  'playing-with-oranges': ['PlayingWithOranges', 'PlayingWithOranges'],
  'scan-and-post-wifi': ['ScanWifi', 'ScanWifi'],
  'link-the-fridge': ['LinkTheFridge', 'LinkTheFridge'],
  'twenty-four-hours-at-ntnu': ['TwentyFourHoursNtnu', 'TwentyFourHoursNtnu'],
  'how-a-user-joins': ['ParticipationExplainer', 'ParticipationExplainer'],
  'two-webs': ['TwoWebs', 'TwoWebs'],
  'autonomous-machine-networks': ['AutonomousMachines', 'AutonomousMachines'],
  'internet-for-machines': ['InternetForMachines', 'InternetForMachines'],
};

async function articleBlocks(slug: string): Promise<{ blocks: Block[]; skipped: string[] }> {
  const [file, fn] = POSTS[slug];
  const sf = src(`components/blog/${file}.tsx`);
  const skipped: string[] = [];
  const blocks: Block[] = [];
  let root: ts.JsxElement | undefined;
  sf.forEachChild(function find(node) {
    if (root) return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === fn && node.body) {
      const ret = node.body.statements.find(ts.isReturnStatement);
      let e: ts.Expression | undefined = ret?.expression;
      while (e && ts.isParenthesizedExpression(e)) e = e.expression;
      if (e && ts.isJsxElement(e)) root = e;
    }
  });
  if (!root) throw new Error(`No component ${fn} in ${file}`);

  const faqText = (children: readonly ts.JsxChild[]) =>
    children.flatMap((c) => (ts.isJsxElement(c) ? (tagOf(c) === 'p' ? [inline(c.children)] : [inline(c.children)]) : [])).filter(Boolean).join('\n\n');

  async function walk(children: readonly ts.JsxChild[]) {
    for (const c of children) {
      if (!ts.isJsxElement(c) && !ts.isJsxSelfClosingElement(c)) continue;
      const tag = tagOf(c);
      const a = attrsOf(c);
      const kids = childrenOf(c);
      if (tag === 'p') blocks.push({ type: 'p', text: inline(kids) });
      else if (tag === 'h2' || tag === 'h3') blocks.push({ type: tag, text: inline(kids) });
      else if (tag === 'ul' || tag === 'ol') {
        const items = kids.filter(ts.isJsxElement).filter((li) => tagOf(li) === 'li').map((li, i) => `${tag === 'ol' ? `${i + 1}.` : '-'} ${inline(li.children)}`);
        blocks.push({ type: 'list', text: items.join('\n') });
      } else if (tag === 'blockquote') blocks.push({ type: 'quote', text: kids.filter(ts.isJsxElement).map((k) => inline(k.children)).join('\n\n') || inline(kids) });
      else if (tag === 'Figure') blocks.push(clean({ type: 'figure', image: await up(a.src), alt: a.alt, caption: a.caption, fit: a.fit }));
      else if (tag === 'VideoEmbed') blocks.push(clean({ type: 'video', videoId: a.videoId, title: a.title, caption: a.caption }));
      else if (tag === 'Faq') blocks.push({ type: 'faq', question: a.question, text: faqText(kids) });
      else if (tag === 'ContributorInvite' || tag === 'AuthorByline' || tag === 'aside') continue;
      else if (tag === 'div') {
        const cls = a.className ?? '';
        const text = c.getText();
        if (cls.includes('border-t') && text.includes('/blog')) continue; // the "all articles" links at the foot of an article
        if (cls.includes('diagram-block')) {
          // a small table of cards written in the article itself
          const arr = (function find(n: ts.Node): ts.ArrayLiteralExpression | undefined { return ts.isArrayLiteralExpression(n) ? n : ts.forEachChild(n, find); })(c);
          const caption = kids.filter(ts.isJsxElement)[0] ? inline(kids.filter(ts.isJsxElement)[0].children) : '';
          if (arr) {
            const rows = arr.elements.filter(ts.isObjectLiteralExpression).map((o) => {
              const get = (k: string) => { const p = o.properties.find((x) => ts.isPropertyAssignment(x) && x.name.getText() === k) as ts.PropertyAssignment | undefined; return p && ts.isStringLiteral(p.initializer) ? p.initializer.text : ''; };
              return [get('kicker'), get('name'), get('role'), get('action')].join(' | ');
            });
            blocks.push({ type: 'cards', caption, text: rows.join('\n') });
            continue;
          }
        }
        await walk(kids);
      } else if (/^[A-Z]/.test(tag) && !kids.length) blocks.push({ type: 'diagram', diagram: tag });
      else skipped.push(tag);
    }
  }
  await walk(root.children);
  return { blocks, skipped };
}

console.log('Authors');
const { PAAL, THIRU } = await load<{ PAAL: Record<string, string>; THIRU: Record<string, string> }>('lib/authors.ts');
let order = 0;
for (const a of [PAAL, THIRU]) {
  const r = await put('author', a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), { name: a.name, role: a.role, image: await up(a.image), linkedin: a.linkedin, order: ++order });
  console.log(`  ${r} author / ${a.name}`);
}

console.log('Journals');
const { posts, archivedPosts } = await load<{ posts: any[]; archivedPosts: any[] }>('lib/blog.ts');
for (const [list, archived] of [[posts, false], [archivedPosts, true]] as const) {
  for (const p of list) {
    let body: Block[];
    if (POSTS[p.slug]) {
      const r = await articleBlocks(p.slug);
      body = r.blocks;
      if (r.skipped.length) console.warn(`  ${p.slug}: not carried over (${[...new Set(r.skipped)].join(', ')})`);
    } else {
      body = (p.body as string[]).map((text) => ({ type: 'p', text }));
    }
    const res = await put('post', p.slug, clean({
      title: p.title, excerpt: p.excerpt, date: p.date, category: p.category, readingMinutes: p.readingMinutes, archived,
      cover: await up(p.cover), coverAlt: p.coverAlt, author: p.author, authorRole: p.authorRole, authorImage: await up(p.authorImage), body,
    }), archived ? 'DRAFT' : 'PUBLISHED');
    console.log(`  ${res} post / ${p.slug} (${body.length} blocks${archived ? ', held out of Journals' : ''})`);
  }
}

/* ================================================================== glossary */
console.log('Glossary');
const gsrc = readFileSync(resolve(LP, 'components/Glossary.tsx'), 'utf8');
const start = gsrc.indexOf('export const glossary: Term[] = [');
const arrStart = gsrc.indexOf('[', start + 'export const glossary: Term[] ='.length - 1);
let depth = 0, end = arrStart;
for (let i = arrStart; i < gsrc.length; i++) { const ch = gsrc[i]; if (ch === '[') depth++; else if (ch === ']' && --depth === 0) { end = i; break; } }
const glossary = new Function(`return ${gsrc.slice(arrStart, end + 1)}`)() as { id: string; term: string; def: string; href?: string }[];
let go = 0;
for (const g of glossary) {
  await put('glossary-term', g.id, clean({ term: g.term, termId: g.id, def: g.def, href: g.href, order: ++go }));
}
console.log(`  ${glossary.length} terms`);

/* ================================================================== pages and shared documents */
console.log('Pages');
const homeImage = await up('/hero-dispatch.png');
const pages: [string, string, string, unknown[]][] = [
  ['home', 'Real Time Web', 'An architecture for interconnected real time digital spaces. Public documentation for architects, developers, researchers, and partners.', [
    sec('landing-hero', {
      kicker: 'THE REAL TIME WEB', title: 'The network worth\n*owning*.',
      lede: 'A live web for people, devices, services, and ideas, where what you create stays yours, and the network keeps growing around it.',
      ctaLabel: 'Explore Real Time Web', ctaUrl: '/docs', image: homeImage, imageAlt: '',
    }),
  ]],
  ['blog', 'Journals', 'Essays and field notes on ownership, presence, and the rooms we want to inhabit.', [
    sec('page-intro', { kicker: 'Journals', title: 'Worlds worth keeping', lede: 'Essays and field notes on ownership, presence, and the rooms we want to inhabit.' }),
  ]],
  ['contact', 'Contact us', 'Contact Real Time Web for technical, commercial, media, and related inquiries.', [
    sec('page-intro', {
      kicker: 'Contact', title: 'Contact us',
      lede: 'Please use the contact form below for any inquiries you may have regarding Real Time Web. We will get back to you as soon as possible.',
    }),
    sec('contact-form', {
      nameLabel: 'Name', emailLabel: 'Email', reasonLabel: 'Reason', messageLabel: 'Message', sendLabel: 'Send', sendingLabel: 'Sending…',
      errorText: 'Could not send. Try again in a moment.',
      topics: ['Technical', 'Commercial', 'Media', 'Investors', 'Industrial partners', 'Inventors and creators of the new earth'].map((text) => ({ text })),
    }),
  ]],
  ['hood', 'Under revision', 'This section is being revised.', [
    sec('under-revision', { kicker: 'UNDER THE HOOD', title: 'Under revision', text: 'This section is being revised.' }),
  ]],
];
for (const [slug, title, description, sections] of pages) console.log(`  ${await put('pages', slug, { title, description, sections })} page / ${slug}`);

console.log('Shared');
await put('header', null, {
  brand: 'REAL TIME WEB',
  links: [
    { label: 'About RTW', url: '/docs' }, { label: 'Journals', url: '/blog' },
    { label: 'Under the hood', url: '/hood/implementation/blueprint' }, { label: 'Contact', url: '/contact' },
  ],
});
await put('footer', null, {
  brand: 'REAL TIME WEB',
  about: 'A standalone nonprofit site. It explains what the Real Time Web is, why it exists, and introduces Morphic Architecture Design.',
  column1Title: 'About RTW',
  column1Links: [
    { label: 'Overview', url: '/docs' }, { label: 'What and why', url: '/docs/introduction' }, { label: 'Morphic Architecture', url: '/docs/architecture' },
    { label: 'Infrastructure', url: '/docs/architecture/infrastructure' }, { label: 'FAQ', url: '/docs/reference/faq' },
  ],
  column2Title: 'Also here',
  column2Links: [
    { label: 'Journals', url: '/blog' }, { label: 'Under the hood', url: '/hood/implementation/blueprint' }, { label: 'Contact', url: '/contact' },
    { label: 'Vision', url: '/docs/introduction/vision' }, { label: 'The Internet of tomorrow', url: '/docs/introduction/tomorrow' },
  ],
  column3Title: 'Status',
  column3Lines: ['Architecture: public', 'Under the hood: how live channels work', 'Not owned by a company'].map((text) => ({ text })),
  copyright: 'Copyright © 2026 Real Time Web org. 836 603 362',
});
await put('website-settings', null, {
  siteName: 'Real Time Web', siteUrl: 'https://realtimeweb.org', titleTemplate: '%s · Real Time Web',
  description: 'An architecture for interconnected real time digital spaces. Public documentation for architects, developers, researchers, and partners.',
  shareDescription: 'An architecture for interconnected real time digital spaces.',
  sansFont: 'Instrument Sans', serifFont: 'Instrument Serif', monoFont: 'IBM Plex Mono', displayFont: 'Syne', pixelFont: 'Pixelify Sans',
  darkBackground: '#090a0c', darkPanel: '#111316', darkText: '#ece8e1', darkMuted: '#9a948a', darkAccent: '#8ed9c8', darkWarn: '#d4b37a',
  lightBackground: '#f4f1ea', lightPanel: '#fbf8f2', lightText: '#1a1713', lightMuted: '#6a645c', lightAccent: '#0f5c52', lightWarn: '#8a6a2f',
});
await put('reader-notes', null, {
  specStatus: [
    { status: 'published', label: 'Documented', text: 'This page is drawn from the current RealTimeWeb.org source.' },
    { status: 'draft', label: 'Architecture proposal', text: 'Marked as draft in the source. Needs team review before publishing as final copy.' },
    { status: 'pending', label: 'Specification under development', text: 'Listed as a planned section. Body copy has not been provided yet.' },
    { status: 'proposal', label: 'Implementation details coming soon', text: 'The conceptual model is documented. Protocol-level detail is not specified in the source.' },
  ],
  ecosystemLinks: [
    { to: 'introduction', kicker: 'What', title: 'Want to understand what the Real Time Web is?', url: '/docs/introduction', label: 'Read the introduction' },
    { to: 'architecture', kicker: 'MAD', title: 'Want an introduction to Morphic Architecture Design?', url: '/docs/architecture', label: 'Read Morphic Architecture' },
    { to: 'specification', kicker: 'Under the hood', title: 'Want to see how live channels work?', url: '/docs/introduction/how-it-works', label: 'Read how it works' },
    { to: 'implementation', kicker: 'Under the hood', title: 'Want to see how live channels work?', url: '/hood/implementation/blueprint', label: 'Read the blueprint' },
  ],
  clarification: [
    { text: 'RealTimeWeb.org is a standalone nonprofit site. It explains what the Real Time Web is, why it exists, and introduces Morphic Architecture Design (MAD).' },
    { text: 'The site is independent. The idea can be built by more than one party.' },
  ],
  journalsKicker: 'Continue reading', journalsBack: '← All articles',
});

console.log('Done.');

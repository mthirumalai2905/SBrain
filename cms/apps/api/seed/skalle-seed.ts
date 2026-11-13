/**
 * Sets up the Skalle site in the CMS: the content structure (skalle-schema.ts) and all its content, read straight from the
 * Skalle website source so nothing is retyped.
 *
 *   npm run seed:skalle -w apps/api            (the API must be running; AUTH_DISABLED in dev)
 *
 * Safe to run again: types and documents are matched by slug and updated, pictures are uploaded once.
 * Env: CMS_URL (default http://localhost:4000), SKALLE_LP (default ../../../skalleaiLP next to the repo), SKALLE_SITE (slug, default skalle)
 */
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { skalleTypes } from './skalle-schema.js';

const CMS = process.env.CMS_URL ?? 'http://localhost:4000';
const LP = resolve(process.env.SKALLE_LP ?? resolve(import.meta.dirname, '../../../../../skalleaiLP'));
const SITE_SLUG = process.env.SKALLE_SITE ?? 'skalle';

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(CMS + path, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: init.body ? { 'content-type': 'application/json' } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 600)}`);
  return (text ? JSON.parse(text) : null) as T;
}

const load = async <T>(rel: string): Promise<T> => import(pathToFileURL(resolve(LP, 'src', rel)).href);

/* ------------------------------------------------------------------ site, types */
type Site = { id: string; slug: string; name: string };
type Type = { id: string; slug: string; kind: string };
type Entry = { id: string; slug: string | null; contentTypeId: string };

const sites = await call<Site[]>('/sites');
const site = sites.find((s) => s.slug === SITE_SLUG);
if (!site) throw new Error(`No site with the slug "${SITE_SLUG}"`);
const base = `/sites/${site.id}`;
console.log(`Site: ${site.name} (${site.id})`);

const existingTypes = await call<Type[]>(`${base}/types`);
for (const def of skalleTypes) {
  const have = existingTypes.find((t) => t.slug === def.slug);
  if (have) await call(`${base}/types/${have.id}`, { method: 'PUT', body: def });
  else await call(`${base}/types`, { body: def });
}
const types = await call<Type[]>(`${base}/types`);
const typeId = (slug: string) => types.find((t) => t.slug === slug)!.id;
console.log(`Structure: ${skalleTypes.length} types ready`);

/* ------------------------------------------------------------------ pictures */
type Media = { originalName: string; url: string };
const media = new Map((await call<Media[]>(`${base}/media`)).map((m) => [m.originalName, m.url]));
const mime: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };

/** Uploads a file from the Skalle public folder once and returns its CMS address. "/brand/skalle.png" is stored as "brand-skalle.png". */
async function up(publicPath: string | undefined): Promise<string | undefined> {
  if (!publicPath) return undefined;
  const name = publicPath.replace(/^\//, '').replace(/\//g, '-');
  const have = media.get(name);
  if (have) return have;
  const ext = name.split('.').pop()!.toLowerCase();
  if (!mime[ext]) { console.warn(`  skipped ${publicPath}: ${ext} files cannot be uploaded`); return undefined; }
  const bytes = await readFile(resolve(LP, 'public', publicPath.replace(/^\//, '')));
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
async function put(typeSlug: string, slug: string | null, data: Record<string, unknown>) {
  const tid = typeId(typeSlug);
  const have = existing.find((e) => e.contentTypeId === tid && (slug === null || e.slug === slug));
  const body = { slug, data, status: 'PUBLISHED' as const, contentTypeId: tid };
  const saved = have ? await call<Entry>(`${base}/entries/${have.id}`, { method: 'PUT', body: { slug, data, status: 'PUBLISHED' } }) : await call<Entry>(`${base}/entries`, { body });
  if (!have) existing = [...existing, saved];
  console.log(`  ${have ? 'updated' : 'added'} ${typeSlug}${slug ? ' / ' + slug : ''}`);
}

/* ------------------------------------------------------------------ small helpers for the data */
let n = 0;
const sec = (type: string, data: Record<string, unknown>) => ({ id: `${type}-${++n}`, type, data });
const items = <T extends string>(list: readonly T[]) => list.map((text) => ({ text }));
const paras = (...list: string[]) => list.map((text) => ({ text }));
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/* ------------------------------------------------------------------ content from the Skalle source */
const { site: S } = await load<{ site: any }>('content/site.ts');
const { articles, paperName } = await load<{ articles: any[]; paperName: string }>('content/articles.ts');
const { shelf, pdfHref } = await load<{ shelf: any[]; pdfHref: (slug: string) => string }>('content/chronicles-catalog.ts');

const nav = [
  { label: 'System', url: '/system' },
  { label: 'Research', url: '/research' },
  { label: 'Lab', url: '/lab' },
  { label: 'Architecture', url: '/architecture' },
  { label: 'Careers', url: '/careers' },
  { label: 'Chronicles', url: '/chronicles' },
  { label: 'Articles', url: '/articles' },
];
const OPEN = 'Open Skalle ↗';

const cardItems = (list: { name: string; body: string }[]) => list.map((x) => ({ title: x.name, body: x.body }));

/* ---------------- home */
const homeSections = [
  sec('home-hero', {
    index: '/01', kicker: 'Skalle AI', lede: S.heroLede, title: 'Skalle\nIntelligence',
    openLabel: OPEN, openUrl: S.exploreHref, specsLabel: 'Read the specs', systemLabel: 'Read the system', systemUrl: '/system',
    figure: await up('/brand/skalle-center.png'), figureAlt: 'Skalle, a gentleman robot in a dark overcoat, hands at his chest.',
    meta: [{ k: 'Intelligence', v: 'Your model' }, { k: 'Product', v: 'Skalle AI' }, { k: 'Network', v: 'Real Time Web' }],
  }),
  sec('statement', { text: S.statement }),
  sec('chassis-bento', {
    tag: 'PLT', kicker: 'Early chassis', word: 'SKALLE',
    idMeta: items(['Build bay', 'Chassis 00', 'SKL / RTW']),
    note: 'Pre-Skalle. The skull is only half closed. The rest is bus, loom, and bare actuator. The coat waits until the chassis holds.',
    bigNumber: '0', bigCopy: 'Half built.\nWires still out.', seals: items(['SK', 'RT']), concept: 'Elementary\nConcept 001',
    footId: '#SK-00', footStage: 'Assembly', footSwitch: 'Bench', footFrom: 'Dataset', footTo: 'One',
    matrix: ['1111111', '1000001', '1011101', '1010101', '1110101', '1000001', '1111111'],
    protoWord: 'PRE', protoSpec: 'SKL tech\nPattern\nGa 00', protoImage: await up('/brand/skalle-proto.jpg'),
    protoAlt: 'Early Skalle chassis: one face plate fitted, the other side open wiring, boards, and bare actuators.',
    protoVert: 'SK-00', protoStamp: 'HALF',
    specTitle: 'Chassis', specBay: 'Build bay', specCode: 'INTERNAL-00', specMeta: 'Model : NONE 00\nB-TYPE / BENCH VV-01',
    specRows: [{ label: 'Part No', value: 'SK-00' }, { label: 'Plate', value: 'JQ6-SK00' }],
    bars: [2, 1, 1, 3, 1, 2, 1, 1, 4, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 4, 1, 1, 3, 1, 2, 1, 1],
    serial: 'CV LV00-EH U004 24080096 SD1001',
    scopeTag: 'LTO/R', scopeA: '5020', scopeB: '4490',
    scopeLeft: items(['S 1.5', 'V 0.95', 'G 0.7', '2.2']), scopeRight: items(['IN RING', 'MOV LKD', 'OFF']),
    scopeScale: items(['040', '050', '060', '070', '080', '090']),
  }),
  sec('card-grid', { index: '/02', title: 'The product', lede: S.offer.lede, items: cardItems(S.offer.jobs) }),
  sec('terminal-quote', { tag: 'REQ', kicker: 'A job you can hand it', quote: S.story.quote, note: S.story.quoteNote, buttonLabel: 'What Skalle does' }),
  sec('signals-strip', {
    tag: 'FIG', kicker: 'Signals',
    cards: [
      { title: 'Skalle', label: 'Intent', url: S.exploreHref, image: await up('/signals/intent.jpg'), alt: 'A Skalle request: create a service from energy and weather data' },
      { title: 'Link', label: 'Phage', url: '/architecture', image: await up('/signals/phage.jpg'), alt: 'Bacteriophages linked into a network' },
      { title: 'Skalle', label: 'Figure', url: '/research', image: await up('/signals/figure.jpg'), alt: 'Wireframe scan of a head' },
      { title: 'Field', label: 'Culture', url: S.rtwHref, image: await up('/signals/culture.jpg'), alt: 'A living culture under acid light' },
    ],
  }),
  sec('split-feature', {
    style: 'figure', flip: false, index: '/07', kicker: 'Organism', title: 'A living interface',
    paragraphs: paras(S.home.organism, S.home.organismNext), linkLabel: 'Open the system ↗', linkUrl: '/system',
    image: await up('/signals/virus.jpg'), alt: 'A virus capsid under acid light', caption: 'SPC_01 / Capsid',
  }),
  sec('split-feature', {
    style: 'figure', flip: true, index: '/08', kicker: 'Field', title: 'A field you can hold',
    paragraphs: paras(S.home.network, S.home.link, S.home.ghost), linkLabel: 'realtimeweb.org ↗', linkUrl: S.rtwHref,
    image: await up('/signals/culture.jpg'), alt: 'Cells in culture, lit like a network', caption: 'SPC_02 / Culture',
  }),
  sec('split-feature', {
    style: 'figure', flip: false, index: '/09', kicker: 'Authority', title: 'Contained on purpose',
    paragraphs: paras(S.home.authority, S.home.deploy, S.home.chain), linkLabel: 'Read the architecture ↗', linkUrl: '/architecture',
    image: await up('/signals/containment.jpg'), alt: 'A sealed chamber with one point of light inside', caption: 'SPC_03 / Containment',
  }),
  sec('split-feature', {
    style: 'phage', flip: false, index: 'SPC_04', kicker: 'Phage', title: 'Links, not a private door for every neighbor',
    paragraphs: paras(S.tools.lede), linkLabel: 'Enter the lab ↗', linkUrl: '/lab',
    image: await up('/signals/phage.jpg'), alt: 'Bacteriophages linked into a network',
  }),
  sec('charging-bay', {
    index: '/10', kicker: 'Charging bay', title: 'Charging for launch',
    paragraphs: paras(S.home.charging, S.home.chargingNext), chargeLabel: 'Charge', charge: 87, unit: 'Skalle_01',
    crew: items(['Paal Kristian Levang', 'Henrik']), status: 'Preparing for launch',
    image: await up('/brand/skalle-charging.jpg'),
    alt: 'Skalle in his overcoat and black hat, floating in a glass charging pod in a bright lab', caption: 'POD_01 / Skalle',
  }),
  sec('sibling-hall', {
    index: '/11', kicker: 'Unidentified', title: "He isn't the only one",
    paragraphs: paras(S.home.siblings, S.home.siblingsNext), image: await up('/brand/skalle-siblings.jpg'),
    alt: 'A bright hall of glass charging pods, each holding a different unidentified robot', caption: 'HALL_02 / Units charging',
    tags: [
      { id: 'SK_02', x: 15, y: 30 }, { id: 'SK_03', x: 39.5, y: 34 }, { id: 'SK_04', x: 56, y: 38 },
      { id: 'SK_05', x: 68.5, y: 42 }, { id: 'SK_06', x: 78, y: 45 },
    ].map((t) => ({ ...t, label: 'Unknown' })),
  }),
  sec('faq', {
    index: '/12', title: 'FAQ', lede: 'The short answer is open. The full answer is one step further, when you want the detail.',
    items: S.faq, openLabel: 'Read the full answer', closeLabel: 'Close',
  }),
  sec('route-nav', {
    items: [
      { url: '/system', index: '/02', title: 'System', note: 'Describe to run' },
      { url: '/research', index: '/03', title: 'Research', note: 'Documented positions' },
      { url: '/lab', index: '/04', title: 'Lab', note: 'Synx controls' },
      { url: '/architecture', index: '/05', title: 'Architecture', note: 'Owned services' },
    ],
  }),
];

/* ---------------- system */
const systemSections = [
  sec('scene-hero', {
    index: '/02', title: 'System',
    lede: 'Skalle takes a sentence through the Synx toolchain and leaves a service on the network. It is not a coding assistant.',
    image: await up('/scenes/system.jpg'), side: 'left',
    alt: 'Skalle in his overcoat and hat, seated before a wall of old monitors, cables running from the screens into his collar',
    tags: [{ label: 'SKL_01 / Interface', x: 66, y: 16 }, { label: 'BUS / MCP', x: 74, y: 44 }, { label: 'WALL / Live network', x: 30, y: 26 }],
    meta: [{ k: 'Input', v: 'A sentence' }, { k: 'Output', v: 'A running service' }, { k: 'Steps', v: 'Six' }],
  }),
  sec('request-trace', {
    index: '/02.1', title: 'One request, traced',
    lede: 'Watch the energy request from the home page go through all six steps. Click a step to stop on it.',
    badge: 'Illustrative, not a live session',
    steps: [
      ['Describe', ['you | Create a service that receives live energy data from my buildings, combines it with weather, and gives my forecast to my app.', 'skalle | Understood: one new service, two sources, one model, one consumer.']],
      ['Discover', ['skalle | Searching the network for a weather source.', 'net | Found a published weather service. Its owner keeps it.', 'skalle | Your building meters are not on the network yet. I can add them as Ghosts.']],
      ['Create', ['skalle | Creating a Morphic Service called energy-forecast on your domain.', 'net | Name issued through Synx DNS. Owner: you.']],
      ['Link', ['skalle | Linking weather to energy-forecast.', 'skalle | Adding building meters as Ghosts and linking them.', 'net | No private API cut. Nothing stored in the middle.']],
      ['Configure', ['skalle | Read access for your optimization model. Read access for your app.', 'net | Change queued. Waiting for the owner to confirm.']],
      ['Run', ['you | Confirmed.', 'net | energy-forecast is running on the Real Time Web.', 'skalle | Session closed. Access tokens expired.']],
    ].map(([step, lines]) => ({ step, lines: (lines as string[]).join('\n') })),
  }),
  sec('card-grid', { items: S.story.steps.map((s: any) => ({ title: s.name, body: s.body })), notes: paras(S.story.goal, S.story.opening) }),
  sec('terminal-quote', { tag: 'REQ', kicker: 'Example', quote: S.story.quote, note: S.story.quoteNote }),
  sec('essays', {
    startNumber: 1,
    items: [...S.dossier.system, { title: 'A chain that stays owned', body: `${S.home.chain} ${S.morph.example}` }],
  }),
];

/* ---------------- research */
const researchUrl = (id: string) => (id === 'EXP_004' || id === 'EXP_006' ? S.rtwHref : S.exploreHref);
const researchSections = [
  sec('scene-hero', {
    index: '/03', title: 'Research', lede: 'What is written about Skalle on synx.tools. These are documented positions, not instrument readings.',
    image: await up('/scenes/research.jpg'), side: 'left',
    alt: 'Skalle seen from behind, hands clasped, studying a glowing tank that holds a figure made of network filaments',
    tags: [{ label: 'TANK_03 / Specimen', x: 50, y: 18 }, { label: 'SKL_01 / Observer', x: 80, y: 38 }],
    meta: [{ k: 'Positions', v: String(S.dossier.research.length) }, { k: 'Essays', v: String(S.dossier.researchEssays.length) }, { k: 'Source', v: 'synx.tools' }],
  }),
  sec('research-grid', {
    statusLabel: 'DOCUMENTED', linkLabel: 'Read ↗',
    items: await Promise.all(S.dossier.research.map(async (r: any) => clean({
      id: r.id, title: r.title, body: r.body, year: '2026', url: researchUrl(r.id),
      image: r.id === 'EXP_001' ? await up('/brand/robot-right.jpg') : undefined,
      alt: r.id === 'EXP_001' ? 'Skalle, three-quarter view' : undefined,
    }))),
  }),
  sec('essays', { startNumber: 1, items: S.dossier.researchEssays }),
];

/* ---------------- lab */
const labMeta = [
  { id: 'LAB_001', role: 'NAMING', logo: '/brand/synx-dns.png', alt: 'Synx DNS' },
  { id: 'LAB_002', role: 'OPERATING', logo: '/brand/synx-bios.png', alt: 'Synx BIOS' },
  { id: 'LAB_003', role: 'IDENTITY', logo: '/brand/synx-pass.png', alt: 'Synx Pass' },
  { id: 'LAB_004', role: 'ENTRY', logo: '/brand/morph-space.png', alt: 'Morph Space' },
];
const labSections = [
  sec('scene-hero', {
    index: '/04', title: 'Lab', lede: 'The controls around Skalle. Each panel is a role in the toolchain, not a live status feed.',
    image: await up('/scenes/lab.jpg'), side: 'right',
    alt: 'Skalle in his overcoat and hat directing robotic arms that solder an open server chassis under a surgical lamp',
    tags: [{ label: 'SKL_01 / Operator', x: 27, y: 14 }, { label: 'ARMS / Synx tools', x: 62, y: 26 }, { label: 'CHASSIS / Your domain', x: 34, y: 45 }],
    meta: [{ k: 'Controls', v: 'Four' }, { k: 'Naming', v: 'Synx DNS' }, { k: 'Identity', v: 'Synx Pass' }],
  }),
  sec('tool-bays', {
    openLabel: 'Open ↗', note: S.tools.lede,
    items: await Promise.all(S.tools.items.map(async (t: any, i: number) => ({
      id: labMeta[i].id, role: labMeta[i].role, name: t.name, body: t.body, url: t.href, logo: await up(labMeta[i].logo), logoAlt: labMeta[i].alt,
    }))),
  }),
  sec('switchboard', {
    index: '/04.1', title: 'The leash',
    lede: 'What a model connected from outside may do inside your session. Flip the switches. One rule never moves: access does not stay open.',
    outsideLabel: 'Outside model',
    switches: [
      { id: 'look', label: 'Look at the network', note: 'An outside model can read what you own.', locked: false, initial: true },
      { id: 'change', label: 'Change the network', note: 'Off until you turn it on yourself.', locked: false, initial: false },
      { id: 'confirm', label: 'Wait for my confirmation', note: 'A change pauses before it lands.', locked: false, initial: true },
      { id: 'open', label: 'Keep access open afterwards', note: 'Not available. Access closes on its own.', locked: true, initial: false },
    ],
    verdicts: [
      { when: 'blind', text: 'The model is connected but blind. It can reason about what you say, nothing more.' },
      { when: 'look', text: 'The model can look around your services. It cannot change a thing.' },
      { when: 'propose', text: 'The model can propose changes. Each one waits for you before it lands.' },
      { when: 'direct', text: 'The model can change what your identity allows, straight away. Asking still grants no new right.' },
    ],
  }),
  sec('card-grid', {
    index: '/05', title: 'With Skalle', lede: 'Each control stays itself. Skalle is the conversation that calls it, inside the identity you already have.',
    items: cardItems(S.dossier.labWith),
  }),
  sec('card-grid', {
    index: '/06', title: 'Who it is for', lede: 'The same network, three seats. Skalle is how you speak to the seat you hold.',
    items: cardItems(S.morph.roles),
  }),
];

/* ---------------- architecture */
const archSections = [
  sec('scene-hero', {
    index: '/05', title: 'Architecture', lede: S.network.points[0],
    image: await up('/scenes/architecture.jpg'), side: 'left',
    alt: 'Skalle seated cross-legged in a golden chamber, hundreds of cables descending from a skylight to meet him',
    tags: [{ label: 'SKYLIGHT / The field', x: 70, y: 6 }, { label: 'LOOM / Links', x: 80, y: 44 }, { label: 'SKL_01 / Interface', x: 69, y: 62 }],
    meta: [{ k: 'Network', v: 'Real Time Web' }, { k: 'Entry', v: 'Morph Space' }, { k: 'Controls', v: 'Synx' }],
  }),
  sec('doors-vs-links', {
    index: '/05.1', title: 'Three ways to wire six services',
    lede: 'The same six services, wired three ways. Pick one and count what you would have to maintain.',
    modes: [
      { id: 'doors', label: 'A private door each', stat: '15 integrations', body: 'Every service cuts a custom API for every neighbor. Each one is built, secured, and kept alive by hand.' },
      { id: 'warehouse', label: 'A warehouse in the middle', stat: '1 owner of everything', body: 'Every stream is copied into one place. It is simpler on a diagram. Whoever holds the middle holds the data.' },
      { id: 'links', label: 'Links on the Real Time Web', stat: '5 links', body: 'A service links to another only where it depends on it. The data stays with its owner, and the stream is not parked in between.' },
    ],
    nodes: [
      { id: 'weather', label: 'Weather', x: 80, y: 60 }, { id: 'building', label: 'Building', x: 80, y: 240 }, { id: 'energy', label: 'Energy', x: 250, y: 150 },
      { id: 'optimizer', label: 'Optimizer', x: 420, y: 60 }, { id: 'app', label: 'Your app', x: 420, y: 240 }, { id: 'facility', label: 'Facility', x: 560, y: 150 },
    ],
    links: ['weather > energy', 'building > energy', 'energy > optimizer', 'energy > app', 'optimizer > facility'].join('\n'),
    ownedLabel: 'owned', warehouseLabel: 'WAREHOUSE',
  }),
  sec('architecture-diagram', {
    steps: [
      { id: '01', name: 'Intent', note: 'Ordinary language' }, { id: '02', name: 'Skalle', note: 'Creates and links' },
      { id: '03', name: 'Synx tools', note: 'Name, operate, access' }, { id: '04', name: 'Morph Space', note: 'Where it is joined' },
      { id: '05', name: 'Real Time Web', note: 'Where it runs' }, { id: '06', name: 'Owned service', note: 'Stays with the owner' },
    ],
    notes: paras(S.story.modelBody, S.network.lede, S.story.abstraction),
  }),
  sec('card-grid', {
    index: '/06', title: 'Layers',
    lede: 'A service sits on a stack. Skalle does not replace the stack. It helps you name the layer you are changing.',
    items: cardItems(S.morph.layers),
  }),
  sec('essays', { startNumber: 1, items: S.dossier.architecture }),
  sec('status-map', {
    index: '/07', title: 'Representation',
    lede: 'A map of the system as it is described publicly. Nothing on this panel is read from a live backend.',
    rows: [
      { name: 'Skalle', role: 'Interface' }, { name: 'Synx DNS', role: 'Naming' }, { name: 'Synx BIOS', role: 'Operating' },
      { name: 'Synx Pass', role: 'Identity' }, { name: 'Real Time Web', role: 'Network' },
    ],
    image: await up('/signals/corridor.jpg'), alt: 'A figure at the end of a signal corridor',
  }),
];

/* ---------------- careers */
const careersSections = [
  sec('scene-hero', {
    index: '/06', title: 'Careers',
    lede: 'One of the fastest growing teams on the Real Time Web. Everyone here builds the next generation of the internet.',
    body: paras(
      'Skalle is getting ready for launch, and the rest of the units are charging behind him. The work is moving faster than the team, so the team is growing.',
      'Nobody here watches from the side. Engineers, designers and researchers all ship into the same network, and every contribution ends up in the internet people will use next.',
    ),
    image: await up('/scenes/careers.jpg'), side: 'left',
    alt: 'Skalle in his overcoat and hat, looking back from a row of three glowing pods with other units charging inside',
    tags: [{ label: 'SKALLE_01 / Launching', x: 70, y: 18 }, { label: 'POD_02 / Your seat', x: 76, y: 44 }, { label: 'POD_03 / Charging', x: 89, y: 66 }],
    meta: [{ k: 'Pace', v: 'Growing fast' }, { k: 'Work', v: 'The next internet' }, { k: 'Roles', v: 'Opening soon' }],
  }),
  sec('careers-hero', {
    index: '/06.1', kicker: 'Openings', signal: '// signal incoming',
    headline: "We're *hiring* soon.",
    lede: S.careers.note, terminalTitle: 'skalle@careers:~',
    terminal: [
      { prompt: 'ping', text: 'skalle.careers' }, { prompt: 'status', text: 'HIRING_SOON' }, { prompt: 'open_roles', text: '0 // not posted yet' },
      { prompt: 'channel', text: 'discord ... linked' }, { prompt: 'advice', text: 'join now, catch the drop' },
    ],
    ctaLabel: 'Join Discord', ctaUrl: S.careers.discordHref,
    image: await up('/brand/skalle-workshop.jpg'),
    alt: 'Skalle in an overcoat and black hat, repairing a half-built robot with its wiring exposed',
    parts: [
      { id: 'SKALLE_01', x: 17, y: 25, side: 'left' }, { id: 'NPU_CORE', x: 77, y: 30, side: 'right' },
      { id: 'NECK_BUS', x: 71, y: 60, side: 'left' }, { id: 'MAIN_PCB', x: 79, y: 85, side: 'left' },
    ],
    scanTag: 'SCN_06 / Skalle', scanNote: 'Unit_06 // Assembly in progress',
  }),
  sec('ticker', { items: items(['Hiring soon', 'Join the Discord', "Don't miss the signal", 'Skalle AI', 'Real Time Web']) }),
  sec('feed-cards', {
    tag: 'CH', kicker: 'What goes out on the channel',
    cards: [
      { id: 'CH_01', title: 'Openings', body: 'When a role opens, it lands in the channel.' },
      { id: 'CH_02', title: 'Build logs', body: 'What we are shipping on Skalle and the Real Time Web, as it happens.' },
      { id: 'CH_03', title: 'The people', body: 'Talk with the team building it before there is a job post to apply to.' },
    ],
  }),
];

/* ---------------- articles and chronicles listing pages */
const writers = [...new Set(shelf.flatMap((s: any) => s.issues.map((i: any) => i.author)))].join(' and ');
const articlesSections = [
  sec('times-masthead', {
    name: paperName, volume: `Vol. I · No. ${articles.length}`, edition: 'Online edition · Free',
    motto: 'Printed for people. Read by machines that ask first.', sectionsLabel: 'Sections',
  }),
];
const chroniclesSections = [
  sec('chronicles-shelf', {
    kicker: 'Skalle', title: 'Chronicles',
    lede: 'Stories of Skalle, the caretaker, and the world we could build beside it. Written for you by {writers}. Pick up an issue and turn the page.'.replace('{writers}', writers),
    readLabel: 'Read now', pressLabel: 'In the press', notInkedLabel: 'Not inked yet',
  }),
];

/* ------------------------------------------------------------------ write everything */
console.log('Pages');
const pages: [string, string, string, number, unknown[]][] = [
  ['home', 'Home', 'Skalle is the AI interface to the Real Time Web.', 1, homeSections],
  ['system', 'System', 'Skalle takes a sentence through the Synx toolchain and leaves a service on the network.', 2, systemSections],
  ['research', 'Research', 'What is written about Skalle on synx.tools.', 3, researchSections],
  ['lab', 'Lab', 'The controls around Skalle.', 4, labSections],
  ['architecture', 'Architecture', 'From intent, through Skalle and the Synx tools, to an owned service on the Real Time Web.', 5, archSections],
  ['careers', 'Careers', "We're hiring soon. Openings and other updates are shared on Discord.", 6, careersSections],
  ['chronicles', 'Chronicles', `Black-and-white comic volumes on Skalle by ${writers}.`, 7, chroniclesSections],
  ['articles', 'Articles', 'News, features and opinion from the world of Skalle and the Real Time Web.', 8, articlesSections],
];
for (const [slug, title, description, order, sections] of pages) await put('pages', slug, { title, description, order, sections });

console.log('Articles');
for (const a of articles) {
  await put('article', a.slug, {
    title: a.title, dek: a.dek, section: a.section, byline: a.byline, date: a.date, minutes: a.minutes,
    image: await up(a.image), alt: a.alt, caption: a.caption,
    body: a.body.map((b: any) => clean({ type: b.type, text: b.text, by: b.by })),
  });
}

console.log('Chronicles');
const textBlocks = new Set(['kicker', 'title', 'heading', 'prose', 'principle', 'credit', 'end', 'epigraph', 'beat', 'screen']);
let order = 0;
for (const series of shelf) {
  for (const issue of series.issues) {
    if (!issue.slug) continue;
    const blocks: Record<string, unknown>[] = [];
    for (const [pi, page] of (issue.pages as any[][]).entries()) {
      for (const b of page) {
        const row: Record<string, unknown> = { page: pi + 1, type: b.type };
        if (textBlocks.has(b.type)) row.text = b.text;
        else if (b.type === 'plate') Object.assign(row, clean({ image: await up(b.src), alt: b.alt, focus: b.focus, shape: b.shape, side: b.side }));
        else if (b.type === 'cast') row.extra = { people: await Promise.all(b.people.map(async (p: any) => ({ ...p, src: (await up(p.src)) ?? p.src }))) };
        else if (b.type === 'table') row.extra = { heads: b.heads, rows: b.rows };
        else if (b.type === 'stage') row.extra = { title: b.title, when: b.when, lines: b.lines };
        else if (b.type === 'colophon') row.extra = { rows: b.rows };
        blocks.push(row);
      }
    }
    await put('chronicle-issue', issue.slug, {
      title: issue.title, coverTitle: issue.coverTitle, label: issue.label, author: issue.author, description: issue.description,
      seriesId: series.id, seriesName: series.name, order: ++order,
      image: await up(issue.image), alt: issue.alt, focus: issue.focus, pdf: await up(pdfHref(issue.slug)), pages: blocks,
    });
  }
}

console.log('Shared');
await put('header', null, { brand: 'SKALLE', brandUrl: '/', links: nav, showClock: true, clockZone: 'UTC', ctaLabel: OPEN, ctaUrl: S.exploreHref });
await put('footer', null, {
  brand: 'Skalle AI', line: S.footer.line, links: nav,
  fieldLinks: [
    { label: 'Skalle AI', url: 'https://synx.tools/skalle' }, { label: 'Synx DNS', url: 'https://synx.tools/dns' },
    { label: 'Morph Space', url: 'https://synx.tools/morph' }, { label: 'realtimeweb.org', url: 'https://www.realtimeweb.org/' },
  ],
  socials: [
    { label: 'X', url: 'https://x.com/Skalleai', icon: 'x' },
    { label: 'GitHub', url: 'https://github.com/mthirumalai2905/Synx', icon: 'github' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/company/realtimeweb/', icon: 'linkedin' },
  ],
  copyright: '© 2026 Synx AS', accessLine: '» Access granted_',
});
await put('website-settings', null, {
  siteName: 'Skalle AI', siteUrl: 'http://localhost:3000', titleTemplate: '%s | Skalle AI',
  description: 'Meet Skalle. The AI interface to the Real Time Web.', favicon: await up('/brand/skalle.png'),
  displayFont: 'Archivo Black', bodyFont: 'Archivo', monoFont: 'JetBrains Mono',
  backgroundColor: '#070907', panelColor: '#111411', textColor: '#f2f2ec', mutedColor: '#8c9188', accentColor: '#ffb01a',
  paperColor: '#eeede7', paperInkColor: '#12140f',
  openUrl: S.exploreHref, synxUrl: S.synxHref, rtwUrl: S.rtwHref, discordUrl: S.careers.discordHref,
  xUrl: 'https://x.com/Skalleai', githubUrl: 'https://github.com/mthirumalai2905/Synx', linkedInUrl: 'https://www.linkedin.com/company/realtimeweb/',
});

const lines = (...l: string[]) => l.join('\n');
await put('spec-manual', null, {
  title: 'Spec terminal',
  hint: 'Type a spec: interface, model, authority, operations, network, deploy. Or a number 1 to 6.',
  closeLabel: 'Close',
  boundLabel: 'Operator: bound to your identity',
  image: await up('/brand/skalle-hardware.png'),
  imageAlt: 'Skalle, half armor plate and half exposed circuit board',
  jobs: S.offer.jobs,
  specs: [
    { id: 'interface', short: 'Interface', title: 'Natural language in. Services out.', code: 'SPEC_01', kind: 'Interface',
      line: 'You describe a job in ordinary language. Skalle turns it into operations the Real Time Web can run, then tells you what happened.',
      log: lines('[ INPUT ] ordinary language, no configuration file', '[ OUTPUT ] a service, a source, a link, a right', '[ REPORT ] every operation is reported back'),
      pros: lines('No admin screens to learn first', 'One sentence can become a sequence', 'Reports what it did, not what it might do'),
      aliases: '1, 01, interface, language, input' },
    { id: 'model', short: 'Model', title: "Your model. Skalle's hands.", code: 'SPEC_02', kind: 'Intelligence',
      line: 'Through MCP, a model you already trust does the reasoning. Skalle holds the Real Time Web capabilities. No single vendor owns the ecosystem.',
      log: lines('[ MCP ] open protocol between model and tools', '[ CLIENTS ] ChatGPT, Claude, Cursor, VS Code, own dashboard', '[ LOCK-IN ] none'),
      pros: lines('Not tied to one model', 'Works from the tool you already use', 'Reasoning stays yours'),
      aliases: '2, 02, model, mcp, intelligence' },
    { id: 'authority', short: 'Authority', title: 'A leash, not a spare key.', code: 'SPEC_03', kind: 'Access control',
      line: 'Each session is isolated and tied to your identity. A model connected from outside can look. It cannot change the network unless you allow that.',
      log: lines('[ SESSION ] isolated, bound to identity', '[ DEFAULT ] read-only for outside models', '[ CHANGE ] can wait for your confirmation', '[ TOKENS ] do not stay open'),
      pros: lines('Asking never creates a new right', 'Changes can wait for you', 'Access closes on its own'),
      aliases: '3, 03, authority, access, security, leash' },
    { id: 'operations', short: 'Operations', title: 'Five jobs you can hand it.', code: 'SPEC_04', kind: 'Capabilities', line: S.offer.lede,
      log: S.offer.jobs.map((j: any) => `[ OP ] ${j.name}: ${j.body}`).join('\n'),
      pros: lines('Create, expose, link, access, place', 'Batch a workflow in one request', 'Inspect what is live now'),
      aliases: '4, 04, operations, ops, jobs, create, expose, link, place' },
    { id: 'network', short: 'Network', title: 'Synx underneath. Owned on top.', code: 'SPEC_05', kind: 'Stack',
      line: 'Synx DNS names it. Synx BIOS runs it. Synx Pass secures who it belongs to. Morph Space is where it joins the Real Time Web.',
      log: S.tools.items.map((i: any) => `[ ${i.name.toUpperCase()} ] ${i.body.split('. ')[0]}.`).join('\n'),
      pros: lines('Links, not a private door per neighbor', 'Data stays with the owner', 'Rights move when ownership moves'),
      aliases: '5, 05, network, synx, stack, dns, bios, pass, morph' },
    { id: 'deploy', short: 'Deploy', title: 'Runs on your ground.', code: 'SPEC_06', kind: 'Hosting',
      line: 'A team that wants the session on its own machines can run Skalle as its own service and tie it to the sign-in it already uses.',
      log: lines('[ IMAGE ] Docker service', '[ SIGN-IN ] your company identity provider', '[ GROUND ] your machines, your session'),
      pros: lines('Self-hosted when you want it', 'Company sign-in, not a new login', 'Same capabilities, your perimeter'),
      aliases: '6, 06, deploy, docker, host, hosting' },
  ],
});

console.log('Done.');
void basename;

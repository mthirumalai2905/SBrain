/**
 * The content structure of the Skalle AI website (the design in Desktop/Project/New/skalleaiLP).
 *
 * Skalle has its own design: a dark "lab" with technical labels (/02, SPC_01), scene heroes with tagged photos, numbered
 * cards, a charging pod, a comic reader (Chronicles) and a newspaper (The Skalle Times). So its sections are named after
 * those blocks, not after the Synx Tools ones.
 *
 *   pages          one document per address: home, system, research, lab, architecture, careers, articles, chronicles
 *   sections       the blocks a page is built from (kind "section")
 *   article        one story in The Skalle Times
 *   chronicle-issue one comic volume, with its pages
 *   header / footer / website-settings / spec-manual   shared, one document each
 */
import type { Field } from '../src/fields.js';

export type TypeDef = { name: string; slug: string; kind: 'collection' | 'singleton' | 'page' | 'section'; fields: Field[] };

type F = Field;
const text = (name: string, label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'text', ...extra });
const area = (name: string, label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'textarea', ...extra });
const num = (name: string, label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'number', ...extra });
const bool = (name: string, label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'boolean', ...extra });
const img = (name: string, label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'image', ...extra });
const pick = (name: string, options: string[], label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'select', options, ...extra });
const json = (name: string, label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'json', ...extra });
const list = (name: string, label: string, fields: NonNullable<F['fields']>, extra: Partial<F> = {}): F => ({ name, label, type: 'array', fields, ...extra });

// small reusable item shapes
const paragraphs = (name = 'paragraphs', label = 'Paragraphs') => list(name, label, [{ name: 'text', label: 'Text', type: 'textarea' }]);
const words = (name: string, label: string) => list(name, label, [{ name: 'text', label: 'Text', type: 'text' }]);
const tags = (name = 'tags', label = 'Tags on the picture') =>
  list(name, label, [
    { name: 'label', label: 'Label', type: 'text' },
    { name: 'x', label: 'Left (%)', type: 'number' },
    { name: 'y', label: 'Top (%)', type: 'number' },
  ]);
const facts = (name = 'meta', label = 'Facts strip') =>
  list(name, label, [
    { name: 'k', label: 'Name', type: 'text' },
    { name: 'v', label: 'Value', type: 'text' },
  ]);
const links = (name: string, label: string, extra: Partial<F> = {}) =>
  list(name, label, [
    { name: 'label', label: 'Label', type: 'text' },
    { name: 'url', label: 'Link', type: 'text' },
  ], extra);

const index = text('index', 'Number tag', { group: 'Heading' });
const heading = (label = 'Title') => text('title', label, { group: 'Heading' });
const lede = area('lede', 'Intro', { group: 'Heading' });

export const skalleTypes: TypeDef[] = [
  // ---------------------------------------------------------------- pages
  {
    name: 'Pages',
    slug: 'pages',
    kind: 'page',
    fields: [text('title', 'Page title', { required: true }), area('description', 'Search and share description'), num('order', 'Order in the menu')],
  },

  // ---------------------------------------------------------------- sections: heroes
  {
    name: 'Home hero',
    slug: 'home-hero',
    kind: 'section',
    fields: [
      text('index', 'Number tag', { group: 'Label' }),
      text('kicker', 'Label', { group: 'Label' }),
      area('lede', 'Intro line', { group: 'Copy' }),
      area('title', 'Big title (a new line breaks the title)', { group: 'Copy' }),
      text('openLabel', 'Open button', { group: 'Buttons' }),
      text('openUrl', 'Open button link', { group: 'Buttons' }),
      text('specsLabel', 'Specs button (opens the spec manual)', { group: 'Buttons' }),
      text('systemLabel', 'System button', { group: 'Buttons' }),
      text('systemUrl', 'System button link', { group: 'Buttons' }),
      img('figure', 'Robot picture', { group: 'Picture' }),
      text('figureAlt', 'Robot picture description', { group: 'Picture' }),
      facts('meta', 'Facts under the title'),
    ],
  },
  {
    name: 'Scene hero',
    slug: 'scene-hero',
    kind: 'section',
    fields: [
      text('index', 'Number tag (like /02)'),
      text('title', 'Title', { required: true }),
      area('lede', 'Intro'),
      paragraphs('body', 'More text under the intro'),
      img('image', 'Picture'),
      text('alt', 'Picture description'),
      pick('side', ['left', 'right'], 'Picture side'),
      tags('tags', 'Tags on the picture'),
      facts('meta', 'Facts strip'),
    ],
  },
  {
    name: 'Careers hero',
    slug: 'careers-hero',
    kind: 'section',
    fields: [
      text('index', 'Number tag', { group: 'Label' }),
      text('kicker', 'Label', { group: 'Label' }),
      text('signal', 'Small note beside the label', { group: 'Label' }),
      text('headline', 'Headline (*stars* highlight a word)', { group: 'Copy' }),
      area('lede', 'Intro', { group: 'Copy' }),
      text('terminalTitle', 'Terminal title', { group: 'Terminal' }),
      list('terminal', 'Terminal lines', [
        { name: 'prompt', label: 'Command', type: 'text' },
        { name: 'text', label: 'Result', type: 'text' },
      ], { group: 'Terminal' }),
      text('ctaLabel', 'Button', { group: 'Button' }),
      text('ctaUrl', 'Button link', { group: 'Button' }),
      img('image', 'Robot picture', { group: 'Picture' }),
      text('alt', 'Picture description', { group: 'Picture' }),
      list('parts', 'Part labels on the robot', [
        { name: 'id', label: 'Label', type: 'text' },
        { name: 'x', label: 'Left (%)', type: 'number' },
        { name: 'y', label: 'Top (%)', type: 'number' },
        { name: 'side', label: 'Label side', type: 'select', options: ['left', 'right'] },
      ], { group: 'Picture' }),
      text('scanTag', 'Scan tag', { group: 'Picture' }),
      text('scanNote', 'Side note', { group: 'Picture' }),
    ],
  },
  {
    name: 'Times masthead',
    slug: 'times-masthead',
    kind: 'section',
    fields: [
      text('name', 'Paper name', { required: true }),
      text('volume', 'Volume line'),
      text('edition', 'Edition line'),
      text('motto', 'Motto'),
      text('sectionsLabel', 'Sections bar label'),
    ],
  },
  {
    name: 'Chronicles shelf',
    slug: 'chronicles-shelf',
    kind: 'section',
    fields: [
      text('kicker', 'Small label'),
      text('title', 'Title', { required: true }),
      area('lede', 'Intro (use {writers} where the writers go)'),
      text('readLabel', 'Label for a readable volume'),
      text('pressLabel', 'Label for a volume not ready'),
      text('notInkedLabel', 'Pop-up for a volume not ready'),
    ],
  },

  // ---------------------------------------------------------------- sections: copy blocks
  {
    name: 'Statement',
    slug: 'statement',
    kind: 'section',
    fields: [area('text', 'Statement', { required: true })],
  },
  {
    name: 'Card grid',
    slug: 'card-grid',
    kind: 'section',
    fields: [
      index, heading(), lede,
      list('items', 'Cards', [
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'body', label: 'Text', type: 'textarea' },
      ]),
      paragraphs('notes', 'Notes under the cards'),
    ],
  },
  {
    name: 'Request quote',
    slug: 'terminal-quote',
    kind: 'section',
    fields: [
      text('tag', 'Tag (like REQ)'),
      text('kicker', 'Label'),
      area('quote', 'Request', { required: true }),
      area('note', 'Note'),
      text('buttonLabel', 'Button that opens the spec manual'),
    ],
  },
  {
    name: 'Feature with picture',
    slug: 'split-feature',
    kind: 'section',
    fields: [
      pick('style', ['figure', 'phage'], 'Style', { group: 'Look' }),
      bool('flip', 'Picture on the right', { group: 'Look' }),
      text('index', 'Number tag (like /07)', { group: 'Label' }),
      text('kicker', 'Label', { group: 'Label' }),
      text('title', 'Heading', { required: true, group: 'Copy' }),
      paragraphs('paragraphs', 'Paragraphs'),
      text('linkLabel', 'Link text', { group: 'Link' }),
      text('linkUrl', 'Link address', { group: 'Link' }),
      img('image', 'Picture', { group: 'Picture' }),
      text('alt', 'Picture description', { group: 'Picture' }),
      text('caption', 'Picture caption', { group: 'Picture' }),
    ],
  },
  {
    name: 'Essays',
    slug: 'essays',
    kind: 'section',
    fields: [
      num('startNumber', 'First essay number'),
      list('items', 'Essays', [
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'body', label: 'Text', type: 'textarea' },
      ]),
    ],
  },
  {
    name: 'Picture strip',
    slug: 'signals-strip',
    kind: 'section',
    fields: [
      text('tag', 'Tag (like FIG)'),
      text('kicker', 'Label'),
      list('cards', 'Cards', [
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'label', label: 'Small label', type: 'text' },
        { name: 'url', label: 'Link', type: 'text' },
        { name: 'image', label: 'Picture', type: 'image' },
        { name: 'alt', label: 'Picture description', type: 'text' },
      ]),
    ],
  },
  {
    name: 'FAQ',
    slug: 'faq',
    kind: 'section',
    fields: [
      index, heading(), lede,
      list('items', 'Questions', [
        { name: 'q', label: 'Question', type: 'text', required: true },
        { name: 'summary', label: 'Short answer', type: 'textarea' },
        { name: 'full', label: 'Full answer', type: 'textarea' },
      ]),
      text('openLabel', 'Button to open the full answer', { group: 'Buttons' }),
      text('closeLabel', 'Button to close it', { group: 'Buttons' }),
    ],
  },
  {
    name: 'Page links',
    slug: 'route-nav',
    kind: 'section',
    fields: [
      list('items', 'Links', [
        { name: 'index', label: 'Number tag', type: 'text' },
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'note', label: 'Note', type: 'text' },
        { name: 'url', label: 'Link', type: 'text' },
      ]),
    ],
  },

  // ---------------------------------------------------------------- sections: the lab's interactive and diagram blocks
  {
    name: 'Charging bay',
    slug: 'charging-bay',
    kind: 'section',
    fields: [
      index, text('kicker', 'Label', { group: 'Heading' }), heading('Heading'),
      paragraphs('paragraphs', 'Paragraphs'),
      text('chargeLabel', 'Meter label', { group: 'Meter' }),
      num('charge', 'Charge (percent)', { group: 'Meter' }),
      text('unit', 'Unit', { group: 'Details' }),
      words('crew', 'Crew'),
      text('status', 'Status', { group: 'Details' }),
      img('image', 'Picture', { group: 'Picture' }),
      text('alt', 'Picture description', { group: 'Picture' }),
      text('caption', 'Picture caption', { group: 'Picture' }),
    ],
  },
  {
    name: 'Sibling hall',
    slug: 'sibling-hall',
    kind: 'section',
    fields: [
      index, text('kicker', 'Label', { group: 'Heading' }), heading('Heading'),
      paragraphs('paragraphs', 'Paragraphs'),
      img('image', 'Picture', { group: 'Picture' }),
      text('alt', 'Picture description', { group: 'Picture' }),
      text('caption', 'Picture caption', { group: 'Picture' }),
      list('tags', 'Tags on the pods', [
        { name: 'id', label: 'Unit', type: 'text' },
        { name: 'label', label: 'Name shown', type: 'text' },
        { name: 'x', label: 'Left (%)', type: 'number' },
        { name: 'y', label: 'Top (%)', type: 'number' },
      ]),
    ],
  },
  {
    name: 'Early chassis',
    slug: 'chassis-bento',
    kind: 'section',
    fields: [
      text('tag', 'Tag (like PLT)', { group: 'Label' }),
      text('kicker', 'Label', { group: 'Label' }),
      text('word', 'Big word', { group: 'Name card' }),
      list('idMeta', 'Lines under the name', [{ name: 'text', label: 'Text', type: 'text' }], { group: 'Name card' }),
      area('note', 'Note', { group: 'Name card' }),
      text('bigNumber', 'Big number', { group: 'Name card' }),
      area('bigCopy', 'Text beside the number', { group: 'Name card' }),
      words('seals', 'Seals'),
      area('concept', 'Concept label', { group: 'Name card' }),
      text('footId', 'Footer: id', { group: 'Name card' }),
      text('footStage', 'Footer: stage', { group: 'Name card' }),
      text('footSwitch', 'Footer: switch', { group: 'Name card' }),
      text('footFrom', 'Footer: from', { group: 'Name card' }),
      text('footTo', 'Footer: to', { group: 'Name card' }),
      json('matrix', 'Dot pattern (rows of 1 and 0)', { group: 'Name card' }),
      text('protoWord', 'Picture card: word', { group: 'Picture card' }),
      area('protoSpec', 'Picture card: small spec', { group: 'Picture card' }),
      img('protoImage', 'Picture', { group: 'Picture card' }),
      text('protoAlt', 'Picture description', { group: 'Picture card' }),
      text('protoVert', 'Vertical label', { group: 'Picture card' }),
      text('protoStamp', 'Stamp', { group: 'Picture card' }),
      text('specTitle', 'Spec card: title', { group: 'Spec card' }),
      text('specBay', 'Spec card: bay', { group: 'Spec card' }),
      text('specCode', 'Spec card: code', { group: 'Spec card' }),
      area('specMeta', 'Spec card: meta', { group: 'Spec card' }),
      list('specRows', 'Spec card: rows', [
        { name: 'label', label: 'Label', type: 'text' },
        { name: 'value', label: 'Value', type: 'text' },
      ], { group: 'Spec card' }),
      json('bars', 'Bar widths', { group: 'Spec card' }),
      text('serial', 'Serial line', { group: 'Spec card' }),
      text('scopeTag', 'Scope: tag', { group: 'Scope card' }),
      text('scopeA', 'Scope: reading A', { group: 'Scope card' }),
      text('scopeB', 'Scope: reading B', { group: 'Scope card' }),
      words('scopeLeft', 'Scope: left list'),
      words('scopeRight', 'Scope: right list'),
      words('scopeScale', 'Scope: scale marks'),
    ],
  },
  {
    name: 'Request trace',
    slug: 'request-trace',
    kind: 'section',
    fields: [
      index, heading(), lede,
      text('badge', 'Note on the screen', { group: 'Screen' }),
      list('steps', 'Steps', [
        { name: 'step', label: 'Step', type: 'text' },
        { name: 'lines', label: 'Lines (one per line, written as: who | text)', type: 'textarea' },
      ]),
    ],
  },
  {
    name: 'Leash switches',
    slug: 'switchboard',
    kind: 'section',
    fields: [
      index, heading(), lede,
      text('outsideLabel', 'Result label', { group: 'Result' }),
      list('switches', 'Switches', [
        { name: 'id', label: 'Id (look, change, confirm, open)', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
        { name: 'note', label: 'Note', type: 'text' },
        { name: 'locked', label: 'Cannot be changed', type: 'boolean' },
        { name: 'initial', label: 'On at the start', type: 'boolean' },
      ]),
      list('verdicts', 'Results', [
        { name: 'when', label: 'When (blind, look, propose, direct)', type: 'text' },
        { name: 'text', label: 'Result text', type: 'textarea' },
      ]),
    ],
  },
  {
    name: 'Doors or links',
    slug: 'doors-vs-links',
    kind: 'section',
    fields: [
      index, heading(), lede,
      list('modes', 'Three ways', [
        { name: 'id', label: 'Id (doors, warehouse, links)', type: 'text' },
        { name: 'label', label: 'Tab', type: 'text' },
        { name: 'stat', label: 'Big number', type: 'text' },
        { name: 'body', label: 'Text', type: 'textarea' },
      ]),
      list('nodes', 'Services on the diagram', [
        { name: 'id', label: 'Id', type: 'text' },
        { name: 'label', label: 'Name', type: 'text' },
        { name: 'x', label: 'Left', type: 'number' },
        { name: 'y', label: 'Top', type: 'number' },
      ], { group: 'Diagram' }),
      area('links', 'Links (one per line, written as: weather > energy)', { group: 'Diagram' }),
      text('ownedLabel', 'Label under each service', { group: 'Diagram' }),
      text('warehouseLabel', 'Label of the middle box', { group: 'Diagram' }),
    ],
  },
  {
    name: 'Architecture diagram',
    slug: 'architecture-diagram',
    kind: 'section',
    fields: [
      list('steps', 'Steps', [
        { name: 'id', label: 'Number', type: 'text' },
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'note', label: 'Note', type: 'text' },
      ]),
      paragraphs('notes', 'Notes beside the diagram'),
    ],
  },
  {
    name: 'System map',
    slug: 'status-map',
    kind: 'section',
    fields: [
      index, heading(), lede,
      list('rows', 'Rows', [
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'role', label: 'Role', type: 'text' },
      ]),
      img('image', 'Picture', { group: 'Picture' }),
      text('alt', 'Picture description', { group: 'Picture' }),
    ],
  },
  {
    name: 'Research cards',
    slug: 'research-grid',
    kind: 'section',
    fields: [
      text('statusLabel', 'Status shown on each card'),
      text('linkLabel', 'Link text'),
      list('items', 'Cards', [
        { name: 'id', label: 'Id (EXP_001)', type: 'text' },
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'body', label: 'Text', type: 'textarea' },
        { name: 'year', label: 'Year', type: 'text' },
        { name: 'url', label: 'Link', type: 'text' },
        { name: 'image', label: 'Picture (optional)', type: 'image' },
        { name: 'alt', label: 'Picture description', type: 'text' },
      ]),
    ],
  },
  {
    name: 'Tool bays',
    slug: 'tool-bays',
    kind: 'section',
    fields: [
      list('items', 'Tools', [
        { name: 'id', label: 'Lab id (LAB_001)', type: 'text' },
        { name: 'role', label: 'Role (NAMING)', type: 'text' },
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'body', label: 'Text', type: 'textarea' },
        { name: 'url', label: 'Link', type: 'text' },
        { name: 'logo', label: 'Logo', type: 'image' },
        { name: 'logoAlt', label: 'Logo description', type: 'text' },
      ]),
      text('openLabel', 'Link text on each bay'),
      area('note', 'Note under the bays'),
    ],
  },
  {
    name: 'Ticker',
    slug: 'ticker',
    kind: 'section',
    fields: [words('items', 'Words that scroll')],
  },
  {
    name: 'Channel cards',
    slug: 'feed-cards',
    kind: 'section',
    fields: [
      text('tag', 'Tag (like CH)'),
      text('kicker', 'Label'),
      list('cards', 'Cards', [
        { name: 'id', label: 'Id (CH_01)', type: 'text' },
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'body', label: 'Text', type: 'textarea' },
      ]),
    ],
  },

  // ---------------------------------------------------------------- collections
  {
    name: 'Times articles',
    slug: 'article',
    kind: 'collection',
    fields: [
      text('title', 'Headline', { required: true }),
      text('dek', 'Standfirst'),
      pick('section', ['Technology', 'Chronicles', 'City', 'Opinion', 'Science', 'Interview'], 'Section'),
      text('byline', 'Byline'),
      text('date', 'Date (year-month-day)'),
      num('minutes', 'Minutes to read'),
      img('image', 'Picture'),
      text('alt', 'Picture description'),
      text('caption', 'Picture caption'),
      list('body', 'Story', [
        { name: 'type', label: 'Block', type: 'select', options: ['p', 'h', 'q', 'quote'] },
        { name: 'text', label: 'Text', type: 'textarea' },
        { name: 'by', label: 'Quote by', type: 'text' },
      ]),
    ],
  },
  {
    name: 'Chronicle volumes',
    slug: 'chronicle-issue',
    kind: 'collection',
    fields: [
      text('title', 'Title', { required: true }),
      text('coverTitle', 'Title on the cover'),
      text('label', 'Volume label'),
      text('author', 'Writer'),
      area('description', 'Description'),
      text('seriesId', 'Series number'),
      text('seriesName', 'Series name'),
      num('order', 'Order on the shelf'),
      img('image', 'Cover'),
      text('alt', 'Cover description'),
      text('focus', 'Cover crop point (like center 30%)'),
      text('pdf', 'PDF link'),
      list('pages', 'Pages (blocks of one page share a page number)', [
        { name: 'page', label: 'Page', type: 'number' },
        { name: 'type', label: 'Block', type: 'select', options: ['kicker', 'title', 'heading', 'prose', 'principle', 'plate', 'table', 'stage', 'credit', 'end', 'colophon', 'epigraph', 'beat', 'screen', 'cast'] },
        { name: 'text', label: 'Text', type: 'textarea' },
        { name: 'image', label: 'Picture', type: 'image' },
        { name: 'alt', label: 'Picture description', type: 'text' },
        { name: 'focus', label: 'Picture crop point', type: 'text' },
        { name: 'shape', label: 'Picture shape', type: 'select', options: ['square'] },
        { name: 'side', label: 'Picture side', type: 'select', options: ['left', 'right'] },
        { name: 'extra', label: 'Extra data (tables, stages, cast, colophon)', type: 'json' },
      ]),
    ],
  },

  // ---------------------------------------------------------------- shared documents
  {
    name: 'Header',
    slug: 'header',
    kind: 'singleton',
    fields: [
      text('brand', 'Brand word'),
      text('brandUrl', 'Brand link'),
      links('links', 'Menu'),
      bool('showClock', 'Show the clock'),
      text('clockZone', 'Clock time zone'),
      text('ctaLabel', 'Button'),
      text('ctaUrl', 'Button link'),
    ],
  },
  {
    name: 'Footer',
    slug: 'footer',
    kind: 'singleton',
    fields: [
      text('brand', 'Name', { group: 'Brand' }),
      text('line', 'Line under the name', { group: 'Brand' }),
      links('links', 'Pages', { group: 'Links' }),
      links('fieldLinks', 'Other sites', { group: 'Links' }),
      list('socials', 'Social links', [
        { name: 'label', label: 'Name', type: 'text' },
        { name: 'url', label: 'Link', type: 'text' },
        { name: 'icon', label: 'Icon', type: 'select', options: ['x', 'github', 'linkedin', 'discord'] },
      ], { group: 'Links' }),
      text('copyright', 'Copyright', { group: 'Sign-off' }),
      text('accessLine', 'Text on the hazard strip', { group: 'Sign-off' }),
    ],
  },
  {
    name: 'Website Settings',
    slug: 'website-settings',
    kind: 'singleton',
    fields: [
      text('siteName', 'Site name', { group: 'Site' }),
      text('siteUrl', 'Site address', { group: 'Site' }),
      text('titleTemplate', 'Page title format', { group: 'Site' }),
      area('description', 'Description', { group: 'Site' }),
      img('favicon', 'Icon', { group: 'Site' }),
      img('shareImage', 'Share picture', { group: 'Site' }),
      text('displayFont', 'Display font', { group: 'Fonts' }),
      text('bodyFont', 'Body font', { group: 'Fonts' }),
      text('monoFont', 'Technical font', { group: 'Fonts' }),
      { name: 'backgroundColor', label: 'Background', type: 'color', group: 'Colors' },
      { name: 'panelColor', label: 'Panel', type: 'color', group: 'Colors' },
      { name: 'textColor', label: 'Text', type: 'color', group: 'Colors' },
      { name: 'mutedColor', label: 'Muted text', type: 'color', group: 'Colors' },
      { name: 'accentColor', label: 'Accent (amber)', type: 'color', group: 'Colors' },
      { name: 'paperColor', label: 'Newspaper paper', type: 'color', group: 'Colors' },
      { name: 'paperInkColor', label: 'Newspaper ink', type: 'color', group: 'Colors' },
      text('openUrl', 'Open Skalle link', { group: 'Links' }),
      text('synxUrl', 'Synx link', { group: 'Links' }),
      text('rtwUrl', 'Real Time Web link', { group: 'Links' }),
      text('discordUrl', 'Discord', { group: 'Links' }),
      text('xUrl', 'X', { group: 'Links' }),
      text('githubUrl', 'GitHub', { group: 'Links' }),
      text('linkedInUrl', 'LinkedIn', { group: 'Links' }),
    ],
  },
  {
    name: 'Spec manual',
    slug: 'spec-manual',
    kind: 'singleton',
    fields: [
      text('title', 'Window title'),
      text('hint', 'Hint line'),
      text('closeLabel', 'Close button'),
      text('boundLabel', 'Line under the picture'),
      img('image', 'Picture'),
      text('imageAlt', 'Picture description'),
      list('jobs', 'Jobs listed at the bottom (the five jobs)', [
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'body', label: 'Text', type: 'textarea' },
      ]),
      list('specs', 'Specs', [
        { name: 'id', label: 'Id', type: 'text' },
        { name: 'short', label: 'Short name', type: 'text' },
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'code', label: 'Code (SPEC_01)', type: 'text' },
        { name: 'kind', label: 'Kind', type: 'text' },
        { name: 'line', label: 'Summary', type: 'textarea' },
        { name: 'log', label: 'Log lines (one per line)', type: 'textarea' },
        { name: 'pros', label: 'Strengths (one per line)', type: 'textarea' },
        { name: 'aliases', label: 'Words that open it (comma separated)', type: 'text' },
      ]),
    ],
  },
];

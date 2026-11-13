/**
 * The content structure of RealTimeWeb.org (the prototype in Desktop/Project/New/therealwebpoc).
 *
 * RTW is a documentation and journal site, so most of its content is long reading, not page-builder blocks:
 *
 *   doc            one documentation page (introduction, MAD architecture, specification...), with its place in the navigation
 *   post           one Journals article
 *   author         the people credited on articles
 *   glossary-term  the terms the site explains in hover hints and the dictionary
 *   pages          the few designed pages: home, Journals index, contact, under the hood
 *   sections       the blocks those pages are made of
 *   header / footer / website-settings / reader-notes   shared, one document each
 *
 * Diagrams are drawn by the site's own code. Documents and posts refer to them by name ("diagram" blocks).
 */
import type { Field } from '../src/fields.js';
import type { TypeDef } from './skalle-schema.js';

type F = Field;
const text = (name: string, label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'text', ...extra });
const area = (name: string, label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'textarea', ...extra });
const num = (name: string, label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'number', ...extra });
const bool = (name: string, label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'boolean', ...extra });
const img = (name: string, label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'image', ...extra });
const color = (name: string, label: string, group: string): F => ({ name, label, type: 'color', group });
const pick = (name: string, options: string[], label?: string, extra: Partial<F> = {}): F => ({ name, label, type: 'select', options, ...extra });
const list = (name: string, label: string, fields: NonNullable<F['fields']>, extra: Partial<F> = {}): F => ({ name, label, type: 'array', fields, ...extra });
const links = (name: string, label: string, extra: Partial<F> = {}) =>
  list(name, label, [
    { name: 'label', label: 'Label', type: 'text' },
    { name: 'url', label: 'Link', type: 'text' },
  ], extra);

export const DOC_STATUS = ['published', 'draft', 'pending'];
export const CATEGORIES = ['Architecture', 'Culture', 'Demo', 'Essay', 'Field notes', 'Network', 'Ownership', 'Vision'];

export const rtwTypes: TypeDef[] = [
  // ---------------------------------------------------------------- documentation
  {
    name: 'Documentation',
    slug: 'doc',
    kind: 'collection',
    fields: [
      text('title', 'Title', { required: true, group: 'Page' }),
      area('description', 'Description (search and share)', { group: 'Page' }),
      pick('status', DOC_STATUS, 'Status', { group: 'Page' }),
      text('path', 'Address (introduction/why, empty for the docs home)', { group: 'Place in the site' }),
      text('group', 'Menu group', { group: 'Place in the site' }),
      text('chapter', 'Chapter', { group: 'Place in the site' }),
      text('navTitle', 'Title in the menu', { group: 'Place in the site' }),
      num('order', 'Order in the menu', { group: 'Place in the site' }),
      bool('nested', 'Shown indented under the page above', { group: 'Place in the site' }),
      list('body', 'Content', [
        { name: 'type', label: 'Block', type: 'select', options: ['markdown', 'diagram', 'spec-status', 'ecosystem-link', 'clarification', 'glossary-table'] },
        { name: 'text', label: 'Text (markdown) or note', type: 'textarea' },
        { name: 'diagram', label: 'Diagram name', type: 'text' },
        { name: 'status', label: 'Status of the note', type: 'select', options: ['published', 'draft', 'pending', 'proposal'] },
        { name: 'to', label: 'Links to', type: 'select', options: ['introduction', 'architecture', 'specification', 'implementation'] },
      ], { group: 'Content' }),
    ],
  },

  // ---------------------------------------------------------------- journals
  {
    name: 'Journal articles',
    slug: 'post',
    kind: 'collection',
    fields: [
      text('title', 'Title', { required: true, group: 'Article' }),
      area('excerpt', 'Excerpt', { group: 'Article' }),
      text('date', 'Date (year-month-day)', { group: 'Article' }),
      pick('category', CATEGORIES, 'Category', { group: 'Article' }),
      num('readingMinutes', 'Minutes to read', { group: 'Article' }),
      bool('archived', 'Held out of Journals', { group: 'Article' }),
      img('cover', 'Cover picture', { group: 'Cover' }),
      text('coverAlt', 'Cover description', { group: 'Cover' }),
      text('author', 'Author', { group: 'Author' }),
      text('authorRole', 'Author role', { group: 'Author' }),
      img('authorImage', 'Author picture', { group: 'Author' }),
      list('body', 'Article', [
        { name: 'type', label: 'Block', type: 'select', options: ['p', 'h2', 'h3', 'list', 'quote', 'figure', 'video', 'diagram', 'faq', 'cards'] },
        { name: 'text', label: 'Text (markdown) or answer', type: 'textarea' },
        { name: 'image', label: 'Picture', type: 'image' },
        { name: 'alt', label: 'Picture description', type: 'text' },
        { name: 'caption', label: 'Caption (or heading of the cards)', type: 'text' },
        { name: 'fit', label: 'Picture fit', type: 'select', options: ['cover', 'contain'] },
        { name: 'videoId', label: 'YouTube video id', type: 'text' },
        { name: 'title', label: 'Video title', type: 'text' },
        { name: 'diagram', label: 'Diagram name', type: 'text' },
        { name: 'question', label: 'Question', type: 'text' },
      ], { group: 'Article' }),
    ],
  },
  {
    name: 'Authors',
    slug: 'author',
    kind: 'collection',
    fields: [
      text('name', 'Name', { required: true }),
      text('role', 'Role'),
      img('image', 'Picture'),
      text('linkedin', 'LinkedIn'),
      num('order', 'Order'),
    ],
  },
  {
    name: 'Glossary terms',
    slug: 'glossary-term',
    kind: 'collection',
    fields: [
      text('term', 'Term', { required: true }),
      text('termId', 'Id used by hints (ghost-space)'),
      area('def', 'Definition'),
      text('href', 'Read more link'),
      num('order', 'Order'),
    ],
  },

  // ---------------------------------------------------------------- designed pages
  {
    name: 'Pages',
    slug: 'pages',
    kind: 'page',
    fields: [text('title', 'Page title', { required: true }), area('description', 'Search and share description')],
  },
  {
    name: 'Landing hero',
    slug: 'landing-hero',
    kind: 'section',
    fields: [
      text('kicker', 'Small label', { group: 'Copy' }),
      area('title', 'Title (a new line breaks the title, *stars* make a word italic)', { group: 'Copy' }),
      area('lede', 'Intro', { group: 'Copy' }),
      text('ctaLabel', 'Button', { group: 'Button' }),
      text('ctaUrl', 'Button link', { group: 'Button' }),
      img('image', 'Background picture', { group: 'Picture' }),
      text('imageAlt', 'Picture description', { group: 'Picture' }),
    ],
  },
  {
    name: 'Page intro',
    slug: 'page-intro',
    kind: 'section',
    fields: [text('kicker', 'Small label'), text('title', 'Title', { required: true }), area('lede', 'Intro')],
  },
  {
    name: 'Contact form',
    slug: 'contact-form',
    kind: 'section',
    fields: [
      text('nameLabel', 'Name label', { group: 'Labels' }),
      text('emailLabel', 'Email label', { group: 'Labels' }),
      text('reasonLabel', 'Reason label', { group: 'Labels' }),
      text('messageLabel', 'Message label', { group: 'Labels' }),
      text('sendLabel', 'Send button', { group: 'Labels' }),
      text('sendingLabel', 'Send button while sending', { group: 'Labels' }),
      text('errorText', 'Message when sending fails', { group: 'Labels' }),
      list('topics', 'Reasons to choose from', [{ name: 'text', label: 'Reason', type: 'text' }]),
    ],
  },
  {
    name: 'Under revision',
    slug: 'under-revision',
    kind: 'section',
    fields: [text('kicker', 'Small label'), text('title', 'Title'), text('text', 'Text')],
  },

  // ---------------------------------------------------------------- shared documents
  {
    name: 'Header',
    slug: 'header',
    kind: 'singleton',
    fields: [
      text('brand', 'Brand word'),
      links('links', 'Menu'),
    ],
  },
  {
    name: 'Footer',
    slug: 'footer',
    kind: 'singleton',
    fields: [
      text('brand', 'Name', { group: 'Brand' }),
      area('about', 'Text under the name', { group: 'Brand' }),
      text('column1Title', 'Column 1 title', { group: 'Column 1' }),
      links('column1Links', 'Column 1 links', { group: 'Column 1' }),
      text('column2Title', 'Column 2 title', { group: 'Column 2' }),
      links('column2Links', 'Column 2 links', { group: 'Column 2' }),
      text('column3Title', 'Column 3 title', { group: 'Column 3' }),
      list('column3Lines', 'Column 3 lines', [{ name: 'text', label: 'Text', type: 'text' }], { group: 'Column 3' }),
      text('copyright', 'Copyright line', { group: 'Legal' }),
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
      area('shareDescription', 'Description when shared', { group: 'Site' }),
      text('sansFont', 'Body font', { group: 'Fonts' }),
      text('serifFont', 'Headline font', { group: 'Fonts' }),
      text('monoFont', 'Technical font', { group: 'Fonts' }),
      text('displayFont', 'Display font', { group: 'Fonts' }),
      text('pixelFont', 'Pixel font', { group: 'Fonts' }),
      color('darkBackground', 'Background', 'Dark theme'),
      color('darkPanel', 'Panel', 'Dark theme'),
      color('darkText', 'Text', 'Dark theme'),
      color('darkMuted', 'Muted text', 'Dark theme'),
      color('darkAccent', 'Accent', 'Dark theme'),
      color('darkWarn', 'Warning', 'Dark theme'),
      color('lightBackground', 'Background', 'Light theme'),
      color('lightPanel', 'Panel', 'Light theme'),
      color('lightText', 'Text', 'Light theme'),
      color('lightMuted', 'Muted text', 'Light theme'),
      color('lightAccent', 'Accent', 'Light theme'),
      color('lightWarn', 'Warning', 'Light theme'),
    ],
  },
  {
    name: 'Reader notes',
    slug: 'reader-notes',
    kind: 'singleton',
    fields: [
      list('specStatus', 'Page status notes', [
        { name: 'status', label: 'Status', type: 'select', options: ['published', 'draft', 'pending', 'proposal'] },
        { name: 'label', label: 'Label', type: 'text' },
        { name: 'text', label: 'Note', type: 'textarea' },
      ]),
      list('ecosystemLinks', 'Cards that point to another part of the docs', [
        { name: 'to', label: 'Id', type: 'select', options: ['introduction', 'architecture', 'specification', 'implementation'] },
        { name: 'kicker', label: 'Small label', type: 'text' },
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'url', label: 'Link', type: 'text' },
        { name: 'label', label: 'Link text', type: 'text' },
      ]),
      list('clarification', 'Clarification banner', [{ name: 'text', label: 'Paragraph', type: 'textarea' }]),
      text('journalsKicker', 'Journals: continue reading label'),
      text('journalsBack', 'Journals: back link'),
    ],
  },
];

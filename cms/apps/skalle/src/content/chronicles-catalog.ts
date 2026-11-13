import type { ChronicleBlock } from "./chronicles";

export type Issue = {
  id: string;
  label: string;
  author: string;
  coverTitle: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  focus: string;
  slug?: string;
  pdf?: string;
  pages?: ChronicleBlock[][];
};

export type Series = {
  id: string;
  name: string;
  issues: Issue[];
};

export type ReadableIssue = Issue & { slug: string; pages: ChronicleBlock[][] };

/** The Chronicles shelf. The volumes live in the CMS; setChronicles() fills these lists before the page is drawn. */
export const shelf: Series[] = [];
export let writers: string[] = [];
export let readableIssues: ReadableIssue[] = [];

type Row = Record<string, any>;

/** A CMS volume keeps its pages as one flat list of blocks, each with a page number. This puts them back into pages. */
function pagesOf(rows: Row[] = []): ChronicleBlock[][] {
  const pages: ChronicleBlock[][] = [];
  for (const r of rows) {
    const at = Math.max(1, Number(r.page) || 1) - 1;
    while (pages.length <= at) pages.push([]);
    let block: Row;
    if (r.type === "plate") {
      block = { type: "plate", src: r.image ?? "", alt: r.alt ?? "" };
      if (r.focus) block.focus = r.focus;
      if (r.shape) block.shape = r.shape;
      if (r.side) block.side = r.side;
    } else if (["table", "stage", "colophon", "cast"].includes(r.type)) {
      block = { type: r.type, ...(r.extra ?? {}) };
    } else {
      block = { type: r.type, text: r.text ?? "" };
    }
    pages[at].push(block as ChronicleBlock);
  }
  return pages.filter((p) => p.length);
}

export function setChronicles(docs: Row[]) {
  const bySeries = new Map<string, Series>();
  for (const d of [...docs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    const sid = String(d.seriesId || d.slug);
    if (!bySeries.has(sid)) bySeries.set(sid, { id: sid, name: d.seriesName || d.title, issues: [] });
    bySeries.get(sid)!.issues.push({
      id: d.slug, label: d.label ?? "", author: d.author ?? "", coverTitle: d.coverTitle ?? d.title, title: d.title,
      description: d.description ?? "", image: d.image ?? "", alt: d.alt ?? "", focus: d.focus ?? "center", slug: d.slug, pdf: d.pdf,
      pages: pagesOf(d.pages),
    });
  }
  shelf.splice(0, shelf.length, ...bySeries.values());
  writers = [...new Set(shelf.flatMap((series) => series.issues.map((issue) => issue.author)))];
  readableIssues = shelf.flatMap((series) => series.issues).filter(isReadable);
}

export function isReadable(issue: Issue): issue is ReadableIssue {
  return Boolean(issue.slug && issue.pages?.length);
}

export function findIssue(slug: string) {
  return readableIssues.find((issue) => issue.slug === slug);
}

export function seriesOf(issue: Issue) {
  return shelf.find((series) => series.issues.includes(issue));
}

export const pdfHref = (slug: string) => findIssue(slug)?.pdf ?? `/chronicles/pdf/${slug}.pdf`;

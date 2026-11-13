import { TermHint } from "@/components/TermHint";

type Term = { id: string; term: string; def: string; href?: string };

/** The terms live in the CMS ("Glossary terms"); setGlossary() fills this list before the page is drawn. */
export const glossary: Term[] = [];
export function setGlossary(items: Record<string, any>[]) {
  glossary.splice(0, glossary.length, ...items.map((t) => ({ id: t.termId || t.slug, term: t.term, def: t.def ?? "", href: t.href || undefined })));
}

export function GlossaryTerm({ id, children }: { id: string; children?: React.ReactNode }) {
  return <TermHint id={id}>{children}</TermHint>;
}

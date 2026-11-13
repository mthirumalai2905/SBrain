import Link from "next/link";
import { ClarificationBanner } from "@/components/ClarificationBanner";
import { DocPager } from "@/components/DocPager";
import { DocsShell } from "@/components/DocsShell";
import { EcosystemLink } from "@/components/EcosystemLink";
import { GlossaryTable } from "@/components/GlossaryTable";
import { OnThisPage } from "@/components/OnThisPage";
import { SpecStatus } from "@/components/SpecStatus";
import { getDoc } from "@/lib/docs";
import { edit } from "@/lib/cms";
import { Markdown } from "./Markdown";
import { diagrams } from "./registry";

/** One documentation page: its title, a status note when it is not final, its blocks in order, and the previous/next links. */
export function DocPage({ slug }: { slug: string[] }) {
  const doc = getDoc(slug);
  if (!doc) return <NotFound />;
  const status = doc.frontmatter.status ?? "published";
  const pathname = slug.length ? `/docs/${slug.join("/")}` : "/docs";

  return (
    <DocsShell>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px]">
        <article className="min-w-0 px-4 py-8 sm:px-5 sm:py-12 md:px-8 lg:px-10 lg:py-16">
          <p className="mb-3 font-mono text-[11px] tracking-[0.16em] text-[var(--muted)]">{pathname === "/docs" ? "ABOUT RTW" : "DOCUMENTATION"}</p>
          <div className="prose-rtw">
            {status !== "published" ? <SpecStatus status={status === "draft" ? "draft" : "pending"} /> : null}
            <h1 {...edit("title")}>{doc.frontmatter.title}</h1>
            {doc.frontmatter.description ? <p className="lead" {...edit("description")}>{doc.frontmatter.description}</p> : null}
            {doc.blocks.map((b, i) => {
              switch (b.type) {
                case "markdown":
                  return <div key={i} style={{ display: "contents" }} {...edit(`body.${i}.text`)}><Markdown text={b.text ?? ""} /></div>;
                case "diagram": {
                  const Diagram = diagrams[b.diagram ?? ""];
                  return Diagram ? <Diagram key={i} /> : null;
                }
                case "spec-status":
                  return <SpecStatus key={i} status={(b.status as "published") ?? "draft"}>{b.text || undefined}</SpecStatus>;
                case "ecosystem-link":
                  return <EcosystemLink key={i} to={(b.to as "introduction") ?? "architecture"}>{b.text || undefined}</EcosystemLink>;
                case "clarification":
                  return <ClarificationBanner key={i} />;
                case "glossary-table":
                  return <GlossaryTable key={i} />;
                default:
                  return null;
              }
            })}
            <DocPager pathname={pathname} />
          </div>
        </article>
        <aside className="hidden border-l border-[var(--line)] xl:block">
          <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] px-4 py-10">
            <OnThisPage />
          </div>
        </aside>
      </div>
    </DocsShell>
  );
}

export function NotFound() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-24 text-center">
      <p className="font-mono text-[11px] tracking-[0.22em] text-[var(--accent)]">NOT PUBLISHED</p>
      <h1 className="font-serif mt-4 text-4xl text-[var(--ink)]">This page is not published</h1>
      <Link href="/docs" className="mt-8 inline-block text-[var(--accent)]">Back to the documentation</Link>
    </main>
  );
}

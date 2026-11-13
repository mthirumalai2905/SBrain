import type { ComponentType, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "@/lib/Link";
import { TermHint } from "@/components/TermHint";

const slugify = (value: unknown) =>
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const textOf = (node: ReactNode): string =>
  typeof node === "string" ? node : Array.isArray(node) ? node.map(textOf).join("") : node && typeof node === "object" && "props" in node ? textOf((node as { props: { children?: ReactNode } }).props.children) : "";

/** The MDX of the original wrote a glossary hint as <GlossaryTerm id="x">text</GlossaryTerm>. Markdown has no such tag, so it travels as a link. */
const hintsToLinks = (md: string) => md.replace(/<GlossaryTerm id="([^"]+)">([\s\S]*?)<\/GlossaryTerm>/g, (_m, id, inner) => `[${inner}](glossary:${id})`);

function A({ href, children }: { href?: string; children?: ReactNode }) {
  if (href?.startsWith("glossary:")) return <TermHint id={href.slice("glossary:".length)}>{children}</TermHint>;
  if (href?.startsWith("/")) return <Link href={href}>{children}</Link>;
  return <a href={href}>{children}</a>;
}

const heading = (Tag: "h2" | "h3") =>
  function Heading({ children }: { children?: ReactNode }) {
    return <Tag id={slugify(textOf(children))}>{children}</Tag>;
  };

/** Markdown the way the docs and the articles use it. `components` lets an article restyle paragraphs, lists and headings. */
export function Markdown({ text, components }: { text: string; components?: Record<string, ComponentType<any>> }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={(url) => url}
      components={{ a: A as ComponentType<any>, h2: heading("h2") as ComponentType<any>, h3: heading("h3") as ComponentType<any>, ...components }}
    >
      {hintsToLinks(text)}
    </ReactMarkdown>
  );
}

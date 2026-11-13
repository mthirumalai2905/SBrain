import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { AuthorByline } from "@/components/blog/AuthorByline";
import { ContributorInvite } from "@/components/blog/ContributorInvite";
import { CornerMarks } from "@/components/CornerMarks";
import { Figure } from "@/components/Figure";
import { VideoEmbed } from "@/components/VideoEmbed";
import { formatPostDate, getPost, getRelated, posts, type PostBlock } from "@/lib/blog";
import { notes } from "@/lib/notes";
import { edit, useShared, type Sec } from "@/lib/cms";
import { Markdown } from "./Markdown";
import { diagrams } from "./registry";
import { NotFound } from "./Docs";

/** Journals: the index of articles, under the page intro. */
export function BlogPage({ intro }: { intro?: Sec }) {
  return (
    <main className="mx-auto max-w-[1320px] px-4 py-10 sm:py-14 md:px-6 md:py-16 xl:py-20">
      <BlogIndex posts={posts} intro={intro} />
    </main>
  );
}

const p1 = "text-[18px] leading-8 text-[var(--ink)]";
const pn = "mt-6 text-[17px] leading-8 text-[var(--ink)]";

function Body({ b, first, i }: { b: PostBlock; first: boolean; i: number }) {
  const text = b.text ?? "";
  const path = edit(`body.${i}.text`);
  switch (b.type) {
    case "p":
      return <div style={{ display: "contents" }} {...path}><Markdown text={text} components={{ p: ({ children }: { children?: ReactNode }) => <p className={first ? p1 : pn}>{children}</p> }} /></div>;
    case "h2":
      return <h2 className="mt-14 border-t border-[var(--line)] pt-8 font-serif text-[1.7rem] leading-tight text-[var(--ink)]" {...path}>{text}</h2>;
    case "h3":
      return <h3 className="mt-10 font-serif text-[1.3rem] leading-tight text-[var(--ink)]" {...path}>{text}</h3>;
    case "list":
      return (
        <div style={{ display: "contents" }} {...path}>
          <Markdown
            text={text}
            components={{
              ul: ({ children }: { children?: ReactNode }) => <ul className="mt-6 list-disc space-y-2 pl-6 text-[17px] leading-8 text-[var(--ink)]">{children}</ul>,
              ol: ({ children }: { children?: ReactNode }) => <ol className="mt-6 list-decimal space-y-2 pl-6 text-[17px] leading-8 text-[var(--ink)]">{children}</ol>,
            }}
          />
        </div>
      );
    case "quote":
      return (
        <blockquote className="mt-8 border-l-2 border-[var(--accent)] pl-5 font-serif text-[1.3rem] leading-snug text-[var(--ink)]" {...path}>
          <Markdown text={text} components={{ p: ({ children }: { children?: ReactNode }) => <p className="mt-2 first:mt-0">{children}</p> }} />
        </blockquote>
      );
    case "figure":
      return b.image ? <Figure src={b.image} alt={b.alt ?? ""} caption={b.caption} fit={b.fit === "contain" ? "contain" : "cover"} /> : null;
    case "video":
      return b.videoId ? <VideoEmbed videoId={b.videoId} title={b.title ?? ""} caption={b.caption} /> : null;
    case "diagram": {
      const Diagram = diagrams[b.diagram ?? ""];
      return Diagram ? <Diagram /> : null;
    }
    case "faq":
      return (
        <details className="border-b border-[var(--line)] py-4">
          <summary className="cursor-pointer list-none text-[16px] text-[var(--ink)]">
            <span className="flex items-start justify-between gap-4">
              <span {...edit(`body.${i}.question`)}>{b.question}</span>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Open</span>
            </span>
          </summary>
          <div className="mt-3 text-[15px] leading-7 text-[var(--muted)]" {...path}>
            <Markdown text={text} />
          </div>
        </details>
      );
    case "cards": {
      const rows = text.split("\n").map((r) => r.split(" | "));
      return (
        <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
          <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{b.caption}</div>
          <div className="grid gap-px bg-[var(--line)] md:grid-cols-3">
            {rows.map(([kicker, name, role, action]) => (
              <div key={name} className="bg-[var(--bg)] p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">{kicker}</div>
                <div className="mt-2 text-[16px] text-[var(--ink)]">{name}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{role}</p>
                <p className="mt-3 font-mono text-[11px] text-[var(--muted)]">{action}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

/** One Journals article: the cover and title, the article, an invitation to write, and a few more to read. */
export function PostPage({ slug }: { slug: string }) {
  const post = getPost(slug);
  const { authors } = useShared();
  if (!post) return <NotFound />;
  const related = getRelated(post.slug);
  const author = authors.find((a) => a.name === post.author);
  const firstParagraph = post.body.findIndex((b) => b.type === "p");

  return (
    <article className="pb-20">
      <header className="border-b border-[var(--line)]">
        <div className="relative mx-auto mt-4 max-w-[1200px] overflow-hidden rounded-[4px] sm:mt-8">
          <div className="relative h-[min(78vw,340px)] min-h-[260px] md:h-[360px] xl:h-[420px]">
            <Image src={post.cover} alt={post.coverAlt} fill priority className="object-cover" sizes="1100px" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
            <CornerMarks />
            <div className="relative z-10 flex h-full max-w-[860px] flex-col justify-end px-5 pb-6 md:px-8 md:pb-8">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-white/70">
                <Link href="/blog" className="hover:text-white">Journals</Link>
                <span className="mx-2">/</span>
                {post.category}
              </p>
              <h1 className="mt-3 font-serif text-[1.7rem] leading-tight tracking-tight text-white sm:text-3xl md:text-[42px] md:leading-[1.08]" {...edit("title")}>{post.title}</h1>
              <p className="mt-3 line-clamp-4 max-w-2xl text-[14px] leading-6 text-white/80 sm:text-[15px] sm:leading-7 md:line-clamp-none" {...edit("excerpt")}>{post.excerpt}</p>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-white/55">
                {post.author ? `${post.author} · ` : "Real Time Web · "}
                {formatPostDate(post.date)} · {post.readingMinutes} min read
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="reading-col mx-auto px-4 py-12 md:px-0">
        {author ? <AuthorByline name={author.name} image={author.image} linkedin={author.linkedin} role={author.role} /> : null}
        {post.body.map((b, i) => <Body key={i} b={b} i={i} first={i === firstParagraph || (firstParagraph < 0 && i === 0)} />)}
        <ContributorInvite />
        <div className="mt-14 border-t border-[var(--line)] pt-8">
          <Link href="/blog" className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">{notes.journalsBack ?? "← All articles"}</Link>
        </div>
      </div>

      {related.length ? (
        <aside className="mx-auto max-w-[1100px] px-4 md:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{notes.journalsKicker ?? "Continue reading"}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <Link key={item.slug} href={`/blog/${item.slug}`} className="group block">
                <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-[4px]">
                  <Image src={item.cover} alt={item.coverAlt} fill className="object-cover transition duration-700 group-hover:scale-[1.05]" sizes="320px" />
                  <CornerMarks />
                </div>
                <h2 className="font-serif text-lg leading-snug text-[var(--ink)] group-hover:text-[var(--accent)]">{item.title}</h2>
              </Link>
            ))}
          </div>
        </aside>
      ) : null}
    </article>
  );
}

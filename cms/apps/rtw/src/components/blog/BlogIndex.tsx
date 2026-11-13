"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutGrid, Rows3 } from "lucide-react";
import { clsx } from "clsx";
import { formatPostDate, type BlogPost } from "@/lib/blog";
import { CornerMarks } from "@/components/CornerMarks";
import { AuthorAvatar } from "@/components/blog/AuthorAvatar";

type View = "grid" | "container";

export function BlogIndex({ posts, intro }: { posts: BlogPost[]; intro?: Record<string, any> }) {
  const [view, setView] = useState<View>("container");

  useEffect(() => {
    const stored = localStorage.getItem("rtw-blog-view");
    if (stored === "grid" || stored === "container") setView(stored);
  }, []);

  function choose(next: View) {
    setView(next);
    localStorage.setItem("rtw-blog-view", next);
  }

  const [featured, ...rest] = posts;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">{intro?.kicker}</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-[var(--ink)] md:text-5xl">
            {intro?.title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
            {intro?.lede}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-[var(--line)] p-1">
          <button
            type="button"
            onClick={() => choose("grid")}
            aria-pressed={view === "grid"}
            aria-label="Show as grid"
            className={clsx(
              "flex h-8 items-center gap-2 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.14em]",
              view === "grid" ? "bg-[var(--accent-dim)] text-[var(--ink)]" : "text-[var(--muted)]",
            )}
          >
            <LayoutGrid size={13} />
            Grid
          </button>
          <button
            type="button"
            onClick={() => choose("container")}
            aria-pressed={view === "container"}
            aria-label="Show as container"
            className={clsx(
              "flex h-8 items-center gap-2 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.14em]",
              view === "container" ? "bg-[var(--accent-dim)] text-[var(--ink)]" : "text-[var(--muted)]",
            )}
          >
            <Rows3 size={13} />
            Container
          </button>
        </div>
      </div>

      {featured ? (
        <Link href={`/blog/${featured.slug}`} className="group mt-10 block">
          <article className="relative overflow-hidden rounded-[4px]">
            <div className="relative h-[240px] md:h-[320px] xl:h-[400px]">
              <Image
                src={featured.cover}
                alt={featured.coverAlt}
                fill
                priority
                className="object-cover transition duration-[1.2s] group-hover:scale-[1.03]"
                sizes="(min-width: 1100px) 1100px, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <CornerMarks />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
                  {featured.category} · {formatPostDate(featured.date)}
                </p>
                <h2 className="mt-2 max-w-3xl font-serif text-2xl leading-tight text-white md:text-4xl">
                  {featured.title}
                </h2>
                <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-white/75">{featured.excerpt}</p>
                {featured.author ? (
                  <div className="mt-3 flex items-center gap-2">
                    {featured.authorImage ? (
                      <AuthorAvatar src={featured.authorImage} alt={featured.author} size={28} />
                    ) : null}
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
                      {featured.author}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        </Link>
      ) : null}

      {view === "grid" ? (
        <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <ArticleCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {rest.map((post) => (
            <ArticleRow key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex h-full">
      <article className="relative flex h-full w-full flex-col overflow-hidden rounded-[4px]">
        <div className="relative aspect-[16/10] w-full">
          <Image
            src={post.cover}
            alt={post.coverAlt}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
            sizes="(min-width: 1024px) 360px, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/30 to-black/0" />
          <CornerMarks />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[136px] flex-col justify-end p-4">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-white/65">
            {post.category} · {formatPostDate(post.date)}
          </p>
          <h2 className="mt-2 line-clamp-2 min-h-[2.75rem] font-serif text-[1.25rem] leading-snug text-white xl:text-[1.35rem]">
            {post.title}
          </h2>
          {post.author ? (
            <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
              {post.author}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

function ArticleRow({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="grid overflow-hidden rounded-[4px] bg-[var(--bg-elev)] md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[120px]">
          <Image
            src={post.cover}
            alt={post.coverAlt}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.03]"
            sizes="180px"
          />
          <CornerMarks />
        </div>
        <div className="flex flex-col justify-center px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            {post.category} · {formatPostDate(post.date)} · {post.readingMinutes} min
          </p>
          <h2 className="mt-1 font-serif text-xl leading-snug text-[var(--ink)] group-hover:text-[var(--accent)] xl:text-2xl">
            {post.title}
          </h2>
          {post.author ? (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {post.author}
            </p>
          ) : null}
          <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-6 text-[var(--muted)] xl:text-base xl:leading-7">{post.excerpt}</p>
        </div>
      </article>
    </Link>
  );
}

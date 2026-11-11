"use client";

import { useEffect, useRef, useState } from "react";
import { isIos } from "@/lib/ios";
import type { Category, Post, Source } from "@/lib/posts";

function SourceMark({ source }: { source: Source }) {
  if (source === "X") {
    return (
      <svg className="feed-mark" viewBox="0 0 16 16" aria-label="X">
        <path fill="currentColor" d="M9.2 7.2 13.6 2h-1.1L8.7 6.4 5.6 2H2.1l4.6 6.6L2.3 14h1.1l4-4.7L10.6 14h3.5L9.2 7.2Zm-1.4 1.6-.5-.6L3.7 2.8h1.6l3.1 4.4.5.6 3.7 5.3h-1.6L7.8 8.8Z" />
      </svg>
    );
  }
  if (source === "Reddit") {
    return (
      <svg className="feed-mark" viewBox="0 0 16 16" aria-label="Reddit">
        <circle cx="8" cy="8.4" r="5.2" fill="#ff4500" />
        <circle cx="6.2" cy="8.2" r="0.7" fill="#fff" />
        <circle cx="9.8" cy="8.2" r="0.7" fill="#fff" />
        <path d="M6 10.2c.6.6 1.3.8 2 .8s1.4-.2 2-.8" fill="none" stroke="#fff" strokeWidth="0.6" strokeLinecap="round" />
        <circle cx="11.6" cy="4.6" r="1.1" fill="#ff4500" />
      </svg>
    );
  }
  if (source === "Medium") {
    return (
      <svg className="feed-mark" viewBox="0 0 16 16" aria-label="Medium">
        <circle cx="8" cy="8" r="7" fill="#fff" />
        <path fill="#111" d="M4.1 11.2V4.8h1.3l2.6 4.1 2.6-4.1h1.3v6.4h-1.1V6.6L8.1 10.6H7.9L5.2 6.6v4.6H4.1Z" />
      </svg>
    );
  }
  if (source === "Journal" || source === "Synx") {
    return (
      <svg className="feed-mark journal" viewBox="0 0 16 16" aria-label={source}>
        <path fill="none" stroke="currentColor" strokeWidth="1.2" d="M3.2 2.2h7.1A2.2 2.2 0 0 1 12.5 4.4V13H5.1A1.9 1.9 0 0 0 3.2 14.9V2.2Z" />
        <path fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" d="M5.4 5.4h5M5.4 7.6h5M5.4 9.8h3.2" />
      </svg>
    );
  }
  return (
    <svg className="feed-mark" viewBox="0 0 16 16" aria-label="LinkedIn">
      <rect x="1" y="1" width="14" height="14" fill="#0a66c2" />
      <path fill="#fff" d="M4.2 6.6h1.6v5.2H4.2V6.6zm.8-2.5a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9zM7.2 6.6h1.5v.7h.1c.2-.4.8-.8 1.6-.8 1.7 0 2 1.1 2 2.6v2.7H11v-2.4c0-.6 0-1.3-.8-1.3s-.9.6-.9 1.3v2.4H7.2V6.6z" />
    </svg>
  );
}

function CardBody({ post }: { post: Post }) {
  const label = post.slug || post.source === "Journal" || post.source === "Medium" ? "Read" : "Visit";
  return (
    <>
      <header>
        <img className="feed-avatar" src={post.photo} alt="" />
        <span className="feed-who">
          <strong>{post.name}</strong>
          <span>{post.source}</span>
        </span>
        {post.featured ? (
          <span className="feed-edit">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path fill="currentColor" d="M8 1.2 9.7 5.4l4.5.4-3.4 2.9.1 4.5L8 11.2 4.1 13.2l1-4.5L1.8 5.8l4.5-.4L8 1.2Z" />
            </svg>
            <span>Editorial</span>
          </span>
        ) : null}
      </header>
      <span className="feed-cat">{post.category}</span>
      {post.title ? <strong className="feed-title">{post.title}</strong> : null}
      <p>{post.text}</p>
      <span className="feed-meta">
        <SourceMark source={post.source} />
        <span>{label}</span>
        {post.when ? <time>{post.when}</time> : null}
      </span>
    </>
  );
}

function spreadPosts(posts: Post[], count = 4) {
  const rank = (name: string) => {
    if (name.startsWith("Paal")) return 0;
    if (name === "Synx") return 1;
    if (name.startsWith("Thiru")) return 2;
    return 3;
  };
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const list = groups.get(post.name) ?? [];
    list.push(post);
    groups.set(post.name, list);
  }
  const names = [...groups.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const cols: Post[][] = Array.from({ length: count }, () => []);
  const pending = () => names.some((name) => (groups.get(name)?.length ?? 0) > 0);
  while (pending()) {
    for (const name of names) {
      const queue = groups.get(name);
      if (!queue?.length) continue;
      let choice = -1;
      for (let index = 0; index < count; index += 1) {
        const last = cols[index][cols[index].length - 1];
        if (last?.name === name) continue;
        if (choice === -1 || cols[index].length < cols[choice].length) choice = index;
      }
      if (choice === -1) {
        choice = cols.reduce((best, col, index) => (col.length < cols[best].length ? index : best), 0);
      }
      cols[choice].push(queue.shift() as Post);
    }
  }
  return cols.filter((col) => col.length > 0);
}

function openPost(href: string) {
  const width = 560;
  const height = 780;
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
  const popup = window.open(
    href,
    "synx-post",
    `popup=yes,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`,
  );
  if (popup) popup.opener = null;
}

function PostCard({ post, index }: { post: Post; index: number }) {
  const className = post.featured ? "feed-card featured" : "feed-card";
  const href = post.slug ? `/news/${post.slug}` : post.href;
  return (
    <a
      className={className}
      data-feed-index={index}
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        // iPhone Safari turns this sized popup into a blank white page.
        if (isIos()) return;
        event.preventDefault();
        openPost(href);
      }}
    >
      <CardBody post={post} />
    </a>
  );
}

const previewCount = 6;

function orderColumns(columns: Post[][]) {
  const rows = Math.max(0, ...columns.map((column) => column.length));
  const ordered = columns.map((column) => column.map((post) => ({ post, index: -1 })));
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns.length; column += 1) {
      const post = columns[column][row];
      if (!post) continue;
      ordered[column][row] = { post, index };
      index += 1;
    }
  }
  return ordered;
}

type FeedProps = {
  posts: Post[];
  only?: Category;
  expanded?: boolean;
  page?: boolean;
  kicker?: string;
  title?: string;
  intro?: string;
};

export function LinkedInFeed({
  posts,
  only,
  expanded = false,
  page = false,
  kicker = "Company posts",
  title = "Signals from Synx",
  intro = "From the people building Synx. The tools, the work, and the partnerships taking the Real Time Web from an idea into a network.",
}: FeedProps) {
  const [open, setOpen] = useState(expanded);
  const wallRef = useRef<HTMLDivElement>(null);
  const [cut, setCut] = useState<number | null>(null);
  const columns = orderColumns(spreadPosts(only ? posts.filter((post) => post.category === only) : posts));
  const Heading = page ? "h1" : "h2";
  const total = columns.reduce((sum, column) => sum + column.length, 0);
  const folded = !open && total > previewCount;

  useEffect(() => {
    if (!folded) return;
    const measure = () => {
      const wall = wallRef.current;
      const card = wall?.querySelector<HTMLElement>(`[data-feed-index="${previewCount - 1}"]`);
      if (!wall || !card) return;
      const next = card.getBoundingClientRect().bottom - wall.getBoundingClientRect().top;
      setCut(next + 150);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [folded]);

  return (
    <section className={page ? "feed feed-page" : "feed"} id="feed" aria-label="Posts">
      <div className="wrap">
        <div className="feed-head">
          <div className="section-kicker">{kicker}</div>
          <Heading>{title}</Heading>
          <p>{intro}</p>
        </div>
        <div className={folded ? "feed-fold is-closed" : "feed-fold"}>
          <div className="feed-wall" ref={wallRef} style={folded && cut ? { maxHeight: cut } : undefined}>
            {columns.map((column) => (
              <div className="feed-col" key={column[0]?.post.slug ?? column[0]?.post.href}>
                {column.map(({ post, index }) => (
                  <PostCard key={post.slug ?? post.href} post={post} index={index} />
                ))}
              </div>
            ))}
          </div>
          {folded ? <div className="feed-fade" aria-hidden="true"></div> : null}
          {folded ? (
            <button className="feed-read" type="button" onClick={() => setOpen(true)}>
              Read more
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

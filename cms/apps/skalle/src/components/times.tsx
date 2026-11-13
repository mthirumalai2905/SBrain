"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { articles, formatDate, sections, type Article } from "@/content/articles";

function localToday() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function subscribeToday(update: () => void) {
  let timer = 0;
  const schedule = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    timer = window.setTimeout(() => {
      update();
      schedule();
    }, midnight.getTime() - now.getTime());
  };
  const wake = () => {
    if (document.visibilityState === "visible") update();
  };
  schedule();
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("focus", update);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("focus", update);
  };
}

export function TimesToday({ fallback }: { fallback: string }) {
  const today = useSyncExternalStore(subscribeToday, localToday, () => fallback);
  return (
    <time dateTime={today} suppressHydrationWarning>
      {formatDate(today, "long")}
    </time>
  );
}

export function TimesCard({ article }: { article: Article }) {
  return (
    <li className="tt-card">
      <Link href={`/articles/${article.slug}`}>
        <div className="tt-card-top">
          <time dateTime={article.date}>{formatDate(article.date)}</time>
          <span className="tt-pill">{article.section}</span>
        </div>
        <img src={article.image} alt={article.alt} />
        <h2>{article.title}</h2>
        <p>{article.dek}</p>
        <div className="tt-card-meta">
          <span>
            <b>Text</b> {article.byline}
          </span>
          <span>
            <b>Duration</b> {article.minutes} min
          </span>
        </div>
      </Link>
    </li>
  );
}

export function TimesFront() {
  const params = useSearchParams();
  const initial = params.get("section");
  const [section, setSection] = useState<string | null>(initial && sections.includes(initial) ? initial : null);
  const list = section ? articles.filter((article) => article.section === section) : articles;

  function choose(next: string | null) {
    setSection(next);
    window.history.replaceState(null, "", next ? `/articles?section=${encodeURIComponent(next)}` : "/articles");
  }

  return (
    <>
      <div className="tt-sections" role="toolbar" aria-label="Sections">
        <p>Sections</p>
        <div>
          <button type="button" aria-pressed={section === null} onClick={() => choose(null)}>
            All
          </button>
          {sections.map((name) => (
            <button key={name} type="button" aria-pressed={section === name} onClick={() => choose(name)}>
              {name}
            </button>
          ))}
        </div>
      </div>
      <ul className="tt-grid" aria-live="polite">
        {list.map((article) => (
          <TimesCard key={article.slug} article={article} />
        ))}
      </ul>
    </>
  );
}

export function TimesShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function share() {
    const url = window.location.href.split("#")[0];
    try {
      if (window.matchMedia("(pointer: coarse)").matches && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button type="button" className="tt-share" onClick={share}>
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}

export function TimesPrint() {
  return (
    <button type="button" className="tt-share" onClick={() => window.print()}>
      Print
    </button>
  );
}

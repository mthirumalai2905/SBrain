import Link from "@/lib/Link";
import { TimesCard, TimesPrint, TimesShare, TimesToday } from "@/components/times";
import { articles, findArticle, formatDate, paperName, sections, type ArticleBlock } from "@/content/articles";
import { readableIssues, seriesOf } from "@/content/chronicles-catalog";
import { Frame } from "@/components/shell";
import type { Doc } from "@/lib/cms";

/** The paper's masthead: name, volume line, date and motto. `d` is the "Times masthead" section, when there is one. */
export function Masthead({ d, compact = false }: { d?: Doc; compact?: boolean }) {
  const printed = new Date().toISOString().slice(0, 10);
  const name = d?.name || paperName;
  return (
    <header className={`tt-head${compact ? " is-compact" : ""}`}>
      <div className="tt-ear">
        <span>{d?.volume ?? `Vol. I · No. ${articles.length}`}</span>
        <TimesToday fallback={printed} />
        <span>{d?.edition ?? "Online edition · Free"}</span>
      </div>
      {compact ? <Link href="/articles" className="tt-mast">{name}</Link> : <h1 className="tt-mast">{name}</h1>}
      <p className="tt-motto">{d?.motto ?? "Printed for people. Read by machines that ask first."}</p>
    </header>
  );
}

function Block({ block, first }: { block: ArticleBlock; first: boolean }) {
  switch (block.type) {
    case "p":
      return <p className={first ? "tt-lead" : undefined}>{block.text}</p>;
    case "h":
      return <h2>{block.text}</h2>;
    case "q":
      return <p className="tt-ask">{block.text}</p>;
    case "quote":
      return (
        <blockquote className="tt-pull">
          <p>{block.text}</p>
          {block.by ? <cite>{block.by}</cite> : null}
        </blockquote>
      );
  }
}

/** One story of the Skalle Times, at /articles/<slug>. */
export function ArticlePage({ slug, masthead }: { slug: string; masthead?: Doc }) {
  const article = findArticle(slug);
  if (!article) return <NotFound />;
  const others = articles.filter((item) => item.slug !== article.slug);
  const firstParagraph = article.body.findIndex((block) => block.type === "p");
  const promo = readableIssues[0];

  return (
    <Frame>
      <div className="tt is-paper" data-nav-theme="light">
        <Masthead d={masthead} compact />
        <nav className="tt-strip" aria-label="Sections">
          <Link href="/articles">Front page</Link>
          {sections.map((name) => (
            <Link key={name} href={`/articles?section=${encodeURIComponent(name)}`} aria-current={name === article.section ? "true" : undefined}>
              {name}
            </Link>
          ))}
        </nav>

        <div className="tt-page">
          <article className="tt-story">
            <p className="tt-kicker">{article.section}</p>
            <h1>{article.title}</h1>
            <p className="tt-dek">{article.dek}</p>
            <div className="tt-byline">
              <span>By <b>{article.byline}</b></span>
              <time dateTime={article.date}>{formatDate(article.date, "long")}</time>
              <span>{article.minutes} min read</span>
              <span className="tt-tools">
                <TimesShare title={article.title} />
                <TimesPrint />
              </span>
            </div>
            <figure className="tt-figure">
              <img src={article.image} alt={article.alt} />
              <figcaption>{article.caption}</figcaption>
            </figure>
            <div className="tt-body">
              {article.body.map((block, index) => <Block key={index} block={block} first={index === firstParagraph} />)}
              <p className="tt-end" aria-hidden="true">■</p>
            </div>
          </article>

          <aside className="tt-side">
            <h2 className="tt-side-title">Latest</h2>
            <ol className="tt-latest">
              {others.map((item, index) => (
                <li key={item.slug}>
                  <span>{index + 1}</span>
                  <Link href={`/articles/${item.slug}`}><small>{item.section}</small>{item.title}</Link>
                </li>
              ))}
            </ol>
            {promo ? (
              <Link href={`/chronicles/${promo.slug}`} className="tt-promo">
                <img src={promo.image} alt="" />
                <span>
                  <small>From the Chronicles</small>
                  <b>{seriesOf(promo)?.name ?? promo.title}</b>
                  {promo.label}. Read the comic online.
                </span>
              </Link>
            ) : null}
          </aside>
        </div>

        <section className="tt-more" aria-labelledby="tt-more-title">
          <h2 id="tt-more-title" className="tt-side-title">More from the Times</h2>
          <ul className="tt-grid">
            {others.slice(0, 3).map((item) => <TimesCard key={item.slug} article={item} />)}
          </ul>
        </section>
      </div>
    </Frame>
  );
}

export function NotFound() {
  return (
    <Frame>
      <section className="lab-block"><p className="lab-note">This page is not published.</p></section>
    </Frame>
  );
}

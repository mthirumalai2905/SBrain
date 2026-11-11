import { Fragment, type ReactNode } from "react";
import Link from "@/lib/Link";
import { edit, editDoc, editImage, mediaUrl, type Doc, type Sec, type Shared } from "@/lib/cms";
import { taglineAt, type HeroTagline } from "@/lib/heroTaglines";
import type { ArticleBlock } from "@/lib/article";
import type { Category, Post } from "@/lib/posts";
import { readingLabel, readingMinutes } from "@/lib/readingTime";
import { BornMark } from "@/components/BornMark";
import { ContactForm } from "@/components/ContactForm";
import { CrewCard } from "@/components/CrewCard";
import { FaqFull, type FaqPiece } from "@/components/FaqFull";
import { Footer } from "@/components/Footer";
import { HeroCopy } from "@/components/HeroCopy";
import { HeroFilm } from "@/components/HeroFilm";
import { JsonLd } from "@/components/JsonLd";
import { LinkedInFeed } from "@/components/LinkedInFeed";
import { Nav } from "@/components/Nav";
import { NewsEssay } from "@/components/RaisingArticle";
import { NewsletterInvite } from "@/components/NewsletterInvite";
import { Reveal } from "@/components/Reveal";
import { RobotNote } from "@/components/RobotNote";
import { SiteEffects } from "@/components/SiteEffects";
import { Stance } from "@/components/Stance";
import { ToolHero } from "@/components/ToolHero";
import { ToolPlan } from "@/components/ToolPlan";

/**
 * Turns a page's CMS sections into the markup the design expects. These are plain functions that return elements
 * (not components) on purpose: the text animation walks the element tree, so it has to be able to see the content.
 */
type Tool = "dns" | "bios" | "pass" | "skalle";
const TOOLS: string[] = ["dns", "bios", "pass", "skalle"];
const list = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const text = (v: unknown) => (typeof v === "string" ? v : "");

/** Pages whose footer shows the film. */
const FILM_FOOTER = new Set(["tools", "realtimeweb", "morph", "who", "careers", "articles", "real-time-web-position"]);
/** Class of the long-text wrapper on each page. */
const ESSAY_CLASS: Record<string, string> = { realtimeweb: "rtw-essay", morph: "morph-essay", who: "who-history", "real-time-web-position": "news-essay" };
const ESSAY_TYPES = new Set(["text-block", "stance", "robot-note", "figure", "shift-list"]);

// ------------------------------------------------------------------ small pieces
function withAccent(title: string, accent?: string): ReactNode {
  const at = accent ? title.lastIndexOf(accent) : -1;
  if (at < 0) return title;
  return (<>{title.slice(0, at)}<em>{accent}</em>{title.slice(at + accent!.length)}</>);
}

function fullPieces(full: string): FaqPiece[] {
  return full.split(/\n{2,}/).map((block): FaqPiece => {
    if (block.startsWith("## ")) return { heading: block.slice(3) };
    if (block.startsWith("- ")) return { items: block.split("\n").map((l) => l.replace(/^- /, "")) };
    return block;
  });
}

function faqItems(s: Sec) {
  return list(s.items).map((item, i) => (
    <details key={i} name="faq">
      <summary {...edit(s, `items.${i}.q`)}>{item.q}</summary>
      <div className="faq-a">
        <div>
          <p {...edit(s, `items.${i}.a`)}>{item.a}</p>
          {item.fullAnswer ? <FaqFull pieces={fullPieces(item.fullAnswer)} /> : null}
        </div>
      </div>
    </details>
  ));
}

const robotNote = (s: Sec) => (
  <RobotNote
    key={s._key}
    side={s.side === "right" ? "right" : "left"}
    src={mediaUrl(s.image) ?? (s.side === "right" ? "/img/robot-right.jpg" : "/img/robot-left.jpg")}
    lines={[text(s.lineOne), text(s.lineTwo)] as const}
  />
);

/** A long-text block: optional kicker and heading, paragraphs, a list, and closing paragraphs. */
function textBlock(s: Sec, o: { spanItems?: boolean; wrap?: boolean; linkLast?: { label: string; url: string } } = {}): ReactNode {
  const paras = list(s.paragraphs);
  const closing = list(s.closingParagraphs);
  const items = list(s.listItems);
  const last = closing.length ? { arr: "closingParagraphs", i: closing.length - 1 } : { arr: "paragraphs", i: paras.length - 1 };
  const para = (arr: "paragraphs" | "closingParagraphs", p: { text: string }, i: number) => {
    const t = text(p.text);
    const link = o.linkLast && last.arr === arr && last.i === i ? o.linkLast : undefined;
    const at = link ? t.lastIndexOf(link.label) : -1;
    if (link && at >= 0) {
      return (
        <p key={arr + i} className="rtw-out" {...edit(s, `${arr}.${i}.text`)}>
          {t.slice(0, at)}<a href={link.url} target="_blank" rel="noreferrer">{t.slice(at)}</a>
        </p>
      );
    }
    return <p key={arr + i} className={t.startsWith("- By ") ? "who-sign" : undefined} {...edit(s, `${arr}.${i}.text`)}>{t}</p>;
  };
  const body = (
    <>
      {s.kicker ? <div className="section-kicker" {...edit(s, "kicker")}>{s.kicker}</div> : null}
      {s.heading ? (
        s.level === "h3" ? <h3 {...edit(s, "heading")}>{s.heading}</h3>
        : s.heading === "Synx Is Born" ? <h2 className="born-line" {...edit(s, "heading")}>{s.heading} <BornMark /></h2>
        : <h2 {...edit(s, "heading")}>{s.heading}</h2>
      ) : null}
      {paras.map((p, i) => para("paragraphs", p, i))}
      {items.length ? (
        <ul>
          {items.map((p, i) => (o.spanItems ? <li key={i}><span {...edit(s, `listItems.${i}.text`)}>{p.text}</span></li> : <li key={i} {...edit(s, `listItems.${i}.text`)}>{p.text}</li>))}
        </ul>
      ) : null}
      {closing.map((p, i) => para("closingParagraphs", p, i))}
    </>
  );
  return o.wrap && s.heading ? <div key={s._key}>{body}</div> : <Fragment key={s._key}>{body}</Fragment>;
}

/** One block of an essay (the long pages and the tool pages). */
function essayItem(s: Sec, slug: string, o: { spanItems?: boolean; wrap?: boolean; linkLast?: { label: string; url: string } } = {}): ReactNode {
  switch (s._type) {
    case "text-block": return textBlock(s, o);
    case "stance": return <Stance key={s._key} speaker={s.speaker === "Skalle" ? "skalle" : undefined}>{text(s.text)}</Stance>;
    case "robot-note": return robotNote(s);
    case "figure":
      return (
        <figure key={s._key} className={slug === "morph" ? "morph-figure" : "news-figure"}>
          <img src={mediaUrl(s.image)} alt={text(s.alt)} {...editImage(s, "image")} />
        </figure>
      );
    case "shift-list":
      return (
        <div key={s._key} className="rtw-model">
          <div className="rtw-model-legend" aria-hidden="true"><span>{s.fromLabel ?? "From"}</span><span>{s.toLabel ?? "To"}</span></div>
          <ul className="rtw-shift">
            {list(s.items).map((it, i) => (
              <li key={i}><span className="from" {...edit(s, `items.${i}.from`)}>{it.from}</span><span className="arrow" aria-hidden="true">→</span><span className="to" {...edit(s, `items.${i}.to`)}>{it.to}</span></li>
            ))}
          </ul>
        </div>
      );
    default: return null;
  }
}

// ------------------------------------------------------------------ feed
/** An article in the CMS, as a card in the company feed. */
export function postsFrom(articles: Doc[]): Post[] {
  return articles.map((a) => {
    const native = list(a.blocks).length > 0;
    return {
      name: text(a.author),
      source: a.source ?? "Synx",
      category: (a.category ?? "Articles") as Category,
      href: a.externalUrl || (native ? `/news/${a.slug}` : `/${a.slug}`),
      text: text(a.summary),
      when: text(a.dateLabel),
      photo: mediaUrl(a.authorPhoto) ?? "",
      title: a.title || undefined,
      dek: a.dek || undefined,
      featured: !!a.featured,
      slug: native ? a.slug : undefined,
      image: mediaUrl(a.heroImage),
      linkedin: a.linkedinUrl || undefined,
    };
  });
}

// ------------------------------------------------------------------ pages
const heroBase: Record<string, { cls: string; img: string; alt?: string }> = {
  tools: { cls: "tools-hero", img: "tools-banner" },
  realtimeweb: { cls: "rtw-hero", img: "rtw-banner" },
  morph: { cls: "morph-hero", img: "morph-banner", alt: "A marketplace of stalls for data, an AI, a robot, and agents" },
  who: { cls: "who-hero", img: "who-banner" },
};

function placeHero(s: Sec, slug: string): ReactNode {
  const v = heroBase[slug] ?? heroBase.tools;
  const title = text(s.title);
  return (
    <section key={s._key} className={`place-hero ${v.cls}`} data-synx-key={s._key}>
      <img className={v.img} src={mediaUrl(s.bannerImage)} alt={v.alt ?? ""} {...editImage(s, "bannerImage")} />
      <div className="wrap">
        {slug === "morph" ? (
          <h1 {...edit(s, "title")}><img src={mediaUrl(s.markImage) ?? "/img/morph-mark.svg"} alt="" />{title}</h1>
        ) : (
          <h1 {...edit(s, "title")}>{slug === "who" ? withAccent(title, s.accentWord) : title}</h1>
        )}
        {s.subtitle ? <p {...edit(s, "subtitle")}>{s.subtitle}</p> : null}
      </div>
      {s.pinLabel ? (
        <span className="who-pin">
          <span className="who-pin-mark" aria-hidden="true"></span>
          {s.pinLabel}
          <i aria-hidden="true"></i>
        </span>
      ) : null}
    </section>
  );
}

function toolsGrid(s: Sec): ReactNode {
  return (
    <Reveal key={s._key}>
      <section id="tools" data-synx-key={s._key}>
        <div className="wrap">
          <div>
            <div className="section-kicker" {...edit(s, "kicker")}>{s.kicker}</div>
            <h2 {...edit(s, "heading")}>{s.heading}</h2>
            <p className="sub" style={{ marginLeft: 0, textAlign: "left" }} {...edit(s, "intro")}>{s.intro}</p>
          </div>
          <div className="bento">
            {list(s.cards).map((c, i) => (
              <Link key={i} className={`card ${c.tone}`} href={c.url}>
                <h3 {...edit(s, `cards.${i}.title`)}>{c.title}</h3>
                <p {...edit(s, `cards.${i}.text`)}>{c.text}</p>
                <img className="tool-mark" src={mediaUrl(c.image)} alt="" />
                <div className="glow" aria-hidden="true"></div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function suitePair(s: Sec): ReactNode {
  return (
    <Reveal key={s._key}>
      <section className="pair" data-synx-key={s._key}>
        <div className="wrap pair-grid">
          <article className="pair-card field">
            <h2 {...edit(s, "leftTitle")}>{s.leftTitle}</h2>
            <p {...edit(s, "leftText")}>{s.leftText}</p>
            <div className="pair-marks">
              {list(s.marks).map((m, i) => (
                <Link key={i} className={m.tone} href={m.url}><img src={mediaUrl(m.image)} alt={m.alt} /></Link>
              ))}
            </div>
          </article>
          <article className="pair-card">
            <h2 {...edit(s, "rightTitle")}>{s.rightTitle}</h2>
            <p {...edit(s, "rightText")}>{s.rightText}</p>
            <ul>
              {list(s.items).map((it, i) => (
                <li key={i}><Link href={it.url}><strong {...edit(s, `items.${i}.title`)}>{it.title}</strong><span {...edit(s, `items.${i}.text`)}>{it.text}</span></Link></li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </Reveal>
  );
}

function team(s: Sec, values: Sec | undefined, shared: Shared): ReactNode {
  const members = shared.team;
  const lead = text(s.lead).split(/(?<=[.!?])\s+/);
  return (
    <Reveal key={s._key}>
      <section className="who-team" data-synx-key={s._key}>
        <div className="wrap">
          <h2 {...edit(s, "heading")}>{s.heading}</h2>
          <p className="who-lead" {...edit(s, "lead")}>
            {lead.map((line, i) => (i ? [<br key={"b" + i} />, line] : line))}
          </p>
          {list(s.groups).map((g, gi) => (
            <Fragment key={gi}>
              <h2 className="crew-group" {...edit(s, `groups.${gi}.name`)}>{g.name}</h2>
              <div className="people">
                {members.filter((m) => m.group === g.name).map((m) => (
                  <CrewCard key={m.id} photo={mediaUrl(m.photo) ?? ""} title={text(m.title)} line={text(m.line)} name={text(m.name)} linkedin={m.linkedin || undefined} />
                ))}
              </div>
            </Fragment>
          ))}
          {values ? (
            <>
              <h2 className="crew-group" {...edit(values, "heading")}>{values.heading}</h2>
              <div className="values-row">
                <div className="values">
                  {list(values.items).map((v, i) => (
                    <article className="value" key={i}>
                      <h3 {...edit(values, `items.${i}.title`)}>{v.title}</h3>
                      <p {...edit(values, `items.${i}.text`)}>{v.text}</p>
                      {v.linkLabel ? <a className="value-join" href={v.linkUrl} target="_blank" rel="noreferrer">{v.linkLabel}</a> : null}
                    </article>
                  ))}
                </div>
                <aside className="values-side">
                  <img className="values-figure" src={mediaUrl(values.sideImage)} alt={text(values.sideImageAlt)} {...editImage(values, "sideImage")} />
                  <div className="values-cta">
                    <p className="section-kicker" {...edit(values, "ctaKicker")}>{values.ctaKicker}</p>
                    <h3 {...edit(values, "ctaTitle")}>{values.ctaTitle}</h3>
                    <p {...edit(values, "ctaText")}>{values.ctaText}</p>
                  </div>
                </aside>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </Reveal>
  );
}

/** The contact form with its intro, then an optional robot note and the newsletter. Used on Contact and at the end of Who we are. */
function contactGroup(slug: string, form: Sec, rest: Sec[]): ReactNode {
  const note = rest.find((r) => r._type === "robot-note");
  const news = rest.find((r) => r._type === "newsletter");
  const Title = slug === "contact" ? "h1" : "h2";
  const split = (
    <div className="contact-split">
      <div className="contact-intro">
        <Title {...edit(form, "title")}>{withAccent(text(form.title), form.accentWord)}</Title>
        {list(form.paragraphs).map((p, i) => <p key={i} {...edit(form, `paragraphs.${i}.text`)}>{p.text}</p>)}
      </div>
      <ContactForm c={form} />
    </div>
  );
  const newsletter = news ? <NewsletterInvite c={news} /> : null;
  if (slug === "contact") {
    return (
      <section key={form._key} className="contact-page" data-synx-key={form._key}>
        <div className="contact-glow" aria-hidden="true"></div>
        <div className="wrap">
          <Reveal immediate>{split}{note ? robotNote(note) : null}{newsletter}</Reveal>
        </div>
      </section>
    );
  }
  return (
    <Reveal key={form._key}>
      <section className="who-reach" id="write" data-synx-key={form._key}>
        <div className="contact-glow" aria-hidden="true"></div>
        <div className="wrap">{split}{newsletter}</div>
      </section>
    </Reveal>
  );
}

function legalBody(s: Sec): ReactNode {
  return (
    <section key={s._key} className="policy-body" data-synx-key={s._key}>
      <div className="wrap">
        {list(s.items).map((it, i) => (
          <Fragment key={i}>
            {it.heading ? <h2 {...edit(s, `items.${i}.heading`)}>{it.heading}</h2> : null}
            {text(it.text).split(/\n{2,}/).filter(Boolean).map((block, j) =>
              block.startsWith("- ")
                ? <ul key={j}>{block.split("\n").map((l, k) => <li key={k}>{l.replace(/^- /, "")}</li>)}</ul>
                : <p key={j} {...(j === 0 ? edit(s, `items.${i}.text`) : {})}>{block}</p>)}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

/** Everything between the nav and the footer of a page, in the order the CMS gives the sections. */
function body(slug: string, sections: Sec[], shared: Shared): ReactNode[] {
  const out: ReactNode[] = [];
  const isTool = TOOLS.includes(slug);
  let essay: ReactNode[] = [];
  let toolCopy: ReactNode[] = [];
  const flushEssay = () => {
    if (!essay.length) return;
    const cls = ESSAY_CLASS[slug] ?? "news-essay";
    const node = (
      <section key={"essay" + out.length} className={cls} id={slug === "who" ? "history" : undefined}>
        <div className="wrap">
          {essay}
          {slug === "real-time-web-position" ? <p className="news-out"><Link href="/#feed">Back to company posts</Link></p> : null}
        </div>
      </section>
    );
    out.push(slug === "who" ? <Reveal key={"essayr" + out.length}>{node}</Reveal> : node);
    essay = [];
  };
  const flushTool = () => {
    if (!toolCopy.length) return;
    out.push(
      <section key={"copy" + out.length} className={`tool-copy ${slug}`}>
        <Reveal className="wrap">{toolCopy}</Reveal>
      </section>,
    );
    toolCopy = [];
  };

  for (let i = 0; i < sections.length; i += 1) {
    const s = sections[i];
    const t = s._type;

    if (isTool && (t === "text-block" || t === "tool-points" || t === "robot-note" || t === "faq")) {
      if (t === "tool-points") {
        toolCopy.push(<ul key={s._key}>{list(s.points).map((p, j) => <li key={j}><strong {...edit(s, `points.${j}.title`)}>{p.title}</strong><span {...edit(s, `points.${j}.text`)}>{p.text}</span></li>)}</ul>);
      } else if (t === "faq") {
        toolCopy.push(
          <Fragment key={s._key}>
            <div className="faq-intro"><h2 {...edit(s, "heading")}>{s.heading ?? "FAQ"}</h2></div>
            <div className="faq">{faqItems(s)}</div>
          </Fragment>,
        );
      } else toolCopy.push(essayItem(s, slug, { spanItems: true, wrap: true }));
      continue;
    }

    if (ESSAY_TYPES.has(t) && !isTool) {
      const next = sections[i + 1];
      const inline = slug === "realtimeweb" && next?._type === "cta-button" && i + 1 === sections.length - 1;
      essay.push(essayItem(s, slug, inline ? { linkLast: { label: text(next.label), url: text(next.url) } } : {}));
      continue;
    }
    if (t === "cta-button" && slug === "realtimeweb") continue; // shown as the link inside the last paragraph

    flushEssay(); flushTool();
    switch (t) {
      case "place-hero": out.push(placeHero(s, slug)); break;
      case "tool-hero":
        out.push(
          <section key={s._key} className={`tool-hero ${slug}`} data-synx-key={s._key}>
            <div className="tool-radiance" aria-hidden="true"></div>
            <ToolHero tool={{ slug: slug as Tool, name: text(s.name), lead: text(s.lead) }} logo={mediaUrl(s.logo)} />
          </section>,
        );
        break;
      case "tool-plan":
        out.push(
          <section key={s._key} className="tool-plan" data-synx-key={s._key}>
            <ToolPlan slug={slug as Tool} linked={false} cms={s as never} name={text(sections.find((x) => x._type === "tool-hero")?.name) || undefined} />
          </section>,
        );
        break;
      case "tools-grid": out.push(toolsGrid(s)); break;
      case "suite-pair": out.push(suitePair(s)); break;
      case "team": {
        const nx = sections[i + 1];
        out.push(team(s, nx?._type === "values" ? nx : undefined, shared));
        if (nx?._type === "values") i += 1;
        break;
      }
      case "values": break; // drawn inside the team section
      case "contact-form": {
        const rest: Sec[] = [];
        while (sections[i + 1] && (sections[i + 1]._type === "robot-note" || sections[i + 1]._type === "newsletter")) { rest.push(sections[i + 1]); i += 1; }
        out.push(contactGroup(slug, s, rest));
        break;
      }
      case "newsletter": out.push(<NewsletterInvite key={s._key} c={s} />); break;
      case "simple-message": out.push(<section key={s._key} className="careers-page" data-synx-key={s._key}><h1 {...edit(s, "heading")}>{s.heading}</h1></section>); break;
      case "news-feed":
        out.push(
          <LinkedInFeed
            key={s._key}
            posts={postsFrom(shared.articles)}
            only={s.onlyCategory && s.onlyCategory !== "All" ? (s.onlyCategory as Category) : undefined}
            expanded={!!s.expanded}
            page={slug === "articles"}
            kicker={s.kicker}
            title={s.heading}
            intro={s.intro}
          />,
        );
        break;
      case "policy-hero":
        out.push(
          <section key={s._key} className={`policy-hero ${s.tone}`} data-synx-key={s._key}>
            <div className="tool-radiance" aria-hidden="true" />
            <div className="wrap">
              <img className="policy-mark" src="/img/symbol.png" alt="" />
              <p className="policy-kicker" {...edit(s, "kicker")}>{s.kicker}</p>
              <h1 {...edit(s, "title")}>{s.title}</h1>
              <p className="lede" {...edit(s, "lede")}>{s.lede}</p>
            </div>
          </section>,
        );
        break;
      case "legal-body": out.push(legalBody(s)); break;
      case "news-hero":
        out.push(
          <section key={s._key} className="news-hero plain" data-synx-key={s._key}>
            <div className="wrap">
              <p className="section-kicker" {...edit(s, "kicker")}>{s.kicker}</p>
              <h1 {...edit(s, "title")}>{s.title}</h1>
              {s.dek ? <p className="news-dek" {...edit(s, "dek")}>{s.dek}</p> : null}
              <p className="news-by" {...edit(s, "byline")}>{s.byline}</p>
            </div>
          </section>,
        );
        break;
      case "cta-button":
        out.push(
          <section key={s._key} className="morph-close" data-synx-key={s._key}>
            <div className="wrap">
              <a className="btn btn-primary" href={s.url} {...(s.newTab ? { target: "_blank", rel: "noreferrer" } : {})} {...edit(s, "label")}>{s.label}</a>
            </div>
          </section>,
        );
        break;
      case "faq":
        out.push(
          <section key={s._key} id="questions" data-synx-key={s._key}>
            <div className="wrap faq-layout">
              <div className="faq-intro"><h2 {...edit(s, "heading")}>{s.heading ?? "FAQ"}</h2></div>
              <div className="faq">{faqItems(s)}</div>
            </div>
          </section>,
        );
        break;
      default: break;
    }
  }
  flushEssay(); flushTool();
  return out;
}

const footerFor = (slug: string) => (TOOLS.includes(slug) ? <Footer tone={slug as Tool} /> : <Footer film={FILM_FOOTER.has(slug)} />);

/** A whole page: nav, content, footer. */
export function renderPage(slug: string, page: Doc, shared: Shared): ReactNode {
  const sections = list(page.sections) as Sec[];

  if (slug === "home") {
    const hero = sections.find((s) => s._type === "home-hero");
    const taglines: HeroTagline[] = list(hero?.taglines).map((t) => ({ lines: [text(t.lineOne), text(t.lineTwo)].filter(Boolean), text: text(t.text), wide: !!t.wide }));
    const rest = sections.filter((s) => s._type !== "home-hero");
    return (
      <>
        <main className="home" id="top">
          <section className="hero" data-synx-key={hero?._key}>
            <HeroFilm />
            <Nav film />
            {taglines.length ? <HeroCopy tagline={taglineAt(taglines)} /> : null}
          </section>
          {body("home", rest, shared)}
        </main>
        <Footer film />
      </>
    );
  }

  const faqLd = slug === "morph" ? sections.filter((s) => s._type === "faq").flatMap((s) => list(s.items)) : [];
  return (
    <>
      {faqLd.length ? <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqLd.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} /> : null}
      <Nav />
      {slug === "tools" ? <SiteEffects /> : null}
      <main className={slug === "tools" ? "tools-page" : undefined}>{body(slug, sections, shared)}</main>
      {footerFor(slug)}
    </>
  );
}

export function renderNotFound(): ReactNode {
  return (
    <>
      <Nav />
      <main><section className="careers-page"><h1>Page not found</h1></section></main>
      <Footer film />
    </>
  );
}

/** An article page at /news/<slug>. */
export function renderArticle(a: Doc): ReactNode {
  const blocks: ArticleBlock[] = list(a.blocks).map((b) =>
    b.type === "figure" ? { type: "figure", src: mediaUrl(b.image) ?? "", alt: text(b.alt) }
    : b.type === "note" ? { type: "note", side: b.side === "right" ? "right" : "left", lines: [text(b.lineOne), text(b.lineTwo)] as const }
    : b.type === "h2" || b.type === "h3" ? { type: b.type, text: text(b.text) }
    : { type: "p", text: text(b.text), tone: b.tone && b.tone !== "none" ? b.tone : undefined, marks: Array.isArray(b.marks) ? b.marks : undefined },
  );
  const words = blocks.flatMap((b) => (b.type === "figure" ? [] : b.type === "note" ? [...b.lines] : [b.text]));
  const fit = a.slug === "friend-or-foe";
  return (
    <>
      <Nav />
      <main>
        <section className={fit ? "news-hero fit" : "news-hero"}>
          <img className={fit ? "news-banner pair" : "news-banner"} src={mediaUrl(a.heroImage)} alt="" {...editDoc("heroImage")} />
          <div className="wrap">
            <p className="section-kicker">{a.category}</p>
            <h1 {...editDoc("title")}>{a.title}</h1>
            {a.dek ? <p className="news-dek" {...editDoc("dek")}>{a.dek}</p> : null}
            <p className="news-by">{a.author} · {readingLabel(readingMinutes(words))}{a.dateLabel ? ` · ${a.dateLabel}` : ""}</p>
          </div>
        </section>
        <section className="news-essay">
          <div className="wrap">
            <NewsEssay blocks={blocks} />
            {a.linkedinUrl ? <p className="news-out">More from the company on{" "}<a href={a.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn →</a></p> : null}
            <p className="news-out"><Link href="/#feed">Back to company posts</Link></p>
          </div>
        </section>
      </main>
      <Footer film />
    </>
  );
}

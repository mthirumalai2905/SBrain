import type { ReactNode } from "react";
import Link from "@/lib/Link";
import { edit, list, type Doc, type Sec } from "@/lib/cms";
import { ChassisBento } from "@/components/Bento";
import { CareersHero, FeedCards, Ticker } from "@/components/careers";
import { Chronicles } from "@/components/chronicles";
import { FaqList } from "@/components/faq";
import { HeroSkalle } from "@/components/hero-skalle";
import { LightZone, Reveal } from "@/components/light-zone";
import { Scramble } from "@/components/scramble";
import { DoorsVsLinks, RequestTrace, SceneHero, Switchboard } from "@/components/scenes";
import { OpenManual } from "@/components/spec-manual";
import { ArchitectureDiagram, ResearchCard, SectionHeader, SystemStatus, TechnicalCard } from "@/components/ui";
import { TimesFront } from "@/components/times";
import { Masthead } from "./times";

/** A link that stays in the site when it is a path, and leaves it when it is a full address. */
function A({ href, className, children }: { href?: string; className?: string; children: ReactNode }) {
  if (!href) return <span className={className}>{children}</span>;
  return href.startsWith("/") ? (
    <Link href={href} className={className}>{children}</Link>
  ) : (
    <a href={href} className={className}>{children}</a>
  );
}

const num = (i: number) => String(i + 1).padStart(2, "0");
const texts = (v: unknown) => list(v).map((x) => String(x?.text ?? "")).filter(Boolean);

function Head({ s }: { s: Sec }) {
  return s.index || s.title ? <SectionHeader index={s.index ?? ""} title={s.title ?? ""} lede={s.lede ?? ""} editKey={s._key} /> : null;
}

function Essay({ index, title, body, editBase }: { index: number; title: string; body: string; editBase?: string }) {
  const number = String(index).padStart(2, "0");
  const words = body.split(/\s+/).filter(Boolean).length;
  return (
    <Reveal>
      <section className="lab-essay">
        <div className="lab-essay-copy">
          <h2 data-synx-edit={`${editBase}.title`}>{title}</h2>
          <Scramble text={body} edit={`${editBase}.body`} />
        </div>
        <aside className="lab-essay-side" aria-hidden="true">
          <span className="lab-essay-num">{number}</span>
          <dl>
            <div><dt>Ref</dt><dd>ES_{number}</dd></div>
            <div><dt>Words</dt><dd>{words}</dd></div>
            <div><dt>Read</dt><dd>{Math.max(1, Math.round(words / 200))} min</dd></div>
          </dl>
          <span className="lab-essay-code" />
        </aside>
      </section>
    </Reveal>
  );
}

function ChargingBay({ s }: { s: Sec }) {
  const charge = Number(s.charge ?? 0);
  return (
    <section className="lab-pod" id="charging">
      <figure className="lab-pod-figure" data-parallax>
        <img src={s.image} alt={s.alt ?? ""} />
        <span className="lab-pod-scan" aria-hidden />
        <figcaption>{s.caption}</figcaption>
      </figure>
      <div className="lab-pod-copy" data-parallax>
        <p className="lab-kicker"><span>{s.index}</span>{s.kicker}</p>
        <h2 {...edit(s, "title")}>{s.title}</h2>
        {list(s.paragraphs).map((p, i) => <p key={i} data-synx-edit={`${s._key}.paragraphs.${i}.text`}>{p.text}</p>)}
        <div className="lab-pod-meter" aria-label={`${s.chargeLabel} ${charge} percent`}>
          <header><span>{s.chargeLabel}</span><strong>{charge}%</strong></header>
          <i><b /></i>
        </div>
        <dl className="lab-pod-meta">
          <div><dt>Unit</dt><dd>{s.unit}</dd></div>
          <div><dt>Crew</dt><dd>{texts(s.crew).map((name) => <span key={name}>{name}</span>)}</dd></div>
          <div><dt>Status</dt><dd>{s.status}</dd></div>
        </dl>
      </div>
    </section>
  );
}

function SiblingHall({ s }: { s: Sec }) {
  return (
    <section className="lab-pod lab-kin" id="family">
      <header className="lab-kin-head">
        <p className="lab-kicker"><span>{s.index}</span>{s.kicker}</p>
        <h2 {...edit(s, "title")}>{s.title}</h2>
        <div>{list(s.paragraphs).map((p, i) => <p key={i} data-synx-edit={`${s._key}.paragraphs.${i}.text`}>{p.text}</p>)}</div>
      </header>
      <figure className="lab-kin-figure" data-parallax>
        <img src={s.image} alt={s.alt ?? ""} />
        {list(s.tags).map((t) => (
          <span key={t.id} className="lab-kin-tag" style={{ left: `${t.x}%`, top: `${t.y}%` }}>
            <b>{t.id}</b>
            <em data-text={t.label}>{t.label}</em>
          </span>
        ))}
        <figcaption>{s.caption}</figcaption>
      </figure>
    </section>
  );
}

/** One section of a page, drawn as the Skalle design draws it. */
function renderOne(s: Sec): ReactNode {
  switch (s._type) {
    case "home-hero":
      return (
        <section className="lab-hero" id="intelligence">
          <p className="lab-kicker"><span>{s.index}</span>{s.kicker}</p>
          <div className="lab-hero-copy">
            <Scramble className="lab-lede" text={s.lede ?? ""} edit={`${s._key}.lede`} />
            <div className="lab-actions">
              <a href={s.openUrl}>{s.openLabel}</a>
              <OpenManual>{s.specsLabel}</OpenManual>
              <Link href={s.systemUrl || "/system"}>{s.systemLabel}</Link>
            </div>
          </div>
          <div className="lab-hero-figure">
            <h1 data-synx-edit={`${s._key}.titleTop`}>{s.titleTop}<br />{s.titleBottom}</h1>
            <HeroSkalle href={s.openUrl} src={s.figure} alt={s.figureAlt} />
          </div>
          <dl className="lab-hero-meta">
            {list(s.meta).map((m) => <div key={m.k}><dt>{m.k}</dt><dd>{m.v}</dd></div>)}
          </dl>
        </section>
      );

    case "scene-hero":
      return (
        <SceneHero
          index={s.index ?? ""} title={s.title ?? ""} lede={s.lede ?? ""} image={s.image} alt={s.alt ?? ""}
          side={s.side === "right" ? "right" : "left"} body={texts(s.body).length ? texts(s.body) : undefined}
          tags={list(s.tags)} meta={list(s.meta)} editKey={s._key}
        />
      );

    case "statement":
      return <Reveal><section className="lab-statement"><Scramble text={s.text ?? ""} edit={`${s._key}.text`} /></section></Reveal>;

    case "chassis-bento":
      return <Reveal><ChassisBento d={s} /></Reveal>;

    case "card-grid":
      return (
        <Reveal>
          <section className="lab-block" id={s.title === "The product" ? "product" : undefined}>
            <Head s={s} />
            <div className="lab-modules">
              {list(s.items).map((item, i) => <TechnicalCard key={item.title} index={num(i)} title={item.title} body={item.body} editBase={`${s._key}.items.${i}`} />)}
            </div>
            {texts(s.notes).map((t) => <Scramble key={t} className="lab-note" text={t} />)}
          </section>
        </Reveal>
      );

    case "terminal-quote":
      return (
        <Reveal>
          <section className="lab-terminal">
            <p className="lab-kicker"><span>{s.tag}</span>{s.kicker}</p>
            <Scramble className="lab-quote" text={s.quote ?? ""} edit={`${s._key}.quote`} />
            <Scramble text={s.note ?? ""} edit={`${s._key}.note`} />
            {s.buttonLabel ? <OpenManual className="lab-manual-cta">{s.buttonLabel}</OpenManual> : null}
          </section>
        </Reveal>
      );

    case "signals-strip":
      return (
        <Reveal>
          <section className="lab-work" id="signals">
            <p className="lab-kicker"><span>{s.tag}</span>{s.kicker}</p>
            <div className="lab-work-row">
              {list(s.cards).map((c) => (
                <A key={c.label} className="lab-work-card" href={c.url}>
                  <div className="lab-work-frame"><img src={c.image} alt={c.alt ?? ""} /></div>
                  <footer><span><strong>{c.title}</strong>{c.label}</span><em>↗</em></footer>
                </A>
              ))}
            </div>
          </section>
        </Reveal>
      );

    case "split-feature":
      if (s.style === "phage") {
        return (
          <Reveal>
            <section className="lab-work">
              <p className="lab-kicker"><span>{s.index}</span>{s.kicker}</p>
              <div className="lab-phage" data-parallax>
                <figure className="lab-phage-media"><img src={s.image} alt={s.alt ?? ""} /></figure>
                <div>
                  <h2 {...edit(s, "title")}>{s.title}</h2>
                  {list(s.paragraphs).map((p, i) => <Scramble key={i} text={p.text ?? ""} edit={`${s._key}.paragraphs.${i}.text`} />)}
                  {s.linkUrl ? <A href={s.linkUrl}>{s.linkLabel}</A> : null}
                </div>
              </div>
            </section>
          </Reveal>
        );
      }
      return (
        <Reveal>
          <section className={`lab-split${s.flip ? " lab-split-flip" : ""}`}>
            <figure data-parallax>
              <img src={s.image} alt={s.alt ?? ""} />
              <figcaption>{s.caption}</figcaption>
            </figure>
            <div>
              <p className="lab-kicker"><span>{s.index}</span>{s.kicker}</p>
              <h2 {...edit(s, "title")}>{s.title}</h2>
              {list(s.paragraphs).map((p, i) => <Scramble key={i} text={p.text ?? ""} edit={`${s._key}.paragraphs.${i}.text`} />)}
              {s.linkUrl ? <A href={s.linkUrl}>{s.linkLabel}</A> : null}
            </div>
          </section>
        </Reveal>
      );

    case "faq":
      return (
        <Reveal>
          <section className="lab-block" id="faq">
            <Head s={s} />
            <FaqList items={list(s.items)} openLabel={s.openLabel} closeLabel={s.closeLabel} />
          </section>
        </Reveal>
      );

    case "route-nav":
      return (
        <Reveal>
          <nav className="lab-routes" aria-label="Laboratory">
            {list(s.items).map((r) => (
              <Link key={r.url} href={r.url}><span>{r.index}</span><strong>{r.title}</strong><em>{r.note}</em></Link>
            ))}
          </nav>
        </Reveal>
      );

    case "essays":
      return <>{list(s.items).map((e, i) => <Essay key={e.title} index={(Number(s.startNumber) || 1) + i} title={e.title} body={e.body} editBase={`${s._key}.items.${i}`} />)}</>;

    case "request-trace":
      return (
        <Reveal>
          <section className="lab-block">
            <Head s={s} />
            <RequestTrace steps={list(s.steps)} badge={s.badge} />
          </section>
        </Reveal>
      );

    case "switchboard":
      return (
        <Reveal>
          <section className="lab-block">
            <Head s={s} />
            <Switchboard switches={list(s.switches)} verdicts={list(s.verdicts)} outsideLabel={s.outsideLabel} />
          </section>
        </Reveal>
      );

    case "doors-vs-links":
      return (
        <Reveal>
          <section className="lab-block">
            <Head s={s} />
            <DoorsVsLinks modes={list(s.modes)} nodes={list(s.nodes)} links={s.links ?? ""} ownedLabel={s.ownedLabel} warehouseLabel={s.warehouseLabel} />
          </section>
        </Reveal>
      );

    case "architecture-diagram": {
      const notes = texts(s.notes);
      return (
        <section className="lab-block">
          <div className="lab-arch-wrap">
            <ArchitectureDiagram steps={list(s.steps)} />
            <div className="lab-arch-notes">
              {notes.map((t, i) => <Scramble key={t} className={i === notes.length - 1 ? "lab-note" : undefined} text={t} />)}
            </div>
          </div>
        </section>
      );
    }

    case "status-map":
      return (
        <section className="lab-block">
          <Head s={s} />
          <div className="lab-monitor-grid">
            <SystemStatus rows={list(s.rows)} />
            <figure><img src={s.image} alt={s.alt ?? ""} /></figure>
          </div>
        </section>
      );

    case "research-grid":
      return (
        <section className="lab-block">
          <div className="lab-exps">
            {list(s.items).map((r) => (
              <ResearchCard
                key={r.id} id={r.id} title={r.title} body={r.body} year={r.year ?? ""} href={r.url ?? "#"} status={s.statusLabel} linkLabel={s.linkLabel}
                media={r.image ? <img src={r.image} alt={r.alt ?? ""} /> : undefined}
              />
            ))}
          </div>
        </section>
      );

    case "tool-bays":
      return (
        <section className="lab-block">
          <div className="lab-bays">
            {list(s.items).map((t) => (
              <a key={t.id} className="lab-bay" href={t.url}>
                <header><span>{t.id}</span><span>{t.role}</span></header>
                <img className="lab-mark" src={t.logo} alt={t.logoAlt ?? ""} />
                <h3>{t.name}</h3>
                <Scramble text={t.body ?? ""} />
                <footer>{s.openLabel}</footer>
              </a>
            ))}
          </div>
          {s.note ? <Scramble className="lab-note" text={s.note} /> : null}
        </section>
      );

    case "careers-hero":
      return <CareersHero d={s} />;

    case "ticker":
      return <Ticker items={texts(s.items)} />;

    case "feed-cards":
      return <FeedCards d={s} />;

    case "times-masthead":
      return (
        <div className="tt" data-nav-theme="light">
          <Masthead d={s} />
          <TimesFront />
        </div>
      );

    case "chronicles-shelf":
      return <Chronicles head={{ kicker: s.kicker, title: s.title, lede: s.lede }} />;

    default:
      return null;
  }
}

/** A page's sections in order. Sections that sit together in the charging bay share one lit zone, as in the design. */
export function renderPage(sections: Sec[]): ReactNode[] {
  const out: ReactNode[] = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s._type === "charging-bay" || s._type === "sibling-hall") {
      const group: Sec[] = [s];
      while (i + 1 < sections.length && (sections[i + 1]._type === "charging-bay" || sections[i + 1]._type === "sibling-hall")) group.push(sections[++i]);
      out.push(
        <LightZone key={group[0]._key}>
          {group.map((g) => (
            <div key={g._key} style={{ display: "contents" }} data-synx-key={g._key}>
              {g._type === "charging-bay" ? <ChargingBay s={g} /> : <SiblingHall s={g} />}
            </div>
          ))}
        </LightZone>,
      );
      continue;
    }
    // The wrapper lets the CMS select the section when it is clicked, and outline it.
    out.push(<div key={s._key} data-synx-key={s._key}>{renderOne(s)}</div>);
  }
  return out;
}

export type { Doc };

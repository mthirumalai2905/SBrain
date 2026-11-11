import { Fragment } from "react";
import Link from "@/lib/Link";
import { FooterFilm } from "@/components/HeroFilm";
import { editDoc, mediaUrl, useShared } from "@/lib/cms";

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.1.1 0 0 0-.1.05c-.18.33-.39.76-.53 1.09a16.1 16.1 0 0 0-4.74 0c-.14-.34-.35-.76-.54-1.09a.1.1 0 0 0-.1-.05c-1.5.26-2.93.71-4.27 1.33a.09.09 0 0 0-.04.03C2.2 9.05 1.5 12.58 1.82 16.06c0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65a.1.1 0 0 0 .11-.04c.4-.55.76-1.13 1.07-1.74a.1.1 0 0 0-.05-.13 10.7 10.7 0 0 1-1.63-.78.1.1 0 0 1-.01-.16c.11-.08.22-.17.32-.25a.1.1 0 0 1 .1-.01c3.44 1.57 7.15 1.57 10.55 0a.1.1 0 0 1 .1.01c.11.09.22.17.33.26a.1.1 0 0 1-.01.16c-.52.3-1.07.56-1.64.78a.1.1 0 0 0-.05.13c.32.61.68 1.19 1.07 1.74a.1.1 0 0 0 .11.04c1.72-.53 3.45-1.33 5.25-2.65a.1.1 0 0 0 .03-.05c.38-3.96-.64-7.46-2.7-10.7a.07.07 0 0 0-.04-.03ZM8.52 14.91c-.98 0-1.79-.9-1.79-2s.8-2 1.79-2 1.8.9 1.79 2-.8 2-1.79 2Zm6.97 0c-.98 0-1.79-.9-1.79-2s.8-2 1.79-2 1.8.9 1.79 2-.8 2-1.79 2Z" />
    </svg>
  );
}

function Wave() {
  return (
    <svg className="hero-wave" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
      <path className="wave-deep" fill="#22c55e" opacity="0.5">
        <animate
          attributeName="d"
          dur="4.8s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.5;1"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          values="M0,150 C120,40 240,230 360,150 C480,70 600,240 720,150 C840,50 960,230 1080,150 C1200,70 1320,220 1440,150 L1440,320 L0,320 Z;M0,150 C120,240 240,50 360,150 C480,250 600,40 720,150 C840,240 960,60 1080,150 C1200,230 1320,50 1440,150 L1440,320 L0,320 Z;M0,150 C120,40 240,230 360,150 C480,70 600,240 720,150 C840,50 960,230 1080,150 C1200,70 1320,220 1440,150 L1440,320 L0,320 Z"
        />
      </path>
      <path className="wave-soft" fill="#4ade80" opacity="0.32">
        <animate
          attributeName="d"
          dur="6.4s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.5;1"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          values="M0,180 C160,250 320,90 480,180 C640,270 800,80 960,180 C1120,260 1280,100 1440,180 L1440,320 L0,320 Z;M0,180 C160,90 320,260 480,180 C640,80 800,270 960,180 C1120,100 1280,250 1440,180 L1440,320 L0,320 Z;M0,180 C160,250 320,90 480,180 C640,270 800,80 960,180 C1120,260 1280,100 1440,180 L1440,320 L0,320 Z"
        />
      </path>
    </svg>
  );
}

type FooterLink = { column?: string; label: string; url: string; newTab?: boolean };

const anchor = (l: FooterLink, extra?: Record<string, string>) =>
  l.newTab || /^https?:/.test(l.url) ? (
    <a href={l.url} target="_blank" rel="noreferrer" {...extra}>{l.label}</a>
  ) : (
    <Link href={l.url} {...extra}>{l.label}</Link>
  );

export function Footer({ tone, film = false }: { tone?: "dns" | "bios" | "pass" | "skalle"; film?: boolean }) {
  const { footer: f = {} } = useShared();
  const columns = [1, 2, 3, 4].map((n) => ({ n, title: f[`column${n}Title`] as string | undefined, links: (f[`column${n}Links`] ?? []) as FooterLink[] })).filter((c) => c.title || c.links.length);
  const signLinks: FooterLink[] = f.signLinks ?? [];
  const legalLinks: FooterLink[] = f.legalLinks ?? [];
  const note: string[] = String(f.signNote ?? "").split("\n");
  return (
    <footer className={`footer${tone ? ` ${tone}` : ""}${film ? " film" : ""}`}>
      {film ? <FooterFilm /> : <Wave />}
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src={mediaUrl(f.symbol) ?? "/img/symbol.png"} alt="" data-synx-image="page.symbol" />
              <span {...editDoc("brandName")}>{f.brandName}</span>
            </div>
            <p {...editDoc("brandText")}>{f.brandText}</p>
            <p className="footer-note" {...editDoc("brandNote")}>{f.brandNote}</p>
          </div>
          <div className="footer-cols">
            {columns.map((c) => (
              <div key={c.n}>
                <h4 {...editDoc(`column${c.n}Title`)}>{c.title}</h4>
                {c.links.map((l, i) => <Fragment key={i}>{anchor(l, { "data-synx-edit": `page.column${c.n}Links.${i}.label` })}</Fragment>)}
              </div>
            ))}
          </div>
        </div>
        <div className="footer-discord">
          <DiscordMark />
          <span>
            <strong {...editDoc("communityTitle")}>{f.communityTitle}</strong>
            <small {...editDoc("communityText")}>{f.communityText}</small>
          </span>
          <span className="footer-discord-actions">
            <a href={f.communityUrl} target="_blank" rel="noreferrer">{f.communityButton}</a>
          </span>
        </div>
        <div className="footer-close">
          <div className="footer-sign">
            <p className="footer-sign-line" {...editDoc("signLine")}>{f.signLine}</p>
            <div className="footer-sign-links">
              {signLinks.map((l, i) => <Fragment key={i}>{anchor(l)}</Fragment>)}
            </div>
            <p className="footer-sign-co" {...editDoc("companyLine")}>{f.companyLine}</p>
            <p className="footer-sign-note" {...editDoc("signNote")}>
              {note.map((line, i) => (i ? [<br key={"b" + i} />, line] : line))}
            </p>
          </div>
          <div className="legal">
            <span {...editDoc("copyright")}>{f.copyright}</span>
            <div className="legal-links">
              {legalLinks.map((l, i) => <Fragment key={i}>{anchor(l)}</Fragment>)}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { edit, mediaUrl, type Sec } from "../lib/cms";
import { Reveal, SplitHeading } from "../lib/motion";
import { Scene } from "./Scene";

const DEFAULT_TEXT = "Pick a plan, claim your domain and publish your first Morphic Service. Start free and grow when you need to.";

/**
 * Closing call to action shared by the inner pages: a full-screen city scene with the headline on top.
 * `s` is the section from the CMS; its fields win over the props.
 */
export default function CtaBand({
  s,
  title = "Ready to give your idea a shape?",
  text = DEFAULT_TEXT,
  primary = { label: "Get started", href: "/contact#register" },
  secondary = { label: "See pricing", href: "/pricing" },
}: {
  s?: Sec;
  title?: string;
  text?: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  const heading = s?.heading || title;
  const body = s ? s.text || "" : text;
  const a = { label: s?.primaryLabel || primary.label, href: s?.primaryUrl || primary.href };
  const b = { label: s?.secondaryLabel || secondary.label, href: s?.secondaryUrl || secondary.href };
  const at = (field: string) => (s ? edit(s, field) : {});
  return (
    <Scene video center bgVideo={mediaUrl(s?.backgroundVideo)} bgImage={mediaUrl(s?.backgroundImage)} className="scene--cta">
      <SplitHeading text={heading} className="scene-title" edit={s ? `${s._key}.heading` : undefined} />
      <Reveal>
        <p className="scene-sub" {...at("text")}>{body}</p>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="scene-actions">
          <a href={a.href} className="gbtn gbtn-light" {...at("primaryLabel")}>{a.label}</a>
          <a href={b.href} className="gbtn" {...at("secondaryLabel")}>{b.label}</a>
        </div>
      </Reveal>
    </Scene>
  );
}

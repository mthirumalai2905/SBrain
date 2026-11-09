import type { ReactNode } from "react";
import { Composer, DataFlow, Status, ValueChain } from "../components/Console";
import { edit, slugify, type Sec } from "../lib/cms";
import { tradeChain } from "../lib/content";
import { Reveal, SplitHeading } from "../lib/motion";

/** The picture beside a chapter's text, chosen in the CMS. */
const visuals: Record<string, () => ReactNode> = {
  Composer: () => <Composer />,
  "Data flow": () => <DataFlow />,
  "Value chain": () => <ValueChain steps={tradeChain} />,
};

/** A story chapter: heading and paragraphs on one side, a live mock on the other. `flip` swaps the sides. */
export default function Chapter({ s, flip }: { s: Sec; flip: boolean }) {
  const paragraphs: { text?: string }[] = s.paragraphs ?? [];
  const visual = visuals[s.visual as string];
  return (
    <section id={slugify(s.heading ?? "")} className={`wrap lchapter ${flip ? "lchapter--flip" : ""}`}>
      <div className="lchapter-copy">
        {s.tag && <Status tone="idle"><span {...edit(s, "tag")}>{s.tag}</span></Status>}
        <SplitHeading text={s.heading ?? ""} className="lh2" dimFrom={2} edit={`${s._key}.heading`} />
        {paragraphs.map((p, i) => (
          <Reveal key={i}>
            <p {...edit(s, `paragraphs.${i}.text`)}>{p.text}</p>
          </Reveal>
        ))}
      </div>
      {visual && (
        <Reveal className="lchapter-visual" delay={0.1}>
          {visual()}
        </Reveal>
      )}
    </section>
  );
}

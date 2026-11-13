import { Scramble } from "./scramble";
import { list } from "@/lib/cms";

const text = (items: unknown): string[] => list(items).map((x) => String(x?.text ?? ""));

/** The early-chassis panel on the home page. Every word and number comes from the "Early chassis" section. */
export function ChassisBento({ d }: { d: Record<string, any> }) {
  const matrix: string[] = Array.isArray(d.matrix) ? d.matrix : [];
  const bars: number[] = Array.isArray(d.bars) ? d.bars : [];
  const idMeta = text(d.idMeta);
  return (
    <section className="lab-bento" id="chassis" aria-label={d.kicker}>
      <p className="lab-kicker">
        <span>{d.tag}</span>
        <Scramble as="span" className="bento-kicker-label" text={d.kicker ?? ""} />
      </p>
      <div className="bento">
        <article className="bento-id">
          <div className="bento-id-top">
            <Scramble className="bento-word" text={d.word ?? ""} />
            <p className="bento-id-meta">
              {idMeta.map((line, i) => (
                <Scramble key={line} as="span" className={i === 0 ? "is-title" : undefined} text={line} />
              ))}
            </p>
            <Arrow />
          </div>
          <Scramble className="bento-id-note" text={d.note ?? ""} />
          <div className="bento-id-mid">
            <Scramble className="bento-num" text={d.bigNumber ?? ""} />
            <Scramble className="bento-num-copy" text={d.bigCopy ?? ""} />
            <div className="bento-seals" aria-hidden="true">
              {text(d.seals).map((seal) => (
                <span key={seal} className="bento-seal">
                  <Scramble as="span" text={seal} />
                </span>
              ))}
              <span className="bento-seal bento-seal-orbit">
                <i />
              </span>
            </div>
            <Scramble className="bento-concept" text={d.concept ?? ""} />
            <div className="bento-matrix" aria-hidden="true">
              {matrix.map((row, rowIndex) =>
                row.split("").map((cell, index) => <i key={`${rowIndex}-${index}`} className={cell === "1" ? "on" : undefined} />),
              )}
            </div>
          </div>
          <footer className="bento-id-foot">
            <strong>
              <Scramble as="span" text={d.footId ?? ""} />
            </strong>
            <Scramble as="span" text={d.footStage ?? ""} />
            <span className="bento-switch">
              <i />
              <Scramble as="span" text={d.footSwitch ?? ""} />
            </span>
            <span>
              <Scramble as="span" text={d.footFrom ?? ""} /> <em>→</em> <Scramble as="span" text={d.footTo ?? ""} />
            </span>
            <NodeMark />
          </footer>
        </article>

        <article className="bento-proto">
          <div className="bento-proto-top">
            <div className="bento-proto-name">
              <Scramble className="bento-proto-word" text={d.protoWord ?? ""} />
              <i />
            </div>
            <Scramble as="span" className="bento-proto-spec" text={d.protoSpec ?? ""} />
          </div>
          <div className="bento-proto-figure">
            <img src={d.protoImage} alt={d.protoAlt ?? ""} />
            <Scramble as="span" className="bento-vert" text={d.protoVert ?? ""} rise={false} />
            <Scramble className="bento-stamp" text={d.protoStamp ?? ""} rise={false} />
          </div>
        </article>

        <article className="bento-spec">
          <header>
            <Scramble className="bento-spec-title" text={d.specTitle ?? ""} />
            <span>
              <Scramble as="span" text={d.specBay ?? ""} />
              <i />
            </span>
          </header>
          <Scramble className="bento-code" text={d.specCode ?? ""} />
          <Scramble className="bento-spec-meta" text={d.specMeta ?? ""} />
          <dl>
            {list(d.specRows).map((row) => (
              <div key={row.label}>
                <dt>
                  <Scramble as="span" text={row.label ?? ""} />
                </dt>
                <dd>
                  <Scramble as="span" text={row.value ?? ""} />
                </dd>
              </div>
            ))}
          </dl>
          <div className="bento-bars" aria-hidden="true">
            {bars.map((width, index) => (
              <i key={index} style={{ flex: `${width} 1 0` }} />
            ))}
          </div>
          <Scramble className="bento-serial" text={d.serial ?? ""} />
        </article>

        <article className="bento-scope" aria-hidden="true">
          <Scramble as="span" className="bento-scope-k" text={d.scopeTag ?? ""} rise={false} />
          <Scramble as="span" className="bento-read a" text={d.scopeA ?? ""} />
          <Scramble as="span" className="bento-read b" text={d.scopeB ?? ""} />
          <svg viewBox="0 0 220 220">
            <circle className="bento-ring ticks" cx="110" cy="110" r="96" />
            <circle className="bento-ring" cx="110" cy="110" r="74" />
            <circle className="bento-ring" cx="110" cy="110" r="50" />
            <circle className="bento-ring" cx="110" cy="110" r="24" />
            <path className="bento-axis" d="M110 18 V202 M18 110 H202" />
            <g className="bento-sweep">
              <path d="M110 110 L110 20 A90 90 0 0 1 186 68 Z" />
            </g>
            <circle className="bento-hub" cx="110" cy="110" r="7" />
            <circle className="bento-hub-core" cx="110" cy="110" r="2.5" />
          </svg>
          <ul className="bento-side l">
            {text(d.scopeLeft).map((line) => (
              <li key={line}>
                <Scramble as="span" text={line} />
              </li>
            ))}
          </ul>
          <ul className="bento-side r">
            {text(d.scopeRight).map((line) => (
              <li key={line}>
                <Scramble as="span" text={line} />
              </li>
            ))}
          </ul>
          <div className="bento-scale">
            {text(d.scopeScale).map((mark) => (
              <Scramble as="span" key={mark} text={mark} />
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg className="bento-arrow" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M8 56 L44 20" />
      <path d="M20 16 H48 V44" />
    </svg>
  );
}

function NodeMark() {
  return (
    <svg className="bento-node" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="7" />
      <circle cx="9" cy="14" r="1.6" />
      <circle cx="14" cy="9" r="1.6" />
      <circle cx="19" cy="14" r="1.6" />
      <circle cx="14" cy="19" r="1.6" />
      <path d="M9 14 L14 9 L19 14 L14 19 Z" />
    </svg>
  );
}

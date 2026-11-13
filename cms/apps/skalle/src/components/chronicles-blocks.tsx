import { useId } from "react";
import type { ChronicleBlock } from "@/content/chronicles";
import { isReadable, type Issue } from "@/content/chronicles-catalog";

export function Spiral() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg className="ink-spine" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#d4d4d4" />
          <stop offset="0.6" stopColor="#6b6b6b" />
          <stop offset="0.85" stopColor="#2a2a2a" />
          <stop offset="1" stopColor="#9a9a9a" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a8a8a" />
          <stop offset="1" stopColor="#1a1a1a" />
        </linearGradient>
        <radialGradient id={`${id}h`} cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#3a3a3a" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <pattern id={`${id}p`} width="34" height="19" patternUnits="userSpaceOnUse">
          <ellipse cx="25" cy="11" rx="3.4" ry="3" fill="#fff" />
          <ellipse cx="25" cy="11" rx="2.5" ry="2.2" fill={`url(#${id}h)`} />
          <path d="M11 6.6 C 3.5 6.6, 2.5 13.4, 10 14.4" fill="none" stroke={`url(#${id}b)`} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M11.5 8.4 C 16 5, 22 6.2, 25.6 10.6" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="3" strokeLinecap="round" />
          <path d="M10 6.6 C 15 3.2, 21.5 4.4, 24.8 9.6" fill="none" stroke="#050505" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M10 6.6 C 15 3.2, 21.5 4.4, 24.8 9.6" fill="none" stroke={`url(#${id}w)`} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M12 5.5 C 15.5 3.6, 19.5 3.9, 22.4 6.2" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.7" strokeLinecap="round" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="34" height="100%" fill={`url(#${id}p)`} />
    </svg>
  );
}

export function VolumeCover({ issue, fill = false }: { issue: Issue; fill?: boolean }) {
  const ready = isReadable(issue);
  return (
    <div className={`ink-cover${ready ? "" : " is-press"}${fill ? " is-fill" : ""}`}>
      <img src={issue.image} alt="" style={{ objectPosition: issue.focus }} />
      <Spiral />
      <span className="ink-edge" aria-hidden="true" />
      {ready ? (
        <div className="ink-cover-foot">
          <p className="ink-cover-title">{issue.coverTitle}</p>
        </div>
      ) : (
        <span className="ink-flag">Soon</span>
      )}
    </div>
  );
}

function inline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
    );
}

export function BlockView({ block }: { block: ChronicleBlock }) {
  switch (block.type) {
    case "kicker":
      return <p className="ink-page-kicker">{block.text}</p>;
    case "title":
      return <h2 className="ink-doc-title">{block.text}</h2>;
    case "heading":
      return <h2 className="ink-heading">{block.text}</h2>;
    case "prose":
      return <p className="ink-prose">{inline(block.text)}</p>;
    case "principle":
      return <p className="ink-callout">{inline(block.text)}</p>;
    case "epigraph":
      return <p className="ink-epigraph">{block.text}</p>;
    case "beat":
      return <p className="ink-beat">{inline(block.text)}</p>;
    case "screen":
      return (
        <p className="ink-screen">
          <span>{block.text}</span>
        </p>
      );
    case "cast":
      return (
        <ul className="ink-cast">
          {block.people.map((person) => (
            <li key={person.name}>
              <img src={person.src} alt={person.alt} />
              <div>
                <h3>{person.name}</h3>
                <p>{person.role}</p>
              </div>
            </li>
          ))}
        </ul>
      );
    case "plate":
      return (
        <figure className={`ink-frame${block.shape === "square" ? ` is-square is-${block.side ?? "right"}` : ""}`}>
          <img src={block.src} alt={block.alt} style={{ objectPosition: block.focus ?? "center" }} />
        </figure>
      );
    case "table":
      return (
        <table className="ink-table">
          <thead>
            <tr>
              {block.heads.map((head) => (
                <th key={head} scope="col">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row[0]}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "stage":
      return (
        <section className="ink-stage">
          <header>
            <h3>{block.title}</h3>
            <p>{block.when}</p>
          </header>
          {block.lines.map((line) => (
            <p key={line} className="ink-prose">
              {line}
            </p>
          ))}
        </section>
      );
    case "credit":
      return <p className="ink-credit">{block.text}</p>;
    case "colophon":
      return (
        <dl className="ink-colophon">
          {block.rows.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      );
    case "end":
      return <p className="ink-end">{block.text ?? "End"}</p>;
    default:
      return null;
  }
}

export function Leaf({
  blocks,
  side,
  folio,
}: {
  blocks: ChronicleBlock[] | null;
  side: "left" | "right";
  folio: string;
}) {
  return (
    <article className={`ink-leaf is-${side}`}>
      <div className="ink-leaf-body">
        {blocks?.map((block, index) => (
          <BlockView key={`${folio}-${index}`} block={block} />
        ))}
      </div>
      <p className="ink-folio">{folio}</p>
    </article>
  );
}

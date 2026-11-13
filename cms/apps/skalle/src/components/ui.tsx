import type { ReactNode } from "react";
import { Scramble } from "./scramble";

export function TechnicalLabel({ index, children, edit }: { index: string; children: ReactNode; edit?: string }) {
  return (
    <p className="lab-kicker" data-synx-edit={edit}>
      <span>{index}</span>
      {children}
    </p>
  );
}

export function SectionHeader({
  index,
  title,
  lede,
  editKey,
}: {
  index: string;
  title: string;
  lede: string;
  editKey?: string;
}) {
  return (
    <header className="lab-section-head">
      <TechnicalLabel index={index} edit={editKey && editKey + ".title"}>{title}</TechnicalLabel>
      <Scramble text={lede} edit={editKey && editKey + ".lede"} />
    </header>
  );
}

export function TechnicalCard({
  index,
  title,
  body,
  editBase,
}: {
  index: string;
  title: string;
  body: string;
  /** click-to-edit path of this card, like "<section key>.items.2" */
  editBase?: string;
}) {
  return (
    <article className="lab-module">
      <span>{index}</span>
      <h3 data-synx-edit={editBase && editBase + ".title"}>{title}</h3>
      <Scramble text={body} edit={editBase && editBase + ".body"} />
    </article>
  );
}

export function ResearchCard({
  id,
  title,
  body,
  year,
  href,
  media,
  status = "DOCUMENTED",
  linkLabel = "Read ↗",
}: {
  id: string;
  title: string;
  body: string;
  year: string;
  href: string;
  media?: ReactNode;
  status?: string;
  linkLabel?: string;
}) {
  return (
    <article className="lab-exp">
      {media}
      <p className="lab-exp-id">{id}</p>
      <h3>{title}</h3>
      <Scramble text={body} />
      <footer>
        <span>{status}</span>
        <span>{year}</span>
        <a href={href}>{linkLabel}</a>
      </footer>
    </article>
  );
}

export function SystemStatus({
  rows,
}: {
  rows: Array<{ name: string; role: string }>;
}) {
  return (
    <dl className="lab-status">
      {rows.map((row) => (
        <div key={row.name}>
          <dt>{row.name}</dt>
          <dd>
            <i />
            {row.role}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ArchitectureDiagram({ steps }: { steps: { id: string; name: string; note: string }[] }) {
  return (
    <ol className="lab-arch">
      {steps.map((node) => (
        <li key={node.id}>
          <span>{node.id}</span>
          <strong>{node.name}</strong>
          <em>{node.note}</em>
        </li>
      ))}
    </ol>
  );
}

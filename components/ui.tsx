import Link from "next/link";
import type { ReactNode } from "react";
import type { ArticleStatus } from "@/lib/types";
import { statusLabel } from "@/lib/rbac";
import { Chevron } from "./icons";

export function PageHeader({
  title,
  lede,
  status,
  actions,
}: {
  title: string;
  lede?: string;
  status?: ArticleStatus;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {status ? <p className={`status-line status-${status}`}>{statusLabel[status]}</p> : null}
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Group({ title, footer, children, inset }: { title?: string; footer?: string; children: ReactNode; inset?: boolean }) {
  return (
    <section>
      {title ? <h2 className="group-title">{title}</h2> : null}
      <div className={inset ? "card inset-icon" : "card"}>{children}</div>
      {footer ? <p className="group-footer">{footer}</p> : null}
    </section>
  );
}

export function RowLink({
  href,
  title,
  sub,
  aside,
  icon,
  external,
}: {
  href: string;
  title: string;
  sub?: string;
  aside?: string;
  icon?: ReactNode;
  external?: boolean;
}) {
  return (
    <Link className="row-link" href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
      {icon}
      <span className="row-main">
        <span className="row-title">{title}</span>
        {sub ? <span className="row-sub">{sub}</span> : null}
      </span>
      {aside ? <span className="row-aside">{aside}</span> : null}
      <Chevron />
    </Link>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

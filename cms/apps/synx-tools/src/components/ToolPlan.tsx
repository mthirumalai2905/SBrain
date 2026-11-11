import type { ReactNode } from "react";
import { mediaUrl } from "@/lib/cms";
import { ICON_PATHS } from "@/lib/iconset";
import Link from "@/lib/Link";

type Slug = "dns" | "bios" | "pass" | "skalle";

const mark = (path: ReactNode) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
    {path}
  </svg>
);

const plans: Record<
  Slug,
  {
    name: string;
    tag: string;
    lead: string;
    image: string;
    about: string;
    rows: { title: string; text: string; icon: ReactNode }[];
  }
> = {
  dns: {
    name: "Synx DNS",
    tag: "Naming",
    lead: "Client DNS for the domain you own.",
    image: "/img/dns.png?v=2",
    about: "About DNS",
    rows: [
      {
        title: "Root domain and subdomains",
        text: "An address mapped to the namespace",
        icon: mark(
          <>
            <circle cx="8" cy="8" r="6" />
            <path d="M2 8h12M8 2c2 1.8 2 10.2 0 12M8 2c-2 1.8-2 10.2 0 12" />
          </>
        ),
      },
      {
        title: "Morphic services",
        text: "Named on the domain",
        icon: mark(
          <>
            <path d="M3 11.5 8 3l5 8.5" />
            <path d="M5 8.5h6" />
          </>
        ),
      },
      {
        title: "Data links",
        text: "Set the links the service uses",
        icon: mark(
          <>
            <path d="M6.5 9.5 4 12a2.2 2.2 0 0 1-3-3l2.5-2.5M9.5 6.5 12 4a2.2 2.2 0 0 1 3 3L12.5 9.5M6 10l4-4" />
          </>
        ),
      },
      {
        title: "Structure you can change",
        text: "When the service needs to",
        icon: mark(<path d="M2 4h12M2 8h8M2 12h10" />),
      },
    ],
  },
  bios: {
    name: "Synx BIOS",
    tag: "Runtime",
    lead: "The network operating system. Not a computer's firmware.",
    image: "/img/bios.png?v=2",
    about: "About BIOS",
    rows: [
      {
        title: "Command line by ownership",
        text: "For the layer you own",
        icon: mark(<path d="M5 5 2 8l3 3M11 5l3 3-3 3M9 3 7 13" />),
      },
      {
        title: "Administer services",
        text: "See what belongs to you",
        icon: mark(
          <>
            <circle cx="6" cy="6" r="2.2" />
            <circle cx="11" cy="7" r="1.6" />
            <path d="M2.5 13c.4-2 1.8-3 3.5-3s3.1 1 3.5 3M10 10.2c.7-.4 1.5-.6 2.3-.4 1.2.3 1.8 1.2 2.2 2.6" />
          </>
        ),
      },
      {
        title: "Transfer a data source",
        text: "Hand it to the next owner",
        icon: mark(
          <>
            <ellipse cx="8" cy="4" rx="4.5" ry="1.8" />
            <path d="M3.5 4v3c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8V4M3.5 7.2V11c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8V7.2" />
          </>
        ),
      },
      {
        title: "Changes while live",
        text: "Without dropping the connection",
        icon: mark(
          <>
            <path d="M13 8a5 5 0 1 1-1.2-3.2" />
            <path d="M13 2.5V5h-2.5" />
          </>
        ),
      },
    ],
  },
  pass: {
    name: "Synx Pass",
    tag: "Identity",
    lead: "Identity, authentication, and ownership.",
    image: "/img/pass.png?v=2",
    about: "About Pass",
    rows: [
      {
        title: "People, services, machines",
        text: "Recognized on the domain",
        icon: mark(
          <>
            <circle cx="6" cy="6" r="2.2" />
            <path d="M2.5 13c.4-2 1.8-3 3.5-3s3.1 1 3.5 3" />
            <path d="M11 6.2h3M12.5 4.7v3" />
          </>
        ),
      },
      {
        title: "Authentication",
        text: "Who is connected",
        icon: mark(
          <>
            <circle cx="7" cy="8" r="2.4" />
            <path d="M9.2 8H14v1.6h-1.4V11H11v-1.4" />
          </>
        ),
      },
      {
        title: "Ownership control",
        text: "Access follows the owner",
        icon: mark(<path d="M8 2.2 13 4.2v4.1c0 3-2.1 4.6-5 5.5-2.9-.9-5-2.5-5-5.5V4.2L8 2.2z" />),
      },
      {
        title: "Access that can move",
        text: "When ownership moves",
        icon: mark(<path d="M2.5 8h9M9 5l3 3-3 3" />),
      },
    ],
  },
  skalle: {
    name: "Skalle AI",
    tag: "AI",
    lead: "Turn intent into infrastructure. An AI interface that helps create, connect, and operate Real Time Web services using your preferred AI model.",
    image: "/img/skalle.png?v=1",
    about: "About Skalle",
    rows: [
      {
        title: "From prompt to autonomous service",
        text: "Describe what you want to achieve",
        icon: mark(
          <>
            <circle cx="8" cy="8" r="2.2" />
            <path d="M8 2.2v2.1M8 11.7v2.1M2.2 8h2.1M11.7 8h2.1M3.8 3.8l1.5 1.5M10.7 10.7l1.5 1.5M12.2 3.8l-1.5 1.5M5.3 10.7l-1.5 1.5" />
          </>
        ),
      },
      {
        title: "AI that builds the network",
        text: "Not just the code",
        icon: mark(<path d="M6.5 9.5 4 12a2.2 2.2 0 0 1-3-3l2.5-2.5M9.5 6.5 12 4a2.2 2.2 0 0 1 3 3L12.5 9.5M6 10l4-4" />),
      },
      {
        title: "Describe what you need",
        text: "Skalle builds the connection",
        icon: mark(<path d="M3 4.5h10M3 8h7M3 11.5h8" />),
      },
    ],
  },
};

type CmsPlan = { name?: string; tag?: string; lead?: string; image?: string; aboutLabel?: string; rows?: { title: string; text: string; icon?: string }[] };

function CmsIcon({ name }: { name: string }) {
  const paths = ICON_PATHS[name] ?? [];
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths.map((d, i) => <path key={i} d={d} />)}</svg>;
}

export function ToolPlan({ slug, linked = true, cms = {}, name }: { slug: Slug; linked?: boolean; cms?: CmsPlan; name?: string }) {
  const base = plans[slug];
  const plan = {
    name: name ?? cms.name ?? base.name,
    tag: cms.tag ?? base.tag,
    lead: cms.lead ?? base.lead,
    image: mediaUrl(cms.image) ?? base.image,
    about: cms.aboutLabel ?? base.about,
    rows: (cms.rows?.length ? cms.rows : base.rows).map((row, i) => ({
      title: row.title,
      text: row.text,
      icon: (row as { icon?: unknown }).icon && typeof (row as { icon?: unknown }).icon === "string" && String((row as { icon?: unknown }).icon).startsWith("icon:") ? <CmsIcon name={String((row as { icon?: unknown }).icon).slice(5)} /> : base.rows[i]?.icon,
    })),
  };
  const body = (
    <>
      <img src={plan.image} alt="" />
      <h3>{plan.name}</h3>
      <div className="tag">{plan.tag}</div>
      <p className="lead">{plan.lead}</p>
      <ul>
        {plan.rows.map((row) => (
          <li key={row.title}>
            <span className="mark" aria-hidden="true">{row.icon}</span>
            <span>
              <strong>{row.title}</strong>
              <span>{row.text}</span>
            </span>
            <i className="go"></i>
          </li>
        ))}
      </ul>
      {linked ? <span className="btn btn-ghost">{plan.about}</span> : null}
    </>
  );

  if (!linked) {
    return <article className={`card plan ${slug}`}>{body}</article>;
  }

  return (
    <Link className={`card plan ${slug}`} id={slug} href={`/${slug}`}>
      {body}
    </Link>
  );
}

import { Logo } from "./Nav";
import { communityLinks } from "../lib/content";
import { useCms } from "../lib/cms";

const links = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
  { label: "Register now", href: "/contact#register" },
];

export default function Footer() {
  const { footer } = useCms();
  const nav: { label: string; href: string }[] = footer?.links?.length
    ? footer.links.map((l: { label: string; url: string }) => ({ label: l.label, href: l.url }))
    : links;
  const community: { title: string; href: string }[] = footer?.community?.length
    ? footer.community.map((l: { title: string; url: string }) => ({ title: l.title, href: l.url }))
    : communityLinks;
  return (
    <footer className="wrap footer">
      <div className="footer-row">
        <Logo text={footer?.logoText || undefined} image={footer?.logoImage || undefined} />
        <ul>
          {nav.map((l) => (
            <li key={l.href + l.label}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
      </div>
      <div className="footer-base">
        <p>{footer?.copyright || "Synx Tools @ 2026. All rights reserved."}</p>
        <ul className="footer-community">
          {community.map((l) => (
            <li key={l.title}>
              <a href={l.href} target="_blank" rel="noreferrer">
                {l.title} <span aria-hidden>↗</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

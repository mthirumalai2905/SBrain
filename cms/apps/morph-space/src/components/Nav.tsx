import { useEffect, useState } from "react";
import { LOGIN_URL } from "../lib/content";
import { mediaUrl, useCms } from "../lib/cms";
import SynxToolsMenu, { SynxToolsGrid } from "./SynxTools";

// Set to true to bring back the Synx Tools launcher (nav button and mobile menu grid).
const SHOW_SYNX_TOOLS = false;

export type Page = "home" | "how" | "features" | "pricing" | "contact";

// 13 rounded bars from the Figma logo mark (48x48 grid).
const bars: [number, number, number][] = [
  [6.7, 8.5, 8.3], [33, 8.5, 8.3],
  [6.7, 13.97, 14.5], [26.77, 13.97, 14.5],
  [6.7, 19.43, 8.3], [19.85, 19.43, 8.3], [33, 19.43, 8.3],
  [6.7, 24.9, 8.3], [33, 24.9, 8.3],
  [6.7, 30.37, 8.3], [33, 30.37, 8.3],
  [6.7, 35.83, 8.3], [33, 35.83, 8.3],
];

export function Logo({ text = "Morph Space", image }: { text?: string; image?: string }) {
  return (
    <a href="/" className="logo" aria-label={`${text} home`}>
      {image ? (
        <img src={mediaUrl(image)} alt="" width={38} height={38} style={{ objectFit: "contain" }} />
      ) : (
        <svg width="38" height="38" viewBox="0 0 48 48" aria-hidden>
          {bars.map(([x, y, w], i) => (
            <rect key={i} x={x} y={y} width={w} height="3.67" rx="1.83" />
          ))}
        </svg>
      )}
      <span>{text}</span>
    </a>
  );
}

const hrefOf: Record<Page, string> = { home: "/", how: "/how-it-works", features: "/features", pricing: "/pricing", contact: "/contact" };
const defaultNav = [
  { label: "How it works", url: "/how-it-works" },
  { label: "Features", url: "/features" },
  { label: "Pricing", url: "/pricing" },
  { label: "Contact", url: "/contact" },
];

export default function Nav({ page }: { page: Page }) {
  const { header } = useCms();
  const loginLabel = header?.loginLabel || "Login";
  const loginUrl = header?.loginUrl || LOGIN_URL;
  const registerLabel = header?.registerLabel || "Register now";
  const registerUrl = header?.registerUrl || "/contact#register";
  const [solid, setSolid] = useState(false);
  const [mac, setMac] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close the mobile menu on Escape, or when the screen grows past the mobile layout
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const wide = window.matchMedia("(min-width: 901px)");
    const onWide = () => wide.matches && setMenu(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [menu]);

  const nav: { label: string; url: string }[] = header?.navigation?.length ? header.navigation : defaultNav;
  const links = nav.map((l) => ({ label: l.label, href: l.url, active: l.url === hrefOf[page] }));
  const navLink = (l: (typeof links)[number], extra = "") => (
    <a key={l.label} href={l.href} className={`link ${extra} ${l.active ? "active" : ""}`} aria-current={l.active ? "page" : undefined}>
      {l.label}
    </a>
  );

  return (
    <header className={`nav ${solid || menu ? "solid" : ""}`}>
      {menu && (
        <nav id="mobile-menu" className="mobile-menu" aria-label="Menu">
          {links.map((l) => (
            <a key={l.label} href={l.href} className={l.active ? "active" : ""} onClick={() => setMenu(false)}>
              {l.label}
              <span aria-hidden>→</span>
            </a>
          ))}
          {SHOW_SYNX_TOOLS && (
            <>
              <p className="mobile-menu-label">Synx Tools</p>
              <SynxToolsGrid onPick={() => setMenu(false)} />
            </>
          )}
          <a href={loginUrl} className="gbtn mobile-menu-cta" onClick={() => setMenu(false)}>
            {loginLabel}
          </a>
          <a href={registerUrl} className="gbtn gbtn-light mobile-menu-cta" onClick={() => setMenu(false)}>
            {registerLabel}
          </a>
        </nav>
      )}
      <div className="wrap nav-row">
        <nav className="nav-side left" aria-label="Primary">
          {links.slice(0, 3).map((l) => navLink(l))}
        </nav>
        <Logo text={header?.logoText || undefined} image={header?.logoImage || undefined} />
        <div className="nav-side right">
          <button type="button" className="kbd-btn" onClick={() => window.dispatchEvent(new Event("open-palette"))}>
            <span className="kbd-label">{header?.jumpLabel || "Jump to"}</span>
            <kbd>{mac ? "⌘" : "Ctrl"} K</kbd>
          </button>
          {links[3] && navLink(links[3], "nav-contact")}
          {SHOW_SYNX_TOOLS && <SynxToolsMenu />}
          <a href={loginUrl} className="btn btn-sm nav-login">{loginLabel}</a>
          <a href={registerUrl} className="btn btn-sm btn-fill nav-register">{registerLabel}</a>
          <button
            type="button"
            className={`menu-btn ${menu ? "open" : ""}`}
            aria-expanded={menu}
            aria-controls="mobile-menu"
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => setMenu((m) => !m)}
          >
            <i />
            <i />
          </button>
        </div>
      </div>
    </header>
  );
}

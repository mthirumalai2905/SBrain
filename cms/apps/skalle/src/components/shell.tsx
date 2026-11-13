"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { IconDiscord, IconGitHub, IconLinkedIn, IconX } from "./Icons";
import { SpecManualRoot } from "./spec-manual";
import { list, useShared } from "@/lib/cms";

const ICONS: Record<string, () => ReactNode> = { x: IconX, github: IconGitHub, linkedin: IconLinkedIn, discord: IconDiscord };
const external = (url: string) => /^https?:/.test(url);

/** The menu, the clock and the footer around every page. Their content is the CMS's Header and Footer. */
export function Frame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const navTheme = useNavTheme(path);
  const { header, footer } = useShared();
  const links = list(header?.links);
  const footLinks = list(footer?.links);

  return (
    <SpecManualRoot>
      <header className="lab-nav" data-theme={navTheme}>
        <Link href={header?.brandUrl || "/"} aria-current={path === "/" ? "page" : undefined}>
          {header?.brand}
        </Link>
        <nav>
          {links.map((link) => (
            <Link
              key={link.url}
              href={link.url}
              aria-current={path === link.url || path.startsWith(`${link.url}/`) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {header?.showClock ? <Clock zone={header.clockZone || "UTC"} /> : <span />}
        {header?.ctaUrl ? (
          <a className="lab-nav-cta" href={header.ctaUrl}>
            {header.ctaLabel}
          </a>
        ) : null}
      </header>
      <main>{children}</main>
      <footer className="lab-foot">
        <p>{footer?.brand}</p>
        <nav aria-label="Footer">
          {footLinks.map((link) => (
            <Link key={link.url} href={link.url}>
              {link.label}
            </Link>
          ))}
          {list(footer?.fieldLinks).map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="lab-foot-end">
          {list(footer?.socials).map((social) => {
            const Icon = ICONS[social.icon] ?? IconX;
            return (
              <a key={social.url} href={social.url} target={external(social.url) ? "_blank" : undefined} rel="noreferrer">
                <Icon />
                {social.label}
              </a>
            );
          })}
          <p>{footer?.copyright}</p>
        </div>
        <div className="crt-hazard" aria-hidden="true">
          <span className="crt-stripes" />
          <span className="crt-access">{footer?.accessLine}</span>
          <span className="crt-stripes" />
        </div>
      </footer>
    </SpecManualRoot>
  );
}

function useNavTheme(path: string) {
  const [theme, setTheme] = useState<"light" | undefined>();
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".lab-nav");
    let frame = 0;
    const check = () => {
      frame = 0;
      const line = (header?.offsetHeight ?? 60) / 2;
      const light = [...document.querySelectorAll("[data-nav-theme='light']")].some((el) => {
        const box = el.getBoundingClientRect();
        return box.top <= line && box.bottom > line;
      });
      setTheme(light ? "light" : undefined);
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    queue();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      cancelAnimationFrame(frame);
    };
  }, [path]);
  return theme;
}

function Clock({ zone }: { zone: string }) {
  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const tick = () => {
      setClock(new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: zone }));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <time dateTime={clock}>{clock} {zone}</time>;
}

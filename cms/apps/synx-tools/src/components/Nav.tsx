"use client";

import { useEffect, useState } from "react";
import Link from "@/lib/Link";
import { usePathname } from "@/lib/router";
import { mediaUrl, useEditDoc, useShared } from "@/lib/cms";
import { NavSkalle } from "@/components/NavSkalle";

export function Nav({ film = false }: { film?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { header = {} } = useShared();
  const ed = useEditDoc("header");
  const links: { label: string; url: string; hasDropdown?: boolean }[] = header.links ?? [];
  const dropdown: { label: string; url: string; tone?: string }[] = header.dropdown ?? [];

  useEffect(() => {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav${film ? " film" : ""}${open ? " open" : ""}`} id="nav">
      <div className="nav-inner">
        <Link className="brand" href="/" aria-label="Synx tools">
          <img className="wordmark" src={mediaUrl(header.wordmark) ?? "/img/wordmark.png"} alt={header.wordmarkAlt ?? "Synx Tools"} {...ed.image("wordmark")} />
        </Link>
        <nav className="nav-links" id="menu" onClick={() => setOpen(false)}>
          {links.map((link, i) =>
            link.hasDropdown ? (
              <div className="nav-drop" key={link.url}>
                <Link href={link.url} aria-current={path === link.url ? "page" : undefined} {...ed.text(`links.${i}.label`)}>
                  {link.label}
                </Link>
                <div className="nav-drop-menu">
                  {dropdown.map((d, j) => (
                    <Link className={d.tone} href={d.url} key={d.url} {...ed.text(`dropdown.${j}.label`)}>{d.label}</Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link href={link.url} key={link.url} aria-current={path === link.url ? "page" : undefined} {...ed.text(`links.${i}.label`)}>
                {link.label}
              </Link>
            ),
          )}
        </nav>
        <div className="nav-actions">
          <NavSkalle />
          <button className="menu-btn" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {header.menuButtonLabel ?? "Menu"}
          </button>
        </div>
      </div>
    </header>
  );
}

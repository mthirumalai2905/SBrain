"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { PublicUser } from "@/lib/types";
import { roleLabel } from "@/lib/rbac";
import { AppearanceControl, AppearanceRail } from "./appearance";
import { SearchIcon, SidebarIcon, SignOutIcon } from "./icons";

const work = [
  { href: "/agent", label: "AI Agent", icon: "agent" },
  { href: "/websites", label: "Websites", icon: "websites" },
  { href: "/pipeline", label: "Pipeline", icon: "pipeline" },
  { href: "/drive", label: "Drive", icon: "drive" },
];

const system = [
  { href: "/health", label: "Health", icon: "health" },
  { href: "/logs", label: "Logs", icon: "logs" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function on(href: string, path: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

function NavItem({ href, label, icon, path }: { href: string; label: string; icon: string; path: string }) {
  return (
    <Link className={on(href, path) ? "nav-link active" : "nav-link"} href={href} title={label}>
      <span className="nav-logo">
        <img src={`/icons/${icon}.jpg`} alt="" />
      </span>
      <span className="nav-text">{label}</span>
    </Link>
  );
}

export function Shell({ user, children }: { user: PublicUser; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    setCollapsed(localStorage.getItem("brain-sidebar") === "collapsed");
  }, []);

  useEffect(() => {
    const tick = () => {
      fetch("/api/jobs", { method: "POST" })
        .then((res) => res.json())
        .then((data: { processed?: number }) => {
          if (data.processed) router.refresh();
        })
        .catch(() => undefined);
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [router]);

  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem("brain-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  async function signOut() {
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className={collapsed ? "shell collapsed" : "shell"}>
      {open ? <button className="scrim" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brand-logo">
            <img src="/icons/brain.jpg" alt="" />
          </span>
          <span className="brand-copy">
            <strong>Brain</strong>
            <em>Control Centre</em>
          </span>
          <button className="collapse" type="button" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <SidebarIcon />
          </button>
        </div>
        <form className="search" action="/search">
          <SearchIcon />
          <input name="q" placeholder="Search" aria-label="Search" />
        </form>
        <Link className="search-rail" href="/search" aria-label="Search" title="Search">
          <SearchIcon />
        </Link>
        <nav className="nav">
          <div>
            <NavItem href="/" label="Overview" icon="overview" path={path} />
          </div>
          <div>
            <p className="nav-label">Work</p>
            {work.map((item) => (
              <NavItem key={item.href} {...item} path={path} />
            ))}
          </div>
          <div>
            <p className="nav-label">System</p>
            {system.map((item) => (
              <NavItem key={item.href} {...item} path={path} />
            ))}
          </div>
        </nav>
        <div className="sidebar-foot">
          <AppearanceControl variant="segment" />
          <AppearanceRail />
          <div className="account">
            <span className="avatar" title={user.name}>
              {user.name.slice(0, 1)}
            </span>
            <span className="who">
              <strong>{user.name}</strong>
              <span>{roleLabel[user.role]}</span>
            </span>
            <button className="sign-out" type="button" onClick={signOut} disabled={leaving} aria-label="Sign Out" title="Sign Out">
              <SignOutIcon />
              <span>{leaving ? "Signing Out" : "Sign Out"}</span>
            </button>
          </div>
        </div>
      </aside>
      <div>
        <div className="mobile-bar">
          <button className="btn btn-text" type="button" onClick={() => setOpen(true)}>
            Menu
          </button>
          <span className="brand-logo sm">
            <img src="/icons/brain.jpg" alt="" />
          </span>
          <strong>Brain</strong>
        </div>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}

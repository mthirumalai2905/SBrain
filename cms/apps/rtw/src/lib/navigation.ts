export type DocStatus = "published" | "draft" | "pending";

export type NavItem = {
  title: string;
  href: string;
  status?: DocStatus;
  chapter?: string;
  nested?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

/** The side menu is built from the documentation pages: each page says which group and chapter it belongs to and where it sits. */
export const nav: NavGroup[] = [];
export let navItems: NavItem[] = [];

export function setNav(docs: Record<string, any>[]) {
  const groups = new Map<string, NavItem[]>();
  for (const d of [...docs].filter((x) => x.group).sort((x, y) => (x.order ?? 999) - (y.order ?? 999))) {
    const item: NavItem = {
      title: d.navTitle || d.title,
      href: d.path ? `/docs/${d.path}` : "/docs",
      status: d.status && d.status !== "published" ? d.status : undefined,
      chapter: d.chapter || undefined,
      nested: d.nested || undefined,
    };
    groups.set(d.group, [...(groups.get(d.group) ?? []), item]);
  }
  nav.splice(0, nav.length, ...[...groups].map(([title, items]) => ({ title, items })));
  navItems = nav.flatMap((group) => group.items);
}

export function isHoodMode(pathname: string) {
  return pathname === "/hood" || pathname.startsWith("/hood/");
}

export function canonicalDocsPath(pathname: string) {
  if (pathname === "/hood") return "/docs";
  if (pathname.startsWith("/hood/")) return `/docs/${pathname.slice("/hood/".length)}`;
  return pathname;
}

export function hoodHref(href: string) {
  if (href === "/docs") return "/hood";
  if (href.startsWith("/docs/")) return `/hood/${href.slice("/docs/".length)}`;
  return href;
}

export function docsLink(href: string, pathname: string) {
  return isHoodMode(pathname) && href.startsWith("/docs") ? hoodHref(href) : href;
}

export function getAdjacentDocs(pathname: string): {
  prev?: NavItem;
  next?: NavItem;
} {
  if (pathname === "/docs") {
    return { next: navItems[0] };
  }

  const index = navItems.findIndex((item) => item.href === pathname);
  if (index < 0) return {};
  return {
    prev: navItems[index - 1],
    next: navItems[index + 1],
  };
}

export const explorePaths = [
  {
    href: "/docs/introduction",
    label: "Real Time Web",
    text: "Start with what it is, then why, then data and information.",
  },
  {
    href: "/docs/architecture/identity",
    label: "Identity",
    text: "Understand identities, domains, and optional authentication.",
  },
  {
    href: "/docs/architecture/data-channels",
    label: "Data",
    text: "Understand real-time data channels and shared state.",
  },
  {
    href: "/hood/implementation/blueprint",
    label: "Under the hood",
    text: "Live channels, bidirectional addressing, and how RTW sits beside the World Wide Web.",
  },
  {
    href: "/docs/research",
    label: "Research",
    text: "Explore experiments and technical resources.",
  },
];

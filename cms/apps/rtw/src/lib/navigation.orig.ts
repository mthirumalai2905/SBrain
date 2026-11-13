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

export const nav: NavGroup[] = [
  {
    title: "Documentation",
    items: [
      { title: "What is Real Time Web?", href: "/docs/introduction", chapter: "Concept" },
      { title: "Why Real Time Web?", href: "/docs/introduction/why", chapter: "Concept" },
      { title: "Concept", href: "/docs/introduction/tomorrow/concept", chapter: "Concept" },
      { title: "Data and information", href: "/docs/introduction/data-and-information", chapter: "Concept" },
      { title: "What it can do", href: "/docs/introduction/what-it-can-do", chapter: "Concept" },
      { title: "How it works", href: "/docs/introduction/how-it-works", chapter: "Concept" },
      { title: "Vision and principles", href: "/docs/introduction/vision", chapter: "Concept" },
      { title: "How participation works", href: "/docs/introduction/onboarding", status: "draft", chapter: "Concept" },
      { title: "The Internet of tomorrow", href: "/docs/introduction/tomorrow", chapter: "Concept" },
      { title: "Vision", href: "/docs/introduction/tomorrow/vision", chapter: "Concept", nested: true },
      { title: "Mission", href: "/docs/introduction/tomorrow/mission", chapter: "Concept", nested: true },
      { title: "Values", href: "/docs/introduction/tomorrow/values", chapter: "Concept", nested: true },
      { title: "Personality", href: "/docs/introduction/tomorrow/personality", chapter: "Concept", nested: true },
      { title: "Audience", href: "/docs/introduction/tomorrow/audience", chapter: "Concept", nested: true },
      { title: "Position", href: "/docs/introduction/tomorrow/position", chapter: "Concept", nested: true },
      { title: "Promise", href: "/docs/introduction/tomorrow/promise", chapter: "Concept", nested: true },

      { title: "Morphic Architecture", href: "/docs/architecture", chapter: "MAD Architecture" },
      { title: "Infrastructure Layer", href: "/docs/architecture/infrastructure", chapter: "MAD Architecture" },
      { title: "Network / Security Layer", href: "/docs/architecture/network", chapter: "MAD Architecture" },
      { title: "Domain / Application Layer", href: "/docs/architecture/domain", chapter: "MAD Architecture" },
      { title: "Resource / Ownership Layer", href: "/docs/architecture/resource", chapter: "MAD Architecture" },
      { title: "Ghost Space", href: "/docs/architecture/ghost-space", chapter: "MAD Architecture" },
      { title: "Ghosts and twins", href: "/docs/architecture/ghosts-and-twins", chapter: "MAD Architecture" },
      { title: "Morphic services", href: "/docs/architecture/morphic-services", chapter: "MAD Architecture" },
      { title: "Data Channels", href: "/docs/architecture/data-channels", status: "draft", chapter: "MAD Architecture" },
      { title: "Identity", href: "/docs/architecture/identity", status: "draft", chapter: "MAD Architecture" },
      { title: "Domains", href: "/docs/architecture/domains", status: "draft", chapter: "MAD Architecture" },
      { title: "Discovery", href: "/docs/architecture/discovery", status: "draft", chapter: "MAD Architecture" },
      { title: "Authentication", href: "/docs/architecture/authentication", status: "draft", chapter: "MAD Architecture" },
      { title: "Interoperability", href: "/docs/architecture/interoperability", status: "draft", chapter: "MAD Architecture" },

      { title: "Network topology", href: "/docs/architecture/topology", status: "draft", chapter: "Network Topology" },
      { title: "Bijective network", href: "/docs/architecture/bijective-network", chapter: "Network Topology" },
      { title: "Blueprint", href: "/docs/implementation/blueprint", chapter: "Network Topology" },

      { title: "Protocol Overview", href: "/docs/specification", status: "pending", chapter: "Specifications" },
      { title: "Communication", href: "/docs/specification/communication", status: "pending", chapter: "Specifications" },
      { title: "Network", href: "/docs/specification/network", status: "pending", chapter: "Specifications" },
      { title: "Identity specification", href: "/docs/specification/identity", status: "pending", chapter: "Specifications" },
      { title: "Security", href: "/docs/specification/security", status: "pending", chapter: "Specifications" },
      { title: "Data channels specification", href: "/docs/specification/data-channels", status: "pending", chapter: "Specifications" },
      { title: "Dictionary", href: "/docs/implementation/dictionary", chapter: "Specifications" },
      { title: "FAQ", href: "/docs/reference/faq", chapter: "Specifications" },

      { title: "Technical Resources", href: "/docs/research", status: "pending", chapter: "Research" },

      { title: "Synx", href: "/docs/implementation/synx", chapter: "Implementations" },
      { title: "Morph Space", href: "/docs/implementation/morph", chapter: "Implementations" },
      { title: "Skalle", href: "/docs/implementation/skalle", status: "draft", chapter: "Implementations" },
      { title: "Reference Implementations", href: "/docs/research/implementations", chapter: "Implementations" },

      { title: "Experiments", href: "/docs/research/experiments", status: "pending", chapter: "Experiments" },

      { title: "Contributing", href: "/docs/reference/contributing", chapter: "Contribute" },
      { title: "Governance", href: "/docs/reference/governance", chapter: "Contribute" },

      { title: "Proof", href: "/docs/introduction/tomorrow/proof", chapter: "History" },
      { title: "Version History", href: "/docs/specification/versions", status: "pending", chapter: "History" },
      { title: "Summary", href: "/docs/summary", chapter: "History" },
    ],
  },
];

export const navItems = nav.flatMap((group) => group.items);

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

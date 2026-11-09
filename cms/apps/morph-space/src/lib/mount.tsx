import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";
import Nav, { type Page } from "../components/Nav";
import Footer from "../components/Footer";
import CommandPalette, { type PaletteItem } from "../components/CommandPalette";
import { applyTheme, CmsProvider, loadCms } from "./cms";
import { setAnnualSaving } from "./content";

const pages: PaletteItem[] = [
  { group: "Pages", label: "Home", href: "/" },
  { group: "Pages", label: "How it works", hint: "Try the demo", href: "/how-it-works" },
  { group: "Pages", label: "Features", href: "/features" },
  { group: "Pages", label: "Pricing", hint: "Plans and prices", href: "/pricing" },
  { group: "Pages", label: "Contact", hint: "Send a message", href: "/contact" },
];
const actions: PaletteItem[] = [
  { group: "Actions", label: "Back to top", href: "#top" },
];

const pageHref: Record<Page, string> = {
  home: "/",
  how: "/how-it-works",
  features: "/features",
  pricing: "/pricing",
  contact: "/contact",
};

const pageSlug: Record<Page, string> = { home: "home", how: "how-it-works", features: "features", pricing: "pricing", contact: "contact" };

/** Inside the CMS preview frame only: load the click-to-edit script. It never loads on the live site. */
function loadEditor() {
  const url = (import.meta.env.VITE_CMS_URL as string | undefined)?.replace(new RegExp("/$"), "");
  if (!url || window.parent === window) return;
  const s = document.createElement("script");
  s.src = url + "/sdk/visual-editing.js";
  document.head.appendChild(s);
}

/** Renders a page with the shared nav, footer, scroll bar and Ctrl/⌘ K menu. */
export async function mountPage(page: Page, content: ReactNode, onThisPage: PaletteItem[] = []) {
  const items = [
    ...onThisPage.map((i) => ({ ...i, group: "On this page" })),
    ...pages.filter((p) => p.href !== pageHref[page]),
    ...actions,
  ];
  // Get the page from the CMS first, so it appears already filled in. Falls back to the built-in text.
  const cms = await loadCms(pageSlug[page]);
  const saving = cms.page?.sections?.find((s) => s._type === "plans")?.annualSaving;
  if (typeof saving === "number") setAnnualSaving(saving);
  if (cms.page?.description) document.querySelector('meta[name="description"]')?.setAttribute("content", cms.page.description);
  applyTheme(cms.settings);
  loadEditor();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <CmsProvider initial={cms}>
        <Nav page={page} />
        {content}
        <Footer />
        <CommandPalette items={items} />
      </CmsProvider>
    </StrictMode>,
  );
}

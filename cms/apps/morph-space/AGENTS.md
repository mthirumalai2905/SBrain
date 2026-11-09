# Morph Space site

Plain React + TypeScript + CSS, bundled with Vite. No Next.js, no Tailwind, no animation libraries.

- Five pages, each an HTML entry listed in `vite.config.ts`: `index.html` → `src/main.tsx` (home), `pricing.html`, `how-it-works.html`, `features.html` and `contact.html`, each loading `src/<slug>.tsx`.
- Every entry calls `mountPage()` from `src/lib/mount.tsx`, which wraps the page content in the nav, footer, scroll progress and Ctrl K palette.
- Page bodies are in `src/home/`, `src/pricing/` and `src/pages/` (How it works, Features, Contact). Reusable sections (Features, Demo, Register form, icons) are in `src/sections/`.
- All styles live in `src/styles.css` (violet palette tokens at the top).
- Copy, plans and prices live in `src/lib/content.ts`; price maths in `src/lib/pricing.ts`. Animation helpers (reveal, split headings, tilt, scroll effects) are in `src/lib/motion.tsx`.
- `npm run dev` to develop, `npm run build` to typecheck and build into `dist/`. Local only for now, not deployed (no hosting config). Locally the dev server serves `/pricing` as `pricing.html`; pages read their content from the Synx Brain CMS (`src/lib/cms.tsx`).

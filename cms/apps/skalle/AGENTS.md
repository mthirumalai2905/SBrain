# Skalle AI site

The Skalle AI website (the design from `Desktop/Project/New/skalleaiLP`), as a plain React + Vite app that reads every page from the Synx Brain CMS. Runs on port 5182 (`npm run dev:skalle` in `cms`).

- **One app, many addresses.** `index.html` -> `src/main.tsx` -> `src/App.tsx`. `/` is the `home` page, `/articles/<slug>` a Times article, `/chronicles/<slug>` a comic volume, anything else is the page whose slug is the address (`/system`, `/lab`...). `src/lib/router.ts` and `src/lib/Link.tsx` route without reload.
- **Content** comes from the CMS (`src/lib/cms.tsx`): the page's sections, the shared Header, Footer, Website Settings and Spec manual, the Times articles and the Chronicle volumes. It needs `VITE_CMS_URL` and `VITE_CMS_KEY` (the Skalle delivery key) in `.env.local`; see `.env.example`.
- **Sections to markup:** `src/site/render.tsx` turns each section type (home-hero, scene-hero, card-grid, split-feature, charging-bay...) into the original Skalle markup, so the original stylesheets in `src/styles` apply unchanged.
- **The original components** (`src/components/*`) are the Skalle lab components, fed from the CMS through `src/content/*` (articles, Chronicles, spec manual) or props. The design was written for Next.js; `next/link` and `next/navigation` are stand-ins in `src/shims`.
- **Click to edit:** inside the CMS Live preview, `data-synx-edit` / `data-synx-key` attributes (see `cms.tsx`) let an editor click text and select sections.
- **Pictures** are uploaded to the CMS Media library and the content holds their addresses. Fonts come from Google Fonts (`index.html`).

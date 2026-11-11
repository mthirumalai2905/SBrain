# Synx Tools site

The Synx Tools website (the design from `Desktop/Project/New/Synx`), as a plain React + Vite app that reads every page from the Synx Brain CMS. Runs on port 5181 (`npm run dev:synx` in `cms`).

- **One app, many addresses.** `index.html` -> `src/main.tsx` -> `src/App.tsx`. The address picks the page: `/` is `home`, `/news/<slug>` an article, anything else is the page whose slug is the address (`/dns`, `/who`...). `src/lib/router.ts` and `src/lib/Link.tsx` do the routing (no reload).
- **Content** comes from the CMS (`src/lib/cms.tsx`): the page's sections, the shared Header, Footer and Website Settings, the Articles and the Team members. It needs `VITE_CMS_URL` and `VITE_CMS_KEY` (the Synx Tools delivery key) in `.env.local`; see `.env.example`.
- **Sections to markup:** `src/site/render.tsx` turns each section type (home-hero, place-hero, tool-hero, tool-plan, text-block, stance, robot-note, team, values, contact-form, faq, legal-body...) into the original Synx markup, so the original stylesheet (`src/globals.css`, copied unchanged) applies. The render functions are plain functions, not components, on purpose: `TextMotion` animates by walking the element tree and must be able to see the text.
- **Design files:** `src/components/*` are the original Synx components (Nav, Footer, ToolPlan, ContactForm... now fed from the CMS). Fonts (Albra), the background audio and a few decoration images are in `public/` because the CMS cannot hold fonts, audio or SVG.
- **Click to edit:** inside the CMS Live preview, `data-synx-edit` / `data-synx-image` / `data-synx-key` attributes (see `edit()` in `cms.tsx`) let an editor click text and images. The script loads only inside the preview frame.
- **Forms:** Contact and Newsletter post to `VITE_FORMS_URL` + `/api/contact` and `/api/newsletter`. The original site sends them through a Google Apps Script kept as a server secret, so they do nothing here until that is hosted somewhere.
- The Synx rules for copy apply: never an em dash or en dash, and hero headline lines never end with a full stop.

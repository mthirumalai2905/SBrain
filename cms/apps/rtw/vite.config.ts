import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// One single-page app: every address (/, /docs/..., /blog/...) is served by index.html and the page is chosen in the browser.
// The RTW design was written for Next.js, so next/link, next/image and next/navigation are small local stand-ins (src/shims).
const src = resolve(import.meta.dirname, "src");
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": src,
      "next/link": resolve(src, "shims/link.tsx"),
      "next/image": resolve(src, "shims/image.tsx"),
      "next/navigation": resolve(src, "shims/navigation.ts"),
    },
  },
});

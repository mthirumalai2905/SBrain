import { resolve } from "node:path";
import { defineConfig, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const PAGES = ["pricing", "how-it-works", "features", "contact"];

// Serve /pricing, /how-it-works, /features and /contact as their .html files locally,
// so the clean URLs work locally.
const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
  const m = req.url?.match(/^\/([a-z-]+)\/?(\?.*)?$/);
  if (m && PAGES.includes(m[1])) req.url = `/${m[1]}.html${m[2] ?? ""}`;
  next();
};
const cleanUrls = (): Plugin => ({
  name: "clean-urls",
  configureServer: (server) => void server.middlewares.use(rewrite),
  configurePreviewServer: (server) => void server.middlewares.use(rewrite),
});

// One HTML entry per page.
export default defineConfig({
  plugins: [react(), cleanUrls()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        ...Object.fromEntries(PAGES.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)])),
      },
    },
  },
});

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/fonts.css";
import "./styles/globals.css";
import "./styles/crt-footer.css";
import "./styles/scenes.css";
import "./styles/careers.css";
import "./styles/chronicles.css";
import "./styles/times.css";
import App from "./App";
import { loadEditor } from "@/lib/cms";

loadEditor();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { mountPage } from "./lib/mount";
import ContactPage from "./pages/ContactPage";

mountPage("contact", <ContactPage />, [
  { group: "", label: "Send a message", href: "#register" },
  { group: "", label: "Ways to reach us", href: "#reach" },
]);

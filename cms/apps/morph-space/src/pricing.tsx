import { mountPage } from "./lib/mount";
import Pricing from "./pricing/Pricing";

mountPage("pricing", <Pricing />, [
  { group: "", label: "Plans", href: "#plans" },
  { group: "", label: "FAQ", href: "#faq" },
]);

import { mountPage } from "./lib/mount";
import HowItWorksPage from "./pages/HowItWorksPage";

mountPage("how", <HowItWorksPage />, [{ group: "", label: "Try the demo", href: "#how" }]);

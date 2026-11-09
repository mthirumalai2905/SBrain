import { mountPage } from "./lib/mount";
import FeaturesPage from "./pages/FeaturesPage";

mountPage("features", <FeaturesPage />, [{ group: "", label: "All features", href: "#features" }]);

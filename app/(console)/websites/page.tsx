import type { Metadata } from "next";
import { PageHeader, Group, RowLink } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { liveDb } from "@/lib/live";

export const metadata: Metadata = { title: "Websites" };

const marks: Record<string, { src: string; fit: "cover" | "contain" }> = {
  synx: { src: "/icons/sites/synx.png", fit: "cover" },
  realtimeweb: { src: "/icons/sites/realtimeweb.png", fit: "contain" },
  morph: { src: "/icons/sites/morph.svg", fit: "contain" },
  skalle: { src: "/icons/sites/skalle.png", fit: "cover" },
};

export default async function WebsitesPage() {
  await requireUser();
  const db = await liveDb();
  return (
    <div>
      <PageHeader title="Websites" lede="Four sites, four content structures. Brain keeps its own copies and leaves each deployment independent." />
      <Group inset footer="No publishing connector was found for these sites. Designs and layouts stay on the deployments that already serve them.">
        {db.sites.map((site) => (
          <RowLink
            key={site.id}
            href={`/websites/${site.slug}`}
            title={site.name}
            sub={site.publicUrl.replace("https://", "")}
            aside="Not connected"
            icon={
              <span className={marks[site.id]?.fit === "contain" ? "site-logo contain" : "site-logo"}>
                <img src={marks[site.id]?.src ?? "/icons/sites/synx.png"} alt="" />
              </span>
            }
          />
        ))}
      </Group>
    </div>
  );
}

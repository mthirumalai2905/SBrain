import { setNav } from "@/lib/navigation";

/** The documentation. The pages live in the CMS; setDocs() fills this list before the page is drawn. */
export type DocStatus = "published" | "draft" | "pending";
export type DocBlock = { type: string; text?: string; diagram?: string; status?: string; to?: string };
export type LoadedDoc = {
  slug: string[];
  frontmatter: { title: string; description?: string; status?: DocStatus };
  blocks: DocBlock[];
};

export const docs: LoadedDoc[] = [];

export function setDocs(items: Record<string, any>[]) {
  docs.splice(
    0,
    docs.length,
    ...items.map((d) => ({
      slug: String(d.path || "").split("/").filter(Boolean),
      frontmatter: { title: d.title ?? "", description: d.description, status: (d.status as DocStatus) ?? "published" },
      blocks: Array.isArray(d.body) ? d.body : [],
    })),
  );
  setNav(items);
}

export function getDoc(slug: string[]): LoadedDoc | null {
  const key = slug.join("/");
  return docs.find((doc) => doc.slug.join("/") === key) ?? null;
}

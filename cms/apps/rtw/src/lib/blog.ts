/** The Journals articles. They live in the CMS; setPosts() fills this list before the page is drawn. */
export type PostBlock = {
  type: string; text?: string; image?: string; alt?: string; caption?: string; fit?: string;
  videoId?: string; title?: string; diagram?: string; question?: string;
};
export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  cover: string;
  coverAlt: string;
  readingMinutes: number;
  body: PostBlock[];
  author?: string;
  authorRole?: string;
  authorImage?: string;
};

export const posts: BlogPost[] = [];

export function setPosts(items: Record<string, any>[]) {
  const list = items
    .filter((p) => !p.archived)
    .map(
      (p) =>
        ({
          slug: p.slug, title: p.title ?? "", excerpt: p.excerpt ?? "", date: p.date ?? "", category: p.category ?? "", cover: p.cover ?? "",
          coverAlt: p.coverAlt ?? "", readingMinutes: p.readingMinutes ?? 1, body: Array.isArray(p.body) ? p.body : [],
          author: p.author, authorRole: p.authorRole, authorImage: p.authorImage,
        }) as BlogPost,
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  posts.splice(0, posts.length, ...list);
}

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function getRelated(slug: string, limit = 3) {
  const index = posts.findIndex((post) => post.slug === slug);
  if (index < 0) return posts.slice(0, limit);
  const related: BlogPost[] = [];
  for (let offset = 1; related.length < limit && offset < posts.length; offset += 1) {
    related.push(posts[(index + offset) % posts.length]);
  }
  return related;
}

export function formatPostDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

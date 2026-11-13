/** The Skalle Times. The stories live in the CMS; setArticles() fills this list before the page is drawn. */
export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "q"; text: string }
  | { type: "quote"; text: string; by?: string };

export type Article = {
  slug: string;
  section: string;
  title: string;
  dek: string;
  byline: string;
  date: string;
  minutes: number;
  image: string;
  alt: string;
  caption: string;
  body: ArticleBlock[];
};

export const articles: Article[] = [];
export let paperName = "The Skalle Times";
export let sections: string[] = [];

export function setArticles(list: Article[], name?: string) {
  articles.splice(0, articles.length, ...list);
  sections = [...new Set(articles.map((article) => article.section))];
  if (name) paperName = name;
}

export function findArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function formatDate(date: string, style: "short" | "long" = "short") {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
    weekday: style === "long" ? "long" : undefined,
    timeZone: "UTC",
  });
}

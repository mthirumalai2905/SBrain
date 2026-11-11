export type Source = "LinkedIn" | "X" | "Reddit" | "Journal" | "Synx" | "Medium";
export type Category = "Partnership" | "Build" | "Research" | "Launch" | "Community" | "Field notes" | "Articles";

/** One card in the company feed. Built from an Article in the CMS (see site/articles.ts). */
export type Post = {
  name: string;
  source: Source;
  category: Category;
  href: string;
  text: string;
  when: string;
  photo: string;
  title?: string;
  dek?: string;
  featured?: boolean;
  slug?: string;
  image?: string;
  body?: string[];
  linkedin?: string;
};

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, cloneElement, isValidElement, useLayoutEffect, useState, type ReactElement, type ReactNode } from "react";
import { isIos } from "@/lib/ios";
import { fade, rise } from "@/lib/motion";

const skipTags = new Set(["button", "nav", "form", "svg", "input", "textarea", "select", "label", "script", "style"]);

const blockTags = {
  a: motion.a,
  article: motion.article,
  div: motion.div,
  section: motion.section,
} as const;

const copyTags = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  p: motion.p,
  li: motion.li,
  blockquote: motion.blockquote,
  summary: motion.summary,
  strong: motion.strong,
  span: motion.span,
  small: motion.small,
  div: motion.div,
} as const;

type BlockTag = keyof typeof blockTags;
type CopyTag = keyof typeof copyTags;

function classNameOf(props: { className?: unknown }) {
  return typeof props.className === "string" ? props.className : "";
}

function hasClass(className: string, name: string) {
  return className.split(/\s+/).includes(name);
}

function isBlock(className: string) {
  return ["card", "tile", "person", "feed-card", "pair-card", "who-globe"].some((name) => hasClass(className, name));
}

function isCopy(type: string, className: string, inFacts: boolean): type is CopyTag {
  if (["h1", "h2", "h3", "h4", "p", "li", "blockquote", "summary"].includes(type)) return true;
  if (type === "div" && hasClass(className, "section-kicker")) return true;
  if (inFacts && (type === "strong" || type === "span" || type === "small")) return true;
  return false;
}

function skipped(className: string) {
  return hasClass(className, "footer-type") || hasClass(className, "nav") || hasClass(className, "hero") || hasClass(className, "invite");
}

function enhance(node: ReactNode, inFacts: boolean, delay: number): ReactNode {
  if (!isValidElement(node)) return node;

  const element = node as ReactElement<{ className?: string; children?: ReactNode }>;
  const type = element.type;

  if (typeof type !== "string") {
    // a component whose child is plain text (such as Stance) needs that text back as a string, not a list
    if (element.props.children == null || typeof element.props.children === "string") return element;
    const next = enhanceChildren(element.props.children, inFacts);
    if (next === element.props.children) return element;
    return cloneElement(element, undefined, next);
  }

  const className = classNameOf(element.props);
  if (skipped(className)) return element;

  const facts = inFacts;

  if ((type === "a" || type === "article" || type === "div" || type === "section") && isBlock(className)) {
    const Tag = blockTags[type as BlockTag];
    return <Tag {...element.props} {...rise(delay)} />;
  }

  if (type === "a" && element.props.children != null) {
    return cloneElement(element, undefined, enhanceChildren(element.props.children, facts));
  }

  if (skipTags.has(type)) return element;

  if (type === "img") {
    return <motion.img {...element.props} {...fade(delay)} />;
  }

  if (isCopy(type, className, facts)) {
    const Tag = copyTags[type as CopyTag];
    return <Tag {...element.props} {...rise(delay)} />;
  }

  if (element.props.children == null) return element;
  const next = enhanceChildren(element.props.children, facts);
  if (next === element.props.children) return element;
  return cloneElement(element, undefined, next);
}

function enhanceChildren(children: ReactNode, inFacts: boolean): ReactNode {
  const list = Children.toArray(children);
  if (list.length === 0) return children;
  let count = 0;
  return list.map((child) => {
    const delay = isTarget(child, inFacts) ? Math.min(count++ * 0.07, 0.28) : 0;
    return enhance(child, inFacts, delay);
  });
}

function isTarget(node: ReactNode, inFacts: boolean) {
  if (!isValidElement(node) || typeof node.type !== "string") return false;
  const className = classNameOf(node.props as { className?: unknown });
  if (skipped(className)) return false;
  if (isBlock(className)) return true;
  if (node.type === "img") return true;
  return isCopy(node.type, className, inFacts);
}

export function TextMotion({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [plain, setPlain] = useState(false);
  useLayoutEffect(() => {
    if (isIos()) setPlain(true);
  }, []);
  if (reduce || plain) return children;
  return enhanceChildren(children, false);
}

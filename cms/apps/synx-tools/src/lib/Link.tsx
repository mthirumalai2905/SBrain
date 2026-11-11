import type { AnchorHTMLAttributes } from "react";
import { navigate } from "@/lib/router";

/** Same use as next/link: an anchor that changes page without a reload. */
export default function Link({ href, onClick, target, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      target={target}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || target === "_blank") return;
        if (!href.startsWith("/")) return;
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

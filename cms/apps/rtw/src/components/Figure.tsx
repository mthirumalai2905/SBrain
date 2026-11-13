import Image from "next/image";
import { CornerMarks } from "@/components/CornerMarks";

type Props = {
  src: string;
  alt: string;
  caption?: string;
  fit?: "cover" | "contain";
};

export function Figure({ src, alt, caption, fit = "cover" }: Props) {
  return (
    <figure className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="relative aspect-[16/9] bg-black">
        <Image
          src={src}
          alt={alt}
          fill
          className={fit === "contain" ? "object-contain" : "object-cover"}
          sizes="(min-width: 768px) 736px, 100vw"
        />
        <CornerMarks />
      </div>
      {caption ? (
        <figcaption className="border-t border-[var(--line)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

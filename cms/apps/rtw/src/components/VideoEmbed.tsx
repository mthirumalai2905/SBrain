import { CornerMarks } from "@/components/CornerMarks";

type Props = {
  videoId: string;
  title: string;
  caption?: string;
};

export function VideoEmbed({ videoId, title, caption }: Props) {
  return (
    <figure className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="relative aspect-video bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
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

import { arr, notes } from "@/lib/notes";

export function ClarificationBanner() {
  const paragraphs = arr(notes.clarification);
  return (
    <div className="border border-[var(--line)] bg-[var(--bg-elev)] px-4 py-3 text-[0.875rem] leading-relaxed text-[var(--muted)]">
      {paragraphs.map((p, i) => (
        <p key={i} className={i ? "mt-2" : undefined}>
          {p.text}
        </p>
      ))}
    </div>
  );
}

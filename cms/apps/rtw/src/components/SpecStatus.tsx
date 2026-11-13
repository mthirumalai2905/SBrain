import { clsx } from "clsx";

type Props = {
  status: "published" | "draft" | "pending" | "proposal";
  children?: React.ReactNode;
};

import { arr, notes } from "@/lib/notes";

const copyOf = (status: Props["status"]) => arr(notes.specStatus).find((x) => x.status === status) ?? { label: "", text: "" };

export function SpecStatus({ status, children }: Props) {
  const item = copyOf(status);
  return (
    <aside
      className={clsx(
        "mb-8 border border-[var(--line)] bg-[var(--bg-elev)] px-4 py-3 text-[0.875rem] leading-relaxed text-[var(--muted)]",
      )}
    >
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
        {item.label}
      </div>
      <div>{children ?? item.text}</div>
    </aside>
  );
}

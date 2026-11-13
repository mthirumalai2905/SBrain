import { DocsNav } from "@/components/DocsNav";
import { DocsBrowseBar } from "@/components/NavPalette";

export function DocsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex">
      <aside className="hidden w-[260px] shrink-0 border-r border-[var(--line)] bg-[var(--bg)] md:block">
        <div className="nav-scroll sticky top-[calc(3.5rem+env(safe-area-inset-top))] max-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] overflow-y-auto px-4 py-6">
          <DocsNav />
        </div>
      </aside>
      <div className="min-w-0 flex-1 bg-[var(--bg-elev)]">
        <DocsBrowseBar />
        {children}
      </div>
    </div>
  );
}

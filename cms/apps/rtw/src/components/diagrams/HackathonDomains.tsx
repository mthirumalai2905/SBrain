"use client";

const domains = [
  { name: "Healthcare", text: "A live reading a clinician or a device can act on." },
  { name: "Logistics", text: "A moving source, not a batch report after the truck has left." },
  { name: "IoT", text: "A sensor that stays a sensor. The service supplies the job." },
  { name: "Games", text: "A present that stays open while people are still in it." },
];

export function HackathonDomains() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Same architecture. Different rooms.
      </div>
      <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
        {domains.map((item) => (
          <div key={item.name} className="bg-[var(--bg)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              {item.name}
            </p>
            <p className="mt-2 text-[14px] leading-6 text-[var(--ink)]">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

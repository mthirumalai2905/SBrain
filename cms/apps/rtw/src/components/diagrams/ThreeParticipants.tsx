"use client";

const roles = [
  {
    name: "Service makers",
    text: "Write the application layer. A Morphic service allocates ghosts and names a job.",
  },
  {
    name: "Object makers",
    text: "Build the body: a sensor, a board, a fridge. The radio and the plastic stay theirs.",
  },
  {
    name: "Owners",
    text: "Choose which services an object may join. That choice can be withdrawn.",
  },
];

export function ThreeParticipants() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Three jobs. They do not have to be the same party.
      </div>
      <div className="grid gap-px bg-[var(--line)] md:grid-cols-3">
        {roles.map((item) => (
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

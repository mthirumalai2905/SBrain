"use client";

import { useState } from "react";
import Link from "next/link";
import { FlowDown } from "@/components/diagrams/FlowArrow";

const layers = [
  {
    id: "infrastructure",
    code: "L1",
    title: "Infrastructure Layer",
    purpose: "Physical or virtual infrastructure that provides processing, connectivity, storage where required, and energy to sustain network operation.",
    components: "Devices, routers, network equipment, computing resources.",
    href: "/docs/architecture/infrastructure",
  },
  {
    id: "network",
    code: "L2",
    title: "Network and Security Layer",
    purpose: "Mechanisms for addressing, identity, authentication, authorization, trust, and secure communication.",
    components: "Identity, trust, addressing, and communication security.",
    href: "/docs/architecture/network",
  },
  {
    id: "domain",
    code: "L3",
    title: "Domain and Application Layer",
    purpose: "Domains, services, applications, and transformation logic that create functionality and determine how authorized data is processed.",
    components: "Applications, services, micropages, transformation logic.",
    href: "/docs/architecture/domain",
  },
  {
    id: "resource",
    code: "L4",
    title: "Resource and Ownership Layer",
    purpose: "The person, organization, machine, or device that generates or owns the resource and controls whether it may be accessed or shared.",
    components: "Endpoints, owners, access decisions, original data sources.",
    href: "/docs/architecture/resource",
  },
];

export function MadLayers() {
  const [open, setOpen] = useState<string | null>("network");

  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Morphic Architecture Design: four logical layers
      </div>
      <div className="diagram-grid p-4">
        <div className="mx-auto flex w-full max-w-none flex-col gap-2">
          {layers.map((layer, index) => {
            const active = open === layer.id;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setOpen(active ? null : layer.id)}
                className="w-full text-left"
              >
                <div
                  className={
                    "border px-4 py-3 transition-colors " +
                    (active
                      ? "border-[var(--accent)] bg-[var(--bg-elev)]"
                      : "border-[var(--line)] bg-[var(--bg-elev)] hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--line))]")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-mono text-[10px] text-[var(--accent)]">{layer.code}</span>
                      <div className="text-[14px] text-[var(--ink)]">{layer.title}</div>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--muted)]">
                      {active ? "collapse" : "expand"}
                    </span>
                  </div>
                  {active ? (
                    <div className="mt-3 space-y-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
                      <p>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                          Purpose
                        </span>
                        <br />
                        {layer.purpose}
                      </p>
                      <p>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                          Components
                        </span>
                        <br />
                        {layer.components}
                      </p>
                      <p className="text-[var(--muted)]">
                        Implementation details coming soon. Related page:{" "}
                        <Link href={layer.href} className="text-[var(--accent)]">
                          {layer.title}
                        </Link>
                      </p>
                    </div>
                  ) : null}
                </div>
                {index < layers.length - 1 ? (
                  <div className="flex justify-center py-1">
                    <FlowDown className="h-5 w-6" />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

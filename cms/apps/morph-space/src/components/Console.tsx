// Live mocks of the Morph Space product, used as the inner pages' visuals: a console window, streaming
// services with sparklines, an agent request log, a link graph and the small pieces the walkthrough shows.
// All data is illustrative and generated in the browser.
import { useEffect, useRef, useState, type ReactNode } from "react";

const reduce = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Seeded random so mocks look the same on every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** A random-walk series between 0 and 1 that keeps moving while the element is on screen. */
export function useLiveSeries(len = 28, every = 900, seed = 7) {
  const [data, setData] = useState(() => {
    const r = rng(seed);
    let v = 0.5;
    return Array.from({ length: len }, () => (v = Math.min(0.95, Math.max(0.08, v + (r() - 0.5) * 0.3))));
  });
  useEffect(() => {
    if (reduce()) return;
    const r = rng(seed * 31);
    const id = window.setInterval(() => {
      setData((d) => [...d.slice(1), Math.min(0.95, Math.max(0.08, d[d.length - 1] + (r() - 0.5) * 0.32))]);
    }, every);
    return () => window.clearInterval(id);
  }, [every, seed]);
  return data;
}

/** A number that counts up in small random steps. */
export function useTicker(start: number, every = 1200, maxStep = 4) {
  const [n, setN] = useState(start);
  useEffect(() => {
    if (reduce()) return;
    const id = window.setInterval(() => setN((x) => x + 1 + Math.floor(Math.random() * maxStep)), every);
    return () => window.clearInterval(id);
  }, [every, maxStep]);
  return n;
}

export function Sparkline({ data, className = "" }: { data: number[]; className?: string }) {
  const w = 120, h = 32;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - v * h] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  return (
    <svg className={`spark ${className}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <path className="spark-area" d={`${line}L${w},${h}L0,${h}Z`} />
      <path className="spark-line" d={line} />
    </svg>
  );
}

export type Tone = "live" | "linked" | "idle";
export function Status({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`cstatus cstatus--${tone}`}>
      <i aria-hidden />
      {children}
    </span>
  );
}

/** Window chrome around a mock: traffic lights, an rtw:// address and a live indicator. */
export function ConsoleFrame({
  address,
  children,
  className = "",
}: {
  address: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`console ${className}`} aria-hidden>
      <div className="console-bar">
        <span className="console-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="console-addr">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
          </svg>
          rtw://{address}
        </span>
        <Status tone="live">Live</Status>
      </div>
      <div className="console-body">{children}</div>
    </div>
  );
}

export function ServiceRow({ name, kind, tone, label, seed }: { name: string; kind: string; tone: Tone; label: string; seed: number }) {
  const data = useLiveSeries(28, 1000 + seed * 90, seed);
  return (
    <div className="csvc">
      <span className="csvc-name">
        <b>{name}</b>
        <small>{kind}</small>
      </span>
      <Sparkline data={data} />
      <Status tone={tone}>{label}</Status>
    </div>
  );
}

const AGENTS = ["harvest-planner", "grid-balancer", "fleet-router", "weather-bot", "supply-forecaster", "site-ops"];
const TARGETS = ["soil-sensor-12", "rainfall-model", "irrigation-plan", "price-feed"];

/** A log of agents calling services, a new line every second or so. */
export function AgentLog({ rows = 6 }: { rows?: number }) {
  const r = useRef(rng(11));
  const make = (i: number) => {
    const n = r.current;
    return {
      id: i,
      agent: AGENTS[Math.floor(n() * AGENTS.length)],
      target: TARGETS[Math.floor(n() * TARGETS.length)],
      ms: 12 + Math.floor(n() * 60),
    };
  };
  const [lines, setLines] = useState(() => Array.from({ length: rows }, (_, i) => make(i)));
  useEffect(() => {
    if (reduce()) return;
    let i = rows;
    const id = window.setInterval(() => setLines((l) => [make(i++), ...l.slice(0, rows - 1)]), 1300);
    return () => window.clearInterval(id);
    // make reads a stable ref
    // (rows is fixed per mount)
  }, [rows]);
  return (
    <ul className="clog">
      {lines.map((l) => (
        <li key={l.id}>
          <span className="clog-agent">{l.agent}</span>
          <span className="clog-arrow" aria-hidden>→</span>
          <span className="clog-target">{l.target}</span>
          <span className="clog-ms">{l.ms} ms</span>
        </li>
      ))}
    </ul>
  );
}

export type GraphNode = { id: string; label: string; x: number; y: number; main?: boolean };

/** Services as nodes, links as dashed lines with packets travelling along them. Coordinates are 0..100. */
export function LinkGraph({ nodes, links }: { nodes: GraphNode[]; links: [string, string][] }) {
  const at = (id: string) => nodes.find((n) => n.id === id)!;
  return (
    <svg className="cgraph" viewBox="0 0 100 62" aria-hidden>
      {links.map(([a, b], i) => {
        const p = at(a), q = at(b);
        const d = `M${p.x},${p.y} L${q.x},${q.y}`;
        return (
          <g key={i}>
            <path className="cgraph-link" d={d} />
            <circle className="cgraph-packet" r="0.9">
              <animateMotion dur={`${2.2 + i * 0.5}s`} repeatCount="indefinite" path={d} />
            </circle>
          </g>
        );
      })}
      {nodes.map((n) => (
        <g key={n.id} className={`cgraph-node ${n.main ? "main" : ""}`} transform={`translate(${n.x} ${n.y})`}>
          {n.main && <circle className="cgraph-halo" r="6" />}
          <circle r={n.main ? 3.2 : 2.2} />
          <text y={n.main ? 8.5 : 6.5}>{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

/** Types a domain name into a claim field, shows it's available, then starts over. */
export function DomainClaim({ names = ["greenacre", "harbourlab", "citygrid"] }: { names?: string[] }) {
  const [shown, setShown] = useState(reduce() ? names[0] : "");
  const [done, setDone] = useState(reduce());
  useEffect(() => {
    if (reduce()) return;
    let k = 0, i = 0, timer = 0;
    const step = () => {
      const name = names[k % names.length];
      if (i <= name.length) {
        setShown(name.slice(0, i++));
        setDone(false);
        timer = window.setTimeout(step, 110);
      } else {
        setDone(true);
        timer = window.setTimeout(() => {
          i = 0;
          k++;
          step();
        }, 2200);
      }
    };
    step();
    return () => window.clearTimeout(timer);
  }, [names]);
  return (
    <div className="cclaim">
      <div className="cclaim-field">
        <span className="cclaim-name">
          {shown}
          <i className="cclaim-caret" />
        </span>
        <span className="cclaim-tld">.space</span>
      </div>
      <span className={`cclaim-badge ${done ? "on" : ""}`}>{done ? "Available" : "Checking…"}</span>
    </div>
  );
}

/** Resources being connected one after another, each with a progress bar that fills, then "Connected". */
export function ResourceList() {
  const items = [
    { name: "Soil sensor, field 12", kind: "Live readings" },
    { name: "Price list.csv", kind: "Dataset" },
    { name: "Crop model v3", kind: "AI model" },
  ];
  return (
    <ul className="cres">
      {items.map((it, i) => (
        <li key={it.name} style={{ animationDelay: `${i * 0.5}s` }}>
          <span className="cres-icon" aria-hidden />
          <span className="cres-name">
            <b>{it.name}</b>
            <small>{it.kind}</small>
          </span>
          <span className="cres-bar" style={{ animationDelay: `${0.3 + i * 0.5}s` }}>
            <i />
          </span>
          <span className="cres-done" style={{ animationDelay: `${1.4 + i * 0.5}s` }}>
            Connected
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A published Morphic Service: address, live output and a format that flips between XML and JSON. */
export function ServiceCard({ compact = false }: { compact?: boolean }) {
  const data = useLiveSeries(36, 800, 3);
  const [json, setJson] = useState(false);
  useEffect(() => {
    if (reduce()) return;
    const id = window.setInterval(() => setJson((j) => !j), 2600);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className={`ccard ${compact ? "ccard--compact" : ""}`}>
      <div className="ccard-head">
        <span>
          <b>soil-sensor-12</b>
          <small>Morphic Service</small>
        </span>
        <Status tone="live">Live</Status>
      </div>
      <div className="ccard-addr">rtw://greenacre.space/soil</div>
      <Sparkline data={data} className="spark--big" />
      <div className="ccard-foot">
        <span className="ccard-toggle">
          <i className={json ? "" : "on"}>XML</i>
          <i className={json ? "on" : ""}>JSON</i>
        </span>
        <small>Reachable by people, apps and AI agents</small>
      </div>
    </div>
  );
}

/** Three independent sources flowing into one combined result. */
export function Composer() {
  const inputs = [
    { name: "Soil sensor", owner: "Greenacre farm" },
    { name: "Rainfall model", owner: "University lab" },
    { name: "Irrigation planner", owner: "Two-person startup" },
  ];
  return (
    <div className="ccompose" aria-hidden>
      <ul className="ccompose-in">
        {inputs.map((it) => (
          <li key={it.name}>
            <b>{it.name}</b>
            <small>{it.owner}</small>
          </li>
        ))}
      </ul>
      <svg className="ccompose-wires" viewBox="0 0 60 120" preserveAspectRatio="none">
        {[20, 60, 100].map((y, i) => (
          <g key={y}>
            <path d={`M0,${y} C30,${y} 30,60 60,60`} />
            <circle r="1.6">
              <animateMotion dur={`${1.8 + i * 0.35}s`} repeatCount="indefinite" path={`M0,${y} C30,${y} 30,60 60,60`} />
            </circle>
          </g>
        ))}
      </svg>
      <div className="ccompose-out">
        <span className="ccompose-tag">Combined by an agent</span>
        <b>Watering plan, field 12</b>
        <div className="ccompose-week">
          {[0.4, 0.75, 0.3, 0.9, 0.55, 0.2, 0.65].map((v, i) => (
            <i key={i} style={{ height: `${v * 100}%`, animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
        <small>Each piece still belongs to its owner</small>
      </div>
    </div>
  );
}

/** Data travelling from a source to its user, straight through a network that keeps no copy. */
export function DataFlow() {
  return (
    <div className="cflow" aria-hidden>
      <div className="cflow-node">
        <b>soil-sensor-12</b>
        <small>Source</small>
      </div>
      <div className="cflow-pipe">
        <span />
        <span />
        <span />
      </div>
      <div className="cflow-node cflow-node--net">
        <b>Real Time Web</b>
        <small>Passes through, keeps no copy</small>
        <span className="cflow-nostore">0 copies stored</span>
      </div>
      <div className="cflow-pipe">
        <span />
        <span />
        <span />
      </div>
      <div className="cflow-node">
        <b>Your app</b>
        <small>User</small>
      </div>
    </div>
  );
}

/** A chain of contributions with value flowing back to each step. */
export function ValueChain({ steps }: { steps: { role: string; text: string }[] }) {
  return (
    <div className="cchain" aria-hidden>
      <ol>
        {steps.map((s) => (
          <li key={s.role}>
            <b>{s.role}</b>
            <small>{s.text}</small>
          </li>
        ))}
      </ol>
      <div className="cchain-back">
        <span className="cchain-coins">
          <i />
          <i />
          <i />
          <i />
        </span>
        <small>Value flows back to every step</small>
      </div>
    </div>
  );
}

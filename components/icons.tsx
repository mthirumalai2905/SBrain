export function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="white"
        d="M9.1 4.6A3.4 3.4 0 0 0 7.4 11a3.6 3.6 0 0 0 .2 6.7A3.5 3.5 0 0 0 12 19.6V5.2A3.4 3.4 0 0 0 9.1 4.6zm5.8 0A3.4 3.4 0 0 0 12 5.2v14.4a3.5 3.5 0 0 0 4.4-1.9 3.6 3.6 0 0 0 .2-6.7 3.4 3.4 0 0 0-1.7-6.4z"
      />
    </svg>
  );
}

const stroke = {
  fill: "none",
  stroke: "white",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Glyph({ name }: { name: string }) {
  if (name === "overview") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.6" {...stroke} />
        <rect x="13" y="4" width="7" height="7" rx="1.6" {...stroke} />
        <rect x="4" y="13" width="7" height="7" rx="1.6" {...stroke} />
        <rect x="13" y="13" width="7" height="7" rx="1.6" {...stroke} />
      </svg>
    );
  }
  if (name === "agent") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5l1.3 5.2L18.5 10 13.3 11.3 12 16.5 10.7 11.3 5.5 10l5.2-1.3L12 3.5z" {...stroke} />
        <path d="M18 14.5l.6 2 2 .5-2 .6-.6 2-.6-2-2-.6 2-.5.6-2z" {...stroke} />
      </svg>
    );
  }
  if (name === "websites") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" {...stroke} />
        <path d="M4 9h16" {...stroke} />
      </svg>
    );
  }
  if (name === "pipeline") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 6h11M8 12h11M8 18h11" {...stroke} />
        <path d="M4.5 6l1.2 1.2L7.8 5M4.5 12l1.2 1.2L7.8 11" {...stroke} />
        <circle cx="5.8" cy="18" r="1.1" fill="white" stroke="none" />
      </svg>
    );
  }
  if (name === "drive") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5V8a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9.5z" {...stroke} />
      </svg>
    );
  }
  if (name === "health") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12h3l2-4 3 8 2-4h6" {...stroke} />
      </svg>
    );
  }
  if (name === "logs") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" {...stroke} />
        <path d="M12 8v4.5L15 15" {...stroke} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" {...stroke} />
      <path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.7 6.7l1.6 1.6M15.7 15.7l1.6 1.6M17.3 6.7l-1.6 1.6M8.3 15.7l-1.6 1.6" {...stroke} />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SidebarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 4.5v15" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 7V6.2A2.2 2.2 0 0 1 12.2 4h6.6A2.2 2.2 0 0 1 21 6.2v11.6a2.2 2.2 0 0 1-2.2 2.2h-6.6A2.2 2.2 0 0 1 10 17.8V17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 12h10.2M11.2 8.4 14.8 12l-3.6 3.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Chevron() {
  return (
    <svg className="chevron" viewBox="0 0 8 13" aria-hidden="true">
      <path d="M1 1.2 6.2 6.5 1 11.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

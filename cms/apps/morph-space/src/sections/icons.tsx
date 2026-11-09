import type { ReactNode } from "react";

const svg = (children: ReactNode) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export const globe = svg(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></>);
export const blocks = svg(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><path d="M17 13.5v7M13.5 17h7" /></>);
export const people = svg(<><circle cx="9" cy="8.5" r="3.2" /><path d="M3 20c.4-3.4 3-5.4 6-5.4s5.6 2 6 5.4" /><circle cx="17" cy="9.5" r="2.4" /><path d="M17.5 14.4c2 .2 3.2 1.7 3.5 4" /></>);
export const lock = svg(<><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>);
export const link = svg(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>);
export const sliders = svg(<><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>);
export const check = svg(<path d="M5 12.5l4.5 4.5L19 7" />);
export const play = svg(<><circle cx="12" cy="12" r="9" /><path d="M10 8.8v6.4l5.2-3.2z" /></>);
export const tag = svg(<><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-6.6 6.6a1 1 0 0 1-1.4 0z" /><circle cx="8" cy="8" r="1.4" /></>);
export const mail = svg(<><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></>);

export const pillarIcons = [globe, blocks, people];
export const featureIcons = [globe, blocks, lock, link, sliders, check];

import type { ReactNode } from 'react';

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
const svg = (...children: ReactNode[]) => <svg {...base}>{children}</svg>;

export const Home = () => svg(<path key="a" d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />);
export const Pages = () => svg(<path key="a" d="M8 3h8l3 3v13H8z" />, <path key="b" d="M5 7v14h11" />);
export const Diamond = () => svg(<path key="a" d="m12 3 4.5 4.5L12 12 7.5 7.5z" />, <path key="b" d="m7.5 12 4.5 4.5L7.5 21 3 16.5z" />, <path key="c" d="m16.5 12 4.5 4.5-4.5 4.5-4.5-4.5z" />);
export const Info = () => svg(<circle key="a" cx="12" cy="12" r="9" />, <path key="b" d="M12 11v5M12 8h.01" />);
export const DocList = () => svg(<path key="a" d="M6 3h8l4 4v14H6z" />, <path key="b" d="M9 12h6M9 16h6M9 8h2" />);
export const Menu = () => svg(<path key="a" d="M4 7h16M4 12h16M4 17h16" />);
export const Layout = () => svg(<rect key="a" x="3" y="4" width="18" height="16" rx="2" />, <path key="b" d="M12 4v16" />);
export const Gear = () => svg(<circle key="a" cx="12" cy="12" r="3" />, <path key="b" d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />);
export const Folder = () => svg(<path key="a" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />);
export const Doc = () => svg(<path key="a" d="M6 3h8l4 4v14H6z" />, <path key="b" d="M14 3v4h4" />);
export const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 6 6 6-6 6" /></svg>
);

/** Picks an icon from a page or content type's name, so the tree is easy to scan. */
export function iconFor(name: string, kind: 'page' | 'collection' | 'singleton' = 'page'): ReactNode {
  const n = name.toLowerCase();
  if (n.includes('home')) return <Home />;
  if (n.includes('about')) return <Info />;
  if (n.includes('resource')) return <Pages />;
  if (n.includes('architect')) return <Diamond />;
  if (/article|blog|post|news/.test(n)) return <DocList />;
  if (/header|nav|menu/.test(n)) return <Menu />;
  if (n.includes('footer')) return <Layout />;
  if (/setting|config/.test(n)) return <Gear />;
  return kind === 'collection' ? <Folder /> : <Doc />;
}

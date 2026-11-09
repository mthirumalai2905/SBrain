/**
 * The built-in icons an editor can pick (24×24, drawn with a 1.5 line). An icon field stores "icon:<name>" for one of
 * these, or the address of an uploaded image. Keep this file identical in apps/admin and apps/morph-space.
 */
export const ICON_PATHS: Record<string, string[]> = {
  lock: ['M7 10.5h10a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5.5a2 2 0 0 1 2-2z', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  globe: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M3 12h18', 'M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z'],
  link: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  mail: ['M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z', 'M3.5 7l8.5 6 8.5-6'],
  star: ['M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z'],
  heart: ['M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z'],
  bolt: ['M13 3L5 13.5h6L10 21l8-10.5h-6z'],
  shield: ['M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z', 'M9 12l2.2 2.2L15 10'],
  play: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M10 8.8v6.4l5.2-3.2z'],
  tag: ['M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-6.6 6.6a1 1 0 0 1-1.4 0z', 'M8 8h.01'],
  people: ['M9 5.3a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z', 'M3 20c.4-3.4 3-5.4 6-5.4s5.6 2 6 5.4', 'M17 7.1a2.4 2.4 0 1 0 0 4.8', 'M17.5 14.4c2 .2 3.2 1.7 3.5 4'],
  user: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4.5 20c.6-4 3.7-6 7.5-6s6.9 2 7.5 6'],
  home: ['M4 11l8-7 8 7', 'M6 9.5V20h12V9.5', 'M10 20v-5h4v5'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M16.5 16.5L21 21'],
  sliders: ['M4 7h10M18 7h2M4 17h2M10 17h10', 'M16 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', 'M8 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'],
  chat: ['M4 5.5h16v10H9l-5 4z'],
  cloud: ['M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5 3.8 3.8 0 0 1 17.5 18z'],
  code: ['M8.5 7L3.5 12l5 5', 'M15.5 7l5 5-5 5'],
  rocket: ['M12 3c3.5 2 5 5.5 5 9l-2.5 3h-5L7 12c0-3.5 1.5-7 5-9z', 'M10 17l-1 4 3-2 3 2-1-4'],
  chart: ['M4 20V4', 'M4 20h16', 'M8 16v-4', 'M12 16V8', 'M16 16v-6'],
  cube: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M4 7.5l8 4.5 8-4.5', 'M12 12v9'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  plus: ['M12 5v14M5 12h14'],
  clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2'],
  database: ['M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z', 'M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
  sparkle: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'],
};

/** The Synx product marks: rounded bars in a 40×40 box (filled, not outlined). */
type Bar = [x: number, y: number, w: number];
const PASS: Bar[] = [[6.6, 0, 15.73], [5.83, 4.57, 6.85], [16.24, 4.57, 6.85], [3.04, 9.13, 8.119], [17.76, 9.13, 8.119], [1.01, 13.7, 9.641], [18.27, 13.7, 9.641], [0, 18.27, 10.656], [18.27, 18.27, 10.656], [0, 22.83, 10.656], [18.27, 22.83, 10.656]];
const DNS: Bar[] = [[0, 0, 7.053], [13.6, 0, 15.113], [0, 4.57, 15.617], [20.653, 4.57, 8.06], [0, 9.14, 7.053], [15.111, 9.14, 13.602], [0, 13.7, 19.143], [21.63, 13.7, 7.053], [0, 18.27, 7.053], [11.585, 18.27, 17.128], [0, 22.84, 15.113], [21.66, 22.84, 7.053]];
const SKALLE: Bar[] = [[9.91, 7.08, 20.183], [6.3, 11.64, 27.392], [8.47, 16.19, 8.073], [23.46, 16.19, 8.073], [8.18, 20.75, 23.643], [12.07, 25.31, 15.858], [14.81, 29.86, 2.883], [18.56, 29.86, 2.883], [22.31, 29.86, 2.883]];
export const ICON_BARS: Record<string, { bars: Bar[]; dx: number; dy: number; h: number }> = {
  'synx-pass': { bars: PASS, dx: 5.538, dy: 7.059, h: 3.045 },
  'synx-dns': { bars: DNS, dx: 5.64, dy: 7.06, h: 3.045 },
  'synx-bios': { bars: PASS, dx: 5.538, dy: 7.059, h: 3.045 },
  skalle: { bars: SKALLE, dx: 0, dy: 0, h: 3.056 },
};

export const ICON_NAMES = [...Object.keys(ICON_PATHS), ...Object.keys(ICON_BARS)];

/** The built-in icon name inside a field value ("icon:lock" → "lock"), or undefined for an image address or nothing. */
export const iconName = (v?: string) => (v && v.startsWith('icon:') && (ICON_PATHS[v.slice(5)] || ICON_BARS[v.slice(5)]) ? v.slice(5) : undefined);

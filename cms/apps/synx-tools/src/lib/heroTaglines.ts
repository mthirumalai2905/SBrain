export type HeroTagline = {
  lines: readonly string[];
  text: string;
  wide?: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

/** The home hero shows one tagline per day, in turn. */
export function taglineAt(list: HeroTagline[], now = Date.now()): HeroTagline {
  return list[Math.floor(now / DAY) % list.length];
}

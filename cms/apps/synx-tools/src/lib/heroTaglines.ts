export type HeroTagline = {
  lines: readonly string[];
  text: string;
  wide?: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

/** Which tagline the home hero shows today: one per day, in turn. */
export const taglineIndexAt = (count: number, now = Date.now()) => Math.floor(now / DAY) % count;

export function taglineAt(list: HeroTagline[], now = Date.now()): HeroTagline {
  return list[taglineIndexAt(list.length, now)];
}

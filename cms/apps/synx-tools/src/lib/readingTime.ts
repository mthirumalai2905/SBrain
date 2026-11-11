const wordsPerMinute = 220;

export function readingMinutes(parts: readonly string[]) {
  const words = parts.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

export function readingLabel(minutes: number) {
  return minutes === 1 ? "1 min read" : `${minutes} min read`;
}

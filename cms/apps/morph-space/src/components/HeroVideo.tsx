import { useEffect, useRef } from "react";

const HD = "/video/city-4k.mp4"; // 3840×2160, ~16 MB
const SD = "/video/city-720.mp4"; // 1280×720, ~3 MB

type NetInfo = { saveData?: boolean; effectiveType?: string };

/** 4K only where it shows (large or high-density screens) and the connection can take it. */
function pickSource() {
  const net = (navigator as Navigator & { connection?: NetInfo }).connection;
  const slow = !!net && (net.saveData === true || /(^|-)(2g|3g)$/.test(net.effectiveType ?? ""));
  const pixels = Math.max(window.screen.width, window.innerWidth) * (window.devicePixelRatio || 1);
  // the 720p file starts to look soft once it is stretched past ~1300 device pixels
  return !slow && pixels > 1300 ? HD : SD;
}

/**
 * Looping city video behind a hero. Muted and inline so it can autoplay,
 * slowed slightly for a calmer feel, paused while off-screen, and left on
 * its first frame for people who prefer reduced motion. A violet grade and
 * a dark shade on top keep it on-palette and the text readable.
 *
 * `video` and `image` come from the CMS. A video replaces the built-in one (the image shows until it plays);
 * an image alone is shown instead of any video. With neither, the built-in city video plays.
 */
export default function HeroVideo({ className = "", video, image }: { className?: string; video?: string; image?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const imageOnly = !!image && !video;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const slow = () => {
      v.playbackRate = 0.8;
    };
    v.addEventListener("loadedmetadata", slow);
    // choose the file here (not in markup) so only one version is ever downloaded
    v.src = video || pickSource();

    if (reduce) {
      v.addEventListener("loadeddata", () => v.pause(), { once: true });
      return () => v.removeEventListener("loadedmetadata", slow);
    }

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => {
      io.disconnect();
      v.removeEventListener("loadedmetadata", slow);
    };
  }, [video]);

  return (
    <div className={`hero-video ${className}`} aria-hidden>
      {imageOnly ? (
        <img className="hero-video-img" src={image} alt="" />
      ) : (
        <video ref={ref} muted loop playsInline autoPlay preload="auto" poster={image} />
      )}
      <span className="hero-video-tint" />
      <span className="hero-video-shade" />
    </div>
  );
}

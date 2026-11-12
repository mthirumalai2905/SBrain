"use client";

import { useEffect, useRef } from "react";
import { mediaUrl, useShared } from "@/lib/cms";

// Raw markup on purpose. React renders playsInline / autoPlay in camel case,
// and iPhone Safari then treats the film as a tap-to-play video and draws
// the big play button over the page.
function markup(src: string) {
  return `<video src="${src}" muted playsinline webkit-playsinline="true" autoplay loop preload="auto"></video>`;
}

function Film({ className, defer = false, editPath }: { className: string; defer?: boolean; editPath?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const src = mediaUrl(useShared().film) ?? "";

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    let dead = false;
    let stop = () => {};

    const boot = (video: HTMLVideoElement) => {
      stop = watch(video, () => dead);
    };

    if (!defer) {
      const video = box.querySelector("video");
      if (video) boot(video);
      return () => {
        dead = true;
        stop();
      };
    }

    // An empty video element is what iPhone Safari paints as a white page.
    const observer = new IntersectionObserver(([entry]) => {
      if (dead || !entry?.isIntersecting || box.querySelector("video")) return;
      observer.disconnect();
      box.innerHTML = markup(src);
      const video = box.querySelector("video");
      if (video) boot(video);
    }, { rootMargin: "240px" });
    observer.observe(box);
    return () => {
      dead = true;
      observer.disconnect();
      stop();
    };
  }, [defer, src]);

  return (
    <div
      ref={boxRef}
      className={className}
      aria-hidden="true"
      {...(editPath ? { "data-synx-image": editPath } : {})}
      dangerouslySetInnerHTML={defer ? undefined : { __html: markup(src) }}
    />
  );
}

function watch(video: HTMLVideoElement, stopped: () => boolean) {
  const arm = () => {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.controls = false;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("autoplay", "true");
  };
  arm();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    video.pause();
    video.removeAttribute("src");
    video.load();
    return () => {};
  }

  let readyToResume = true;

  const play = () => {
    if (stopped()) return;
    arm();
    if (!video.getAttribute("src")) {
      video.preload = "auto";
    }
    if (!video.paused && !video.ended) return;
    video.play().catch(() => {});
  };

  const onReady = () => {
    if (readyToResume) play();
  };
  const onEnded = () => {
    video.currentTime = 0;
    play();
  };
  const blockMenu = (event: Event) => event.preventDefault();

  video.addEventListener("loadeddata", onReady);
  video.addEventListener("canplay", onReady);
  video.addEventListener("ended", onEnded);
  video.addEventListener("contextmenu", blockMenu);

  play();

  let seen = false;
  const observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) {
      seen = true;
      readyToResume = true;
      play();
    } else if (seen) {
      readyToResume = false;
      video.pause();
    }
  });
  observer.observe(video.parentElement ?? video);

  const unlock = () => play();
  const onPlaying = () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("touchend", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("touchend", unlock, true);
  video.addEventListener("playing", onPlaying);

  const retry = window.setInterval(() => {
    if (stopped() || !readyToResume || !video.paused) {
      if (!video.paused) window.clearInterval(retry);
      return;
    }
    play();
  }, 500);
  const stopRetry = window.setTimeout(() => window.clearInterval(retry), 8000);

  return () => {
    observer.disconnect();
    window.clearInterval(retry);
    window.clearTimeout(stopRetry);
    video.removeEventListener("loadeddata", onReady);
    video.removeEventListener("canplay", onReady);
    video.removeEventListener("ended", onEnded);
    video.removeEventListener("contextmenu", blockMenu);
    video.removeEventListener("playing", onPlaying);
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("touchend", unlock, true);
  };
}

export function HeroFilm({ editPath }: { editPath?: string }) {
  return <Film className="hero-film" editPath={editPath} />;
}

export function FooterFilm() {
  return <Film className="footer-film" defer />;
}

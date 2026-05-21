"use client";

/**
 * Unified thumbnail/preview component for workout cards. Plays the
 * video on hover / touch only — keeps initial network and CPU cost
 * low when a list of 20+ cards is on screen.
 *
 * Renders, in priority order:
 *   1. If `videoUrl` is a DIRECT video file (mp4/mov/webm) → native
 *      <video> that starts playing on mouseenter and pauses on
 *      mouseleave. On touch devices, the first tap starts it; the
 *      Link wrapping the card still handles navigation on the second
 *      tap.
 *   2. If `videoUrl` is a YouTube URL → static poster image
 *      (img.youtube.com/vi/<id>/hqdefault.jpg). On hover, swap to an
 *      iframe with `autoplay=1`, `mute=1`. (We can't pause the iframe
 *      from outside, so we just unmount it on leave to "stop".)
 *   3. Other recognised platforms (Instagram, TikTok, Facebook) → fall
 *      through to the gif.
 *   4. If a `gifUrl` is set → animated illustration via ExerciseGif.
 *   5. Otherwise → empty placeholder div.
 */

import { useRef, useState } from "react";
import { parseVideoUrl } from "@/lib/video";
import ExerciseGif from "./ExerciseGif";

interface Props {
  gifUrl: string | null | undefined;
  videoUrl: string | null | undefined;
  title?: string;
  className?: string;
}

export default function WorkoutMediaThumbnail({
  gifUrl,
  videoUrl,
  title = "",
  className = "",
}: Props) {
  const info = videoUrl ? parseVideoUrl(videoUrl) : null;

  // 1. Direct video file — play on hover/touch
  if (info?.platform === "direct") {
    return <DirectVideoHover src={info.embedUrl} title={title} className={className} />;
  }

  // 2. YouTube — poster frame, iframe swaps in on hover
  if (info?.platform === "youtube") {
    return <YouTubeHover videoId={info.id} title={title} className={className} />;
  }

  // 3+4. Other video platforms or no video → fall back to gif
  if (gifUrl) {
    return <ExerciseGif src={gifUrl} alt={title} className={className} />;
  }

  // 5. Nothing to show
  return <div className={className} aria-hidden />;
}

function DirectVideoHover({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const start = () => {
    const v = videoRef.current;
    if (!v) return;
    // Some mobile browsers reject autoplay if currentTime isn't 0,
    // and we want every hover to restart the demo.
    v.currentTime = 0;
    // play() returns a Promise — silence rejections (autoplay policies).
    void v.play().catch(() => {});
  };
  const stop = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={start}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={title || undefined}
        className="absolute inset-0 w-full h-full object-cover"
      >
        Your browser doesn&apos;t support embedded video.
      </video>
    </div>
  );
}

function YouTubeHover({
  videoId,
  title,
  className,
}: {
  videoId: string;
  title: string;
  className: string;
}) {
  const [hover, setHover] = useState(false);
  const poster = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const embed =
    `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&` +
    `playlist=${videoId}&controls=0&modestbranding=1&showinfo=0&rel=0&playsinline=1`;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={() => setHover(true)}
    >
      {hover ? (
        <iframe
          src={embed}
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={title || "Workout preview"}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      ) : (
        <img
          src={poster}
          alt={title || ""}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
}

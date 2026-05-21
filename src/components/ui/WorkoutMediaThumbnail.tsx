"use client";

/**
 * Unified thumbnail/preview component for workout cards.
 *
 * Renders, in priority order:
 *   1. If `videoUrl` is a DIRECT video file (mp4/mov/webm) → native
 *      <video autoplay muted loop playsinline> that plays automatically
 *      in a feed-style card.
 *   2. If `videoUrl` is a YouTube URL → <iframe> with autoplay=1, mute=1,
 *      loop=1 (YouTube quirk: needs playlist=<id> for self-loop).
 *   3. Other recognised platforms (Instagram, TikTok, Facebook) can't
 *      reliably autoplay in an iframe → fall through to the gif.
 *   4. If a `gifUrl` is set → animated illustration via ExerciseGif.
 *   5. Otherwise → empty placeholder div.
 *
 * Use for card-style surfaces (admin/workouts list, hub/workouts list,
 * plan editor exercise cards, my-plan exercise cards). For the detail
 * page (with full audio/controls) use `VideoEmbed` directly.
 */

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

  // 1. Direct video file — native autoplay-muted-loop
  if (info?.platform === "direct") {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <video
          src={info.embedUrl}
          autoPlay
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

  // 2. YouTube — iframe with autoplay quirks
  if (info?.platform === "youtube") {
    const ytEmbed =
      `${info.embedUrl}?autoplay=1&mute=1&loop=1&playlist=${info.id}` +
      `&controls=0&modestbranding=1&showinfo=0&rel=0&playsinline=1`;
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <iframe
          src={ytEmbed}
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={title || "Workout preview"}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>
    );
  }

  // 3+4. Other video platforms or no video → fall back to gif
  if (gifUrl) {
    return <ExerciseGif src={gifUrl} alt={title} className={className} />;
  }

  // 5. Nothing to show
  return <div className={className} aria-hidden />;
}

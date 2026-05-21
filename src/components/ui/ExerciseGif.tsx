"use client";

/**
 * Two-frame illustration "GIF" for Free Exercise DB exercises.
 *
 * The dataset (https://github.com/yuhonas/free-exercise-db) ships each
 * exercise as exactly two static JPGs at `.../<id>/0.jpg` and
 * `.../<id>/1.jpg`. Rendering just the first frame (which is what the
 * codebase did before this component) made every illustration look
 * like a still image. This component renders both frames stacked and
 * toggles their opacity via a pure CSS animation defined in
 * `globals.css`, producing a 1.2 s loop with zero JS-per-instance
 * overhead — important for the picker grids that render dozens at once.
 *
 * For URLs that don't match the `/0.jpg` ending (e.g. a coach pastes
 * a single static image into `Workout.gifUrl`), only the first frame
 * is rendered. If the dataset ever ships entries with a single image,
 * we'd add a one-frame fallback here; currently 873 / 873 entries are
 * two-frame so there's no fallback path.
 */

import { useMemo } from "react";

interface Props {
  /** Primary frame URL. If it ends in `/0.jpg`, frame 1 is derived. */
  src: string | null | undefined;
  alt?: string;
  /**
   * Tailwind classes for the wrapper. The inner frames are absolutely
   * positioned and use `object-contain`, so passing aspect-ratio +
   * sizing via the wrapper produces the expected layout.
   */
  className?: string;
  /** Pass `eager` on above-the-fold detail pages, default `lazy`. */
  loading?: "lazy" | "eager";
}

/** Compute the frame-1 URL from a frame-0 URL. */
function deriveSecondFrame(src: string): string | null {
  // Hot path: /<id>/0.jpg → /<id>/1.jpg
  if (src.endsWith("/0.jpg")) return src.slice(0, -"0.jpg".length) + "1.jpg";
  // Also handle 0.png just in case future imports normalise extensions.
  if (src.endsWith("/0.png")) return src.slice(0, -"0.png".length) + "1.png";
  return null;
}

export default function ExerciseGif({
  src,
  alt = "",
  className = "",
  loading = "lazy",
}: Props) {
  const secondFrame = useMemo(
    () => (src ? deriveSecondFrame(src) : null),
    [src]
  );

  if (!src) {
    // Caller is expected to render a placeholder; we render nothing
    // rather than a broken-image icon.
    return <div className={className} aria-hidden />;
  }

  // Single-frame fallback (custom coach-uploaded URLs).
  if (!secondFrame) {
    return (
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`object-contain ${className}`}
      />
    );
  }

  // Two-frame animated illustration.
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        className="exercise-gif-frame-0 absolute inset-0 w-full h-full object-contain"
      />
      <img
        src={secondFrame}
        alt=""
        loading={loading}
        aria-hidden
        className="exercise-gif-frame-1 absolute inset-0 w-full h-full object-contain"
        // If the second frame fails to load (shouldn't happen for the
        // 873 bundled entries, but defends against odd coach URLs),
        // hide it and let the first frame show statically.
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

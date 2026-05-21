"use client";

import { parseVideoUrl, getPlatformLabel } from "@/lib/video";

interface VideoEmbedProps {
  url: string;
  className?: string;
}

/**
 * Universal video embed component.
 * Auto-detects platform from URL and renders the correct embed.
 * Vertical (9:16) for Shorts/Reels/TikToks, landscape (16:9) for regular YouTube.
 */
export default function VideoEmbed({ url, className = "" }: VideoEmbedProps) {
  const info = parseVideoUrl(url);

  if (!info) {
    // Fallback: unrecognized URL — show as link
    return (
      <div className={`bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 text-center ${className}`}>
        <p className="text-white/40 text-sm mb-2">Video link</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#E51A1A] text-sm hover:underline break-all"
        >
          {url}
        </a>
      </div>
    );
  }

  const platform = getPlatformLabel(info.platform);

  // Direct video file (MP4/WebM/MOV) — render with native <video> tag.
  // Used for self-hosted HD demos like wger.de's CC-licensed catalog.
  if (info.platform === "direct") {
    return (
      <div className={`relative ${className}`}>
        <div
          className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1"
          style={{ backgroundColor: platform.color + "CC" }}
        >
          <span>{platform.icon}</span>
          <span>{platform.name}</span>
        </div>
        <div
          className="relative w-full overflow-hidden rounded-xl bg-black"
          style={{ aspectRatio: "16/9" }}
        >
          <video
            src={info.embedUrl}
            controls
            preload="metadata"
            playsInline
            className="absolute inset-0 w-full h-full object-contain"
          >
            Your browser doesn&apos;t support embedded video.
          </video>
        </div>
      </div>
    );
  }

  // TikTok short URLs can't be embedded — show link
  if (info.platform === "tiktok" && info.embedUrl === info.originalUrl) {
    return (
      <div className={`bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 text-center ${className}`}>
        <p className="text-white/50 text-sm mb-2">
          <span style={{ color: platform.color }}>{platform.icon}</span> {platform.name} Video
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#E51A1A] text-sm hover:underline"
        >
          Open in TikTok &rarr;
        </a>
        <p className="text-white/20 text-[10px] mt-2">
          Tip: Use the full URL (tiktok.com/@user/video/ID) for in-app playback
        </p>
      </div>
    );
  }

  // Aspect ratio: vertical (9:16) for shorts/reels, landscape (16:9) for regular
  const isVertical = info.isVertical;

  return (
    <div className={`relative ${className}`}>
      {/* Platform badge */}
      <div
        className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1"
        style={{ backgroundColor: platform.color + "CC" }}
      >
        <span>{platform.icon}</span>
        <span>{platform.name}{info.isVertical && info.platform === "youtube" ? " Short" : ""}</span>
      </div>

      {/* Embed container */}
      <div
        className={`relative w-full overflow-hidden rounded-xl bg-black ${
          isVertical ? "max-w-[320px] mx-auto" : ""
        }`}
        style={{ aspectRatio: isVertical ? "9/16" : "16/9" }}
      >
        <iframe
          src={info.embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`${platform.name} video`}
        />
      </div>
    </div>
  );
}

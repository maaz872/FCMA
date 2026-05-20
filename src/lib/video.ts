/**
 * Centralized video URL parser and embed utility.
 * Supports: YouTube (regular + Shorts), Instagram Reels, TikTok, Facebook Reels/Videos.
 * Replaces all duplicated extractYouTubeId() functions across the codebase.
 */

export type VideoPlatform =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "direct";

export interface VideoInfo {
  platform: VideoPlatform;
  id: string;
  isVertical: boolean; // true for Shorts, Reels, TikToks
  embedUrl: string;
  thumbnailUrl: string | null;
  originalUrl: string;
}

/**
 * Parse any supported video URL and return embed info.
 * Returns null if URL is not recognized.
 */
export function parseVideoUrl(url: string): VideoInfo | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // ── YouTube ──
  // Patterns: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const ytPatterns = [
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
    /youtube\.com\/shorts\/([\w-]+)/,
  ];
  for (const pattern of ytPatterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      const isShort = /youtube\.com\/shorts\//.test(trimmed);
      return {
        platform: "youtube",
        id: match[1],
        isVertical: isShort,
        embedUrl: `https://www.youtube.com/embed/${match[1]}`,
        thumbnailUrl: `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`,
        originalUrl: trimmed,
      };
    }
  }

  // ── Instagram ──
  // Patterns: instagram.com/reel/SHORTCODE/, instagram.com/p/SHORTCODE/
  const igMatch = trimmed.match(/instagram\.com\/(?:reel|p)\/([\w-]+)/);
  if (igMatch?.[1]) {
    return {
      platform: "instagram",
      id: igMatch[1],
      isVertical: true,
      embedUrl: `https://www.instagram.com/reel/${igMatch[1]}/embed`,
      thumbnailUrl: null,
      originalUrl: trimmed,
    };
  }

  // ── TikTok ──
  // Patterns: tiktok.com/@user/video/ID, vm.tiktok.com/SHORTCODE, tiktok.com/t/SHORTCODE
  const ttVideoMatch = trimmed.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
  if (ttVideoMatch?.[1]) {
    return {
      platform: "tiktok",
      id: ttVideoMatch[1],
      isVertical: true,
      embedUrl: `https://www.tiktok.com/embed/v2/${ttVideoMatch[1]}`,
      thumbnailUrl: null,
      originalUrl: trimmed,
    };
  }
  // Short URL: vm.tiktok.com/xxx or tiktok.com/t/xxx — store the full URL, embed won't work without video ID
  const ttShortMatch = trimmed.match(/(?:vm\.tiktok\.com|tiktok\.com\/t)\/([\w-]+)/);
  if (ttShortMatch?.[1]) {
    return {
      platform: "tiktok",
      id: ttShortMatch[1],
      isVertical: true,
      // Short URLs can't be directly embedded — link out instead
      embedUrl: trimmed,
      thumbnailUrl: null,
      originalUrl: trimmed,
    };
  }

  // ── Facebook ──
  // Patterns: facebook.com/reel/ID, facebook.com/watch?v=ID, fb.watch/ID
  const fbReelMatch = trimmed.match(/facebook\.com\/reel\/(\d+)/);
  if (fbReelMatch?.[1]) {
    return {
      platform: "facebook",
      id: fbReelMatch[1],
      isVertical: true,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=false`,
      thumbnailUrl: null,
      originalUrl: trimmed,
    };
  }
  const fbWatchMatch = trimmed.match(/(?:facebook\.com\/watch\/?\?v=|fb\.watch\/)([\w-]+)/);
  if (fbWatchMatch?.[1]) {
    return {
      platform: "facebook",
      id: fbWatchMatch[1],
      isVertical: false,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=false`,
      thumbnailUrl: null,
      originalUrl: trimmed,
    };
  }
  // Generic facebook.com video URL
  if (/facebook\.com.*video/i.test(trimmed) || /fb\.watch/i.test(trimmed)) {
    return {
      platform: "facebook",
      id: "unknown",
      isVertical: false,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=false`,
      thumbnailUrl: null,
      originalUrl: trimmed,
    };
  }

  // ── Direct video file (MP4 / WebM / MOV / M4V) ──
  // Used for self-hosted HD demos (e.g. wger.de's CC-licensed MOV catalog).
  // Rendered with a native <video> tag by VideoEmbed.
  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(trimmed)) {
    return {
      platform: "direct",
      id: trimmed,
      isVertical: false,
      embedUrl: trimmed,
      thumbnailUrl: null,
      originalUrl: trimmed,
    };
  }

  return null;
}

/**
 * Get just the YouTube video ID from a URL (backward-compatible helper).
 */
export function extractYouTubeId(url: string): string | null {
  const info = parseVideoUrl(url);
  if (info?.platform === "youtube") return info.id;
  return null;
}

/**
 * Get platform display info.
 */
export function getPlatformLabel(platform: VideoPlatform): { name: string; color: string; icon: string } {
  switch (platform) {
    case "youtube": return { name: "YouTube", color: "#FF0000", icon: "▶" };
    case "instagram": return { name: "Instagram", color: "#E1306C", icon: "📷" };
    case "tiktok": return { name: "TikTok", color: "#000000", icon: "♪" };
    case "facebook": return { name: "Facebook", color: "#1877F2", icon: "f" };
    case "direct": return { name: "HD Video", color: "#1E88E5", icon: "▶" };
  }
}

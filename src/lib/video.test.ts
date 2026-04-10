import { describe, it, expect } from "vitest";
import { parseVideoUrl, extractYouTubeId, getPlatformLabel } from "./video";

describe("parseVideoUrl — YouTube", () => {
  it("parses a standard watch URL", () => {
    const info = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(info?.platform).toBe("youtube");
    expect(info?.id).toBe("dQw4w9WgXcQ");
    expect(info?.isVertical).toBe(false);
    expect(info?.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(info?.thumbnailUrl).toContain("img.youtube.com/vi/dQw4w9WgXcQ");
  });

  it("parses a youtu.be short URL", () => {
    const info = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(info?.platform).toBe("youtube");
    expect(info?.id).toBe("dQw4w9WgXcQ");
    expect(info?.isVertical).toBe(false);
  });

  it("parses an embed URL", () => {
    const info = parseVideoUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(info?.platform).toBe("youtube");
    expect(info?.id).toBe("dQw4w9WgXcQ");
  });

  it("parses a YouTube Shorts URL and marks isVertical: true", () => {
    const info = parseVideoUrl("https://www.youtube.com/shorts/abc123XYZ");
    expect(info?.platform).toBe("youtube");
    expect(info?.id).toBe("abc123XYZ");
    expect(info?.isVertical).toBe(true);
  });

  it("parses URLs with extra query params (e.g. ?t=30s)", () => {
    const info = parseVideoUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s"
    );
    expect(info?.id).toBe("dQw4w9WgXcQ");
  });

  it("returns a thumbnail URL for YouTube videos", () => {
    const info = parseVideoUrl("https://youtu.be/abc123");
    expect(info?.thumbnailUrl).toBe(
      "https://img.youtube.com/vi/abc123/mqdefault.jpg"
    );
  });
});

describe("parseVideoUrl — Instagram", () => {
  it("parses a reel URL", () => {
    const info = parseVideoUrl("https://www.instagram.com/reel/C5xABC123/");
    expect(info?.platform).toBe("instagram");
    expect(info?.id).toBe("C5xABC123");
    expect(info?.isVertical).toBe(true);
    expect(info?.embedUrl).toContain("/embed");
  });

  it("parses a post URL", () => {
    const info = parseVideoUrl("https://www.instagram.com/p/C5xABC123/");
    expect(info?.platform).toBe("instagram");
    expect(info?.id).toBe("C5xABC123");
    expect(info?.isVertical).toBe(true);
  });

  it("has no thumbnail URL for Instagram", () => {
    const info = parseVideoUrl("https://www.instagram.com/reel/abc/");
    expect(info?.thumbnailUrl).toBeNull();
  });
});

describe("parseVideoUrl — TikTok", () => {
  it("parses a full TikTok video URL", () => {
    const info = parseVideoUrl(
      "https://www.tiktok.com/@chriswillx/video/7345678901234567890"
    );
    expect(info?.platform).toBe("tiktok");
    expect(info?.id).toBe("7345678901234567890");
    expect(info?.isVertical).toBe(true);
    expect(info?.embedUrl).toContain("tiktok.com/embed/v2/");
  });

  it("parses a vm.tiktok.com short URL (no embeddable ID)", () => {
    const info = parseVideoUrl("https://vm.tiktok.com/ZMabcDEF/");
    expect(info?.platform).toBe("tiktok");
    expect(info?.id).toBe("ZMabcDEF");
    expect(info?.isVertical).toBe(true);
    // Short URLs fall back to the original URL as embed target
    expect(info?.embedUrl).toBe("https://vm.tiktok.com/ZMabcDEF/");
  });

  it("parses a tiktok.com/t/ short URL", () => {
    const info = parseVideoUrl("https://tiktok.com/t/ZMxyz789/");
    expect(info?.platform).toBe("tiktok");
    expect(info?.id).toBe("ZMxyz789");
  });
});

describe("parseVideoUrl — Facebook", () => {
  it("parses a Facebook reel URL", () => {
    const info = parseVideoUrl("https://www.facebook.com/reel/123456789");
    expect(info?.platform).toBe("facebook");
    expect(info?.id).toBe("123456789");
    expect(info?.isVertical).toBe(true);
  });

  it("parses a Facebook watch URL", () => {
    const info = parseVideoUrl("https://www.facebook.com/watch?v=987654321");
    expect(info?.platform).toBe("facebook");
    expect(info?.id).toBe("987654321");
    expect(info?.isVertical).toBe(false);
  });

  it("parses an fb.watch short URL", () => {
    const info = parseVideoUrl("https://fb.watch/ABC123/");
    expect(info?.platform).toBe("facebook");
    expect(info?.id).toBe("ABC123");
  });

  it("falls back to generic facebook video URL match", () => {
    const info = parseVideoUrl(
      "https://www.facebook.com/someuser/videos/123456789"
    );
    expect(info?.platform).toBe("facebook");
    expect(info?.embedUrl).toContain("plugins/video.php");
  });
});

describe("parseVideoUrl — edge cases", () => {
  it("returns null for empty string", () => {
    expect(parseVideoUrl("")).toBeNull();
  });

  it("returns null for non-string input", () => {
    // @ts-expect-error — testing runtime behaviour
    expect(parseVideoUrl(null)).toBeNull();
    // @ts-expect-error
    expect(parseVideoUrl(undefined)).toBeNull();
    // @ts-expect-error
    expect(parseVideoUrl(12345)).toBeNull();
  });

  it("returns null for unrecognized URLs", () => {
    expect(parseVideoUrl("https://example.com")).toBeNull();
    expect(parseVideoUrl("not-a-url")).toBeNull();
    expect(parseVideoUrl("https://vimeo.com/12345")).toBeNull();
  });

  it("trims whitespace", () => {
    const info = parseVideoUrl("  https://youtu.be/abc123  ");
    expect(info?.id).toBe("abc123");
  });

  it("preserves originalUrl in the response", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const info = parseVideoUrl(url);
    expect(info?.originalUrl).toBe(url);
  });
});

describe("extractYouTubeId (backward-compat helper)", () => {
  it("returns the ID for YouTube URLs", () => {
    expect(extractYouTubeId("https://youtu.be/abc123")).toBe("abc123");
    expect(extractYouTubeId("https://www.youtube.com/watch?v=xyz789")).toBe(
      "xyz789"
    );
  });

  it("returns null for non-YouTube URLs", () => {
    expect(extractYouTubeId("https://www.instagram.com/reel/abc/")).toBeNull();
    expect(extractYouTubeId("https://vm.tiktok.com/abc/")).toBeNull();
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId("not-a-url")).toBeNull();
  });
});

describe("getPlatformLabel", () => {
  it("returns correct label for each platform", () => {
    expect(getPlatformLabel("youtube").name).toBe("YouTube");
    expect(getPlatformLabel("instagram").name).toBe("Instagram");
    expect(getPlatformLabel("tiktok").name).toBe("TikTok");
    expect(getPlatformLabel("facebook").name).toBe("Facebook");
  });

  it("includes a color and icon for each platform", () => {
    const yt = getPlatformLabel("youtube");
    expect(yt.color).toBeTruthy();
    expect(yt.icon).toBeTruthy();
  });
});

import { describe, it, expect } from "vitest";
import {
  validateBase64Upload,
  MAX_UPLOAD_SIZE_MB,
} from "./upload-validation";

// Tiny 1x1 transparent PNG (67 bytes base64 ~ 50 bytes binary)
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=";
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_B64}`;

// Helper to build a base64 string of a given decoded size
function makeBase64OfSize(bytes: number): string {
  const raw = "A".repeat(bytes);
  return Buffer.from(raw, "utf-8").toString("base64");
}

describe("validateBase64Upload — valid inputs", () => {
  it("accepts a valid PNG data URL", () => {
    const result = validateBase64Upload(TINY_PNG_DATA_URL);
    expect(result.ok).toBe(true);
    expect(result.mimeType).toBe("image/png");
    expect(result.decodedBytes).toBeGreaterThan(0);
  });

  it("accepts a valid JPEG data URL", () => {
    const jpegUrl = `data:image/jpeg;base64,${TINY_PNG_B64}`;
    const result = validateBase64Upload(jpegUrl);
    expect(result.ok).toBe(true);
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("accepts a valid WebP data URL", () => {
    const webpUrl = `data:image/webp;base64,${TINY_PNG_B64}`;
    const result = validateBase64Upload(webpUrl);
    expect(result.ok).toBe(true);
    expect(result.mimeType).toBe("image/webp");
  });

  it("accepts raw base64 with explicit mime type", () => {
    const result = validateBase64Upload(TINY_PNG_B64, "image/png");
    expect(result.ok).toBe(true);
    expect(result.mimeType).toBe("image/png");
  });

  it("is case-insensitive on MIME type", () => {
    const upperUrl = `data:IMAGE/PNG;base64,${TINY_PNG_B64}`;
    const result = validateBase64Upload(upperUrl);
    expect(result.ok).toBe(true);
  });

  it("accepts a base64 string close to but under the size limit", () => {
    const fourMb = makeBase64OfSize(4 * 1024 * 1024);
    const result = validateBase64Upload(fourMb, "image/jpeg");
    expect(result.ok).toBe(true);
  });
});

describe("validateBase64Upload — rejections", () => {
  it("rejects non-whitelisted MIME types", () => {
    const gif = `data:image/gif;base64,${TINY_PNG_B64}`;
    const result = validateBase64Upload(gif);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unsupported file type");
    expect(result.error).toContain("image/gif");
  });

  it("rejects PDF/other non-image MIME", () => {
    const pdf = `data:application/pdf;base64,${TINY_PNG_B64}`;
    const result = validateBase64Upload(pdf);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unsupported");
  });

  it("rejects missing MIME (raw base64 + no explicit)", () => {
    const result = validateBase64Upload(TINY_PNG_B64);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("MIME type");
  });

  it("rejects empty string", () => {
    expect(validateBase64Upload("").ok).toBe(false);
  });

  it("rejects null/undefined/non-string input", () => {
    expect(validateBase64Upload(null).ok).toBe(false);
    expect(validateBase64Upload(undefined).ok).toBe(false);
    expect(validateBase64Upload(12345).ok).toBe(false);
    expect(validateBase64Upload({}).ok).toBe(false);
  });

  it("rejects files over the 5 MB limit", () => {
    const sixMb = makeBase64OfSize(6 * 1024 * 1024);
    const result = validateBase64Upload(sixMb, "image/png");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("File too large");
    expect(result.error).toContain("6.0 MB");
  });

  it("rejects a malformed data URL", () => {
    // Missing the ;base64, part → treated as raw base64 with no mime
    const result = validateBase64Upload("data:image/png,not-valid");
    expect(result.ok).toBe(false);
  });

  it("reports the MAX_UPLOAD_SIZE_MB constant in its error message", () => {
    const huge = makeBase64OfSize(10 * 1024 * 1024);
    const result = validateBase64Upload(huge, "image/jpeg");
    expect(result.error).toContain(`${MAX_UPLOAD_SIZE_MB} MB`);
  });
});

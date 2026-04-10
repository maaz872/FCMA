/**
 * Validation for base64-encoded user uploads.
 * Enforces a max decoded size and a MIME-type whitelist.
 * Used by all routes that accept image uploads to prevent
 * database bloat and rejection of non-image content.
 */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB decoded

const ALLOWED_MIME_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MAX_UPLOAD_SIZE_MB = MAX_UPLOAD_BYTES / 1024 / 1024;

export interface ValidateUploadResult {
  ok: boolean;
  error?: string;
  mimeType?: string;
  decodedBytes?: number;
}

/**
 * Validate a base64 data URL or raw base64 string.
 *
 * Accepts either:
 *   - a full data URL: `data:image/jpeg;base64,/9j/4AAQ...`
 *   - a raw base64 string with `explicitMimeType` provided separately
 *
 * Returns `{ ok: true, mimeType, decodedBytes }` on success, or
 * `{ ok: false, error }` with a user-friendly message on failure.
 *
 * @param input base64 string (possibly prefixed with a data URL scheme)
 * @param explicitMimeType fallback MIME type when input is raw base64
 */
export function validateBase64Upload(
  input: unknown,
  explicitMimeType?: string
): ValidateUploadResult {
  if (typeof input !== "string" || input.length === 0) {
    return { ok: false, error: "Upload data is empty" };
  }

  let mimeType = explicitMimeType || "";
  let base64Data = input;

  // Parse data URL prefix if present
  const dataUrlMatch = input.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    base64Data = dataUrlMatch[2];
  }

  if (!mimeType) {
    return { ok: false, error: "Upload is missing a MIME type" };
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return {
      ok: false,
      error: `Unsupported file type (${mimeType}). Allowed: JPEG, PNG, WebP.`,
    };
  }

  if (base64Data.length === 0) {
    return { ok: false, error: "Upload data is empty" };
  }

  // Calculate decoded size without actually decoding:
  // every 4 base64 chars = 3 binary bytes, minus padding.
  const padLen = base64Data.endsWith("==")
    ? 2
    : base64Data.endsWith("=")
      ? 1
      : 0;
  const decodedBytes = Math.floor((base64Data.length / 4) * 3) - padLen;

  if (decodedBytes <= 0) {
    return { ok: false, error: "Upload data is empty" };
  }

  if (decodedBytes > MAX_UPLOAD_BYTES) {
    const mb = (decodedBytes / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      error: `File too large (${mb} MB). Maximum is ${MAX_UPLOAD_SIZE_MB} MB.`,
    };
  }

  return { ok: true, mimeType, decodedBytes };
}

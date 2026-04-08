/**
 * Fetch with automatic retry for Vercel cold start failures.
 * Retries on 500 errors or network timeouts with exponential backoff.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok || res.status < 500) return res;
    } catch {
      clearTimeout(timeout); // Always clear to prevent memory leak
    }
    if (i < retries) {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  // Final attempt with longer timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

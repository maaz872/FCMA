/**
 * Fetch with automatic retry for Vercel cold start failures.
 * Retries on 500 errors or network timeouts with exponential backoff.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 2
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok || res.status < 500) return res;
      // 500+ = server error, retry
    } catch {
      // timeout or network error, retry
    }
    if (i < retries) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1))); // 1s, 2s backoff
    }
  }
  // Final attempt without custom timeout
  return fetch(url, options);
}

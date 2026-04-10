/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "./fetch-retry";

describe("fetchWithRetry", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("resolves immediately on first successful response", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    fetchMock.mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry("/api/test");
    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 error and succeeds on second attempt", async () => {
    // Speed up backoff for the test
    vi.useFakeTimers();

    fetchMock
      .mockResolvedValueOnce(new Response("err", { status: 500 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const promise = fetchWithRetry("/api/test", undefined, 2);
    // Advance through the backoff delay (1500ms for first retry)
    await vi.advanceTimersByTimeAsync(1600);
    const result = await promise;

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on 4xx status codes", async () => {
    const mockResponse = new Response("not found", { status: 404 });
    fetchMock.mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry("/api/test");
    expect(result.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on network error then succeeds", async () => {
    vi.useFakeTimers();

    fetchMock
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const promise = fetchWithRetry("/api/test", undefined, 2);
    await vi.advanceTimersByTimeAsync(1600);
    const result = await promise;

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns last response after exhausting retries with 500s", async () => {
    // Use retries=0 + real timers to avoid fake-timer async edge cases
    fetchMock.mockResolvedValue(new Response("err", { status: 500 }));

    const result = await fetchWithRetry("/api/test", undefined, 0);

    expect(result.status).toBe(500);
    // With retries=0: 1 loop attempt + 1 final attempt = 2 calls
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws on final-attempt network error after retries exhausted", async () => {
    vi.useFakeTimers();

    fetchMock
      .mockRejectedValue(new Error("persistent failure"));

    const promise = fetchWithRetry("/api/test", undefined, 2).catch((e) => e);
    await vi.advanceTimersByTimeAsync(15000);
    const result = await promise;

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe("persistent failure");
  });

  it("passes through request options", async () => {
    fetchMock.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await fetchWithRetry("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ foo: "bar" }),
      })
    );
  });

  it("uses AbortController signal on each attempt", async () => {
    fetchMock.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await fetchWithRetry("/api/test");

    const callArg = fetchMock.mock.calls[0][1];
    expect(callArg.signal).toBeInstanceOf(AbortSignal);
  });
});

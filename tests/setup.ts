import "@testing-library/jest-dom/vitest";
import { vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Ensure a JWT secret exists during tests (avoid falling back to dev secret)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-1234567890";
}

// Clean up after each test (unmount components, reset timers, etc.)
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Stub global fetch so component tests don't hit the network by default.
// Individual tests override with vi.spyOn(global, 'fetch').mockResolvedValueOnce(...)
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
}

/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing rate-limit
vi.mock("./db", () => ({
  prisma: {
    loginAttempt: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import {
  checkLoginRateLimit,
  checkRegisterRateLimit,
  recordLoginAttempt,
  recordRegisterAttempt,
  getClientIp,
} from "./rate-limit";
import { prisma } from "./db";

const mockedCount = prisma.loginAttempt.count as unknown as ReturnType<
  typeof vi.fn
>;
const mockedFindFirst = prisma.loginAttempt
  .findFirst as unknown as ReturnType<typeof vi.fn>;
const mockedCreate = prisma.loginAttempt.create as unknown as ReturnType<
  typeof vi.fn
>;

beforeEach(() => {
  mockedCount.mockReset();
  mockedFindFirst.mockReset();
  mockedCreate.mockReset();
});

describe("checkLoginRateLimit", () => {
  it("allows login when zero previous failures", async () => {
    mockedCount.mockResolvedValueOnce(0);
    const result = await checkLoginRateLimit("test@example.com");
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBeUndefined();
  });

  it("allows login at threshold - 1 failures (4 of 5)", async () => {
    mockedCount.mockResolvedValueOnce(4);
    const result = await checkLoginRateLimit("test@example.com");
    expect(result.allowed).toBe(true);
  });

  it("blocks login at exactly 5 failures (threshold)", async () => {
    mockedCount.mockResolvedValueOnce(5);
    mockedFindFirst.mockResolvedValueOnce({
      attemptedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
    });
    const result = await checkLoginRateLimit("test@example.com");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("blocks login above threshold (10 failures)", async () => {
    mockedCount.mockResolvedValueOnce(10);
    mockedFindFirst.mockResolvedValueOnce({
      attemptedAt: new Date(Date.now() - 60 * 1000), // 1 min ago
    });
    const result = await checkLoginRateLimit("test@example.com");
    expect(result.allowed).toBe(false);
  });

  it("allows when email is empty (no-op)", async () => {
    const result = await checkLoginRateLimit("");
    expect(result.allowed).toBe(true);
    expect(mockedCount).not.toHaveBeenCalled();
  });

  it("normalizes email to lowercase in the query", async () => {
    mockedCount.mockResolvedValueOnce(0);
    await checkLoginRateLimit("Test@Example.COM");
    expect(mockedCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: "test@example.com" }),
      })
    );
  });
});

describe("recordLoginAttempt", () => {
  it("writes a row with normalized email, ip, and success", async () => {
    mockedCreate.mockResolvedValueOnce({});
    await recordLoginAttempt("Test@Example.COM", "1.2.3.4", false);
    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        email: "test@example.com",
        ipAddress: "1.2.3.4",
        success: false,
      },
    });
  });

  it("swallows DB errors so login flow is never broken", async () => {
    mockedCreate.mockRejectedValueOnce(new Error("db down"));
    await expect(
      recordLoginAttempt("a@b.com", null, false)
    ).resolves.toBeUndefined();
  });

  it("no-ops on empty email", async () => {
    await recordLoginAttempt("", "1.2.3.4", false);
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});

describe("checkRegisterRateLimit", () => {
  it("allows when IP is null (can't track)", async () => {
    const result = await checkRegisterRateLimit(null);
    expect(result.allowed).toBe(true);
  });

  it("allows when under the 3-per-hour threshold", async () => {
    mockedCount.mockResolvedValueOnce(2);
    const result = await checkRegisterRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
  });

  it("blocks at exactly 3 registrations from same IP", async () => {
    mockedCount.mockResolvedValueOnce(3);
    const result = await checkRegisterRateLimit("1.2.3.4");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("recordRegisterAttempt", () => {
  it("writes a REGISTER:-prefixed row", async () => {
    mockedCreate.mockResolvedValueOnce({});
    await recordRegisterAttempt("1.2.3.4");
    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        email: "REGISTER:1.2.3.4",
        ipAddress: "1.2.3.4",
        success: true,
      },
    });
  });

  it("no-ops when IP is null", async () => {
    await recordRegisterAttempt(null);
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});

describe("getClientIp", () => {
  function mockRequest(headers: Record<string, string>): Request {
    return new Request("http://localhost/", { headers });
  }

  it("reads x-forwarded-for first IP", () => {
    const req = mockRequest({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("splits comma-separated x-forwarded-for", () => {
    const req = mockRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.9.9.9" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace from forwarded IP", () => {
    const req = mockRequest({ "x-forwarded-for": "  1.2.3.4 " });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = mockRequest({ "x-real-ip": "10.0.0.1" });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("returns null when no headers present", () => {
    const req = mockRequest({});
    expect(getClientIp(req)).toBeNull();
  });
});

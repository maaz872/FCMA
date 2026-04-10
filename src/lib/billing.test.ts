import { describe, it, expect } from "vitest";
import {
  calculateMonthlyBill,
  addDays,
  daysUntilExpiry,
  resolveSubscriptionStatus,
  GRACE_DAYS,
} from "./billing";

describe("calculateMonthlyBill", () => {
  it("returns base price when client count is below included threshold", () => {
    expect(calculateMonthlyBill(0, 15000, 5, 3500)).toBe(15000);
    expect(calculateMonthlyBill(3, 15000, 5, 3500)).toBe(15000);
  });

  it("returns base price at exactly the included threshold", () => {
    expect(calculateMonthlyBill(5, 15000, 5, 3500)).toBe(15000);
  });

  it("adds extra client price for each client above threshold", () => {
    expect(calculateMonthlyBill(6, 15000, 5, 3500)).toBe(15000 + 3500);
    expect(calculateMonthlyBill(10, 15000, 5, 3500)).toBe(15000 + 5 * 3500);
    expect(calculateMonthlyBill(100, 15000, 5, 3500)).toBe(
      15000 + 95 * 3500
    );
  });

  it("handles zero base price", () => {
    expect(calculateMonthlyBill(10, 0, 5, 3500)).toBe(5 * 3500);
  });

  it("handles zero extra client price", () => {
    expect(calculateMonthlyBill(100, 15000, 5, 0)).toBe(15000);
  });

  it("does not go negative with unusual inputs", () => {
    expect(calculateMonthlyBill(-5, 15000, 5, 3500)).toBe(15000);
    expect(calculateMonthlyBill(0, -1000, 5, 3500)).toBe(-1000); // matches current math; documents behaviour
  });
});

describe("addDays", () => {
  it("adds a positive number of days", () => {
    const base = new Date("2026-04-10T12:00:00Z");
    const result = addDays(base, 5);
    expect(result.toISOString().slice(0, 10)).toBe("2026-04-15");
  });

  it("adds 30 days crossing a month boundary", () => {
    const base = new Date("2026-04-10T12:00:00Z");
    const result = addDays(base, 30);
    expect(result.toISOString().slice(0, 10)).toBe("2026-05-10");
  });

  it("adds 1 day across a month boundary (Jan 31 → Feb 1)", () => {
    const base = new Date("2026-01-31T12:00:00Z");
    const result = addDays(base, 1);
    expect(result.toISOString().slice(0, 10)).toBe("2026-02-01");
  });

  it("adds 1 day across a year boundary (Dec 31 → Jan 1)", () => {
    const base = new Date("2026-12-31T12:00:00Z");
    const result = addDays(base, 1);
    expect(result.toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("handles leap year (Feb 28 2024 + 1 → Feb 29)", () => {
    const base = new Date("2024-02-28T12:00:00Z");
    const result = addDays(base, 1);
    expect(result.toISOString().slice(0, 10)).toBe("2024-02-29");
  });

  it("handles non-leap year (Feb 28 2025 + 1 → Mar 1)", () => {
    const base = new Date("2025-02-28T12:00:00Z");
    const result = addDays(base, 1);
    expect(result.toISOString().slice(0, 10)).toBe("2025-03-01");
  });

  it("accepts negative days (subtracts)", () => {
    const base = new Date("2026-04-10T12:00:00Z");
    const result = addDays(base, -5);
    expect(result.toISOString().slice(0, 10)).toBe("2026-04-05");
  });

  it("does not mutate the original Date", () => {
    const base = new Date("2026-04-10T12:00:00Z");
    const beforeMs = base.getTime();
    addDays(base, 10);
    expect(base.getTime()).toBe(beforeMs);
  });

  it("adds zero days (returns equivalent date)", () => {
    const base = new Date("2026-04-10T12:00:00Z");
    const result = addDays(base, 0);
    expect(result.getTime()).toBe(base.getTime());
  });
});

describe("daysUntilExpiry", () => {
  const NOW = new Date("2026-04-10T12:00:00Z");

  it("returns positive number for future dates", () => {
    const future = new Date("2026-04-20T12:00:00Z");
    expect(daysUntilExpiry(future, NOW)).toBe(10);
  });

  it("returns 0 or 1 for today-ish dates", () => {
    // Math.ceil rounds up; same instant → 0
    expect(daysUntilExpiry(NOW, NOW)).toBe(0);
  });

  it("returns negative for yesterday", () => {
    const yesterday = new Date("2026-04-09T12:00:00Z");
    expect(daysUntilExpiry(yesterday, NOW)).toBe(-1);
  });

  it("returns -7 for a week ago", () => {
    const weekAgo = new Date("2026-04-03T12:00:00Z");
    expect(daysUntilExpiry(weekAgo, NOW)).toBe(-7);
  });

  it("returns -8 for just over a week ago", () => {
    const overWeek = new Date("2026-04-02T12:00:00Z");
    expect(daysUntilExpiry(overWeek, NOW)).toBe(-8);
  });

  it("defaults `now` to current time when omitted", () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    expect(daysUntilExpiry(future)).toBeGreaterThan(3);
    expect(daysUntilExpiry(future)).toBeLessThanOrEqual(5);
  });
});

describe("resolveSubscriptionStatus", () => {
  const NOW = new Date("2026-04-10T12:00:00Z");

  it("returns CANCELLED regardless of dates when billingStatus is CANCELLED", () => {
    const futureDate = new Date("2026-05-10T12:00:00Z");
    const pastDate = new Date("2026-01-10T12:00:00Z");
    expect(resolveSubscriptionStatus(futureDate, "CANCELLED", NOW)).toBe(
      "CANCELLED"
    );
    expect(resolveSubscriptionStatus(pastDate, "CANCELLED", NOW)).toBe(
      "CANCELLED"
    );
  });

  it("returns ACTIVE when period end is in the future", () => {
    const future = new Date("2026-05-10T12:00:00Z");
    expect(resolveSubscriptionStatus(future, "ACTIVE", NOW)).toBe("ACTIVE");
  });

  it("returns ACTIVE exactly at period end (0 days left)", () => {
    expect(resolveSubscriptionStatus(NOW, "ACTIVE", NOW)).toBe("ACTIVE");
  });

  it("returns GRACE from 1 day past to GRACE_DAYS past", () => {
    const oneDayPast = new Date("2026-04-09T12:00:00Z");
    const sevenDaysPast = new Date("2026-04-03T12:00:00Z");
    expect(resolveSubscriptionStatus(oneDayPast, "ACTIVE", NOW)).toBe("GRACE");
    expect(resolveSubscriptionStatus(sevenDaysPast, "ACTIVE", NOW)).toBe(
      "GRACE"
    );
  });

  it("returns EXPIRED just past the grace period boundary", () => {
    const eightDaysPast = new Date("2026-04-02T12:00:00Z");
    expect(resolveSubscriptionStatus(eightDaysPast, "ACTIVE", NOW)).toBe(
      "EXPIRED"
    );
  });

  it("returns EXPIRED for very old period ends", () => {
    const longAgo = new Date("2026-01-01T12:00:00Z");
    expect(resolveSubscriptionStatus(longAgo, "ACTIVE", NOW)).toBe("EXPIRED");
  });

  it("GRACE_DAYS constant is 7", () => {
    expect(GRACE_DAYS).toBe(7);
  });
});

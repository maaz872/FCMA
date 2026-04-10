/**
 * Calculate monthly bill for a coach based on their active client count.
 */
export function calculateMonthlyBill(
  activeClientCount: number,
  basePriceMonthly: number,
  includedClients: number,
  extraClientPrice: number
): number {
  const extraClients = Math.max(0, activeClientCount - includedClients);
  return basePriceMonthly + extraClients * extraClientPrice;
}

// ─── Subscription helpers ───────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Grace-period days after currentPeriodEnd before a coach is fully blocked. */
export const GRACE_DAYS = 7;

/** Returns a new Date N days after the given base date. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Days until the current period ends.
 * Positive → still in period. Zero → expires today. Negative → already expired.
 */
export function daysUntilExpiry(
  currentPeriodEnd: Date,
  now: Date = new Date()
): number {
  const diffMs = currentPeriodEnd.getTime() - now.getTime();
  return Math.ceil(diffMs / MS_PER_DAY);
}

export type SubscriptionStatus = "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";

/**
 * Derive subscription lifecycle state from (periodEnd, billingStatus, now).
 * - CANCELLED: billingStatus was manually cancelled by Super Admin
 * - ACTIVE: billingStatus is ACTIVE and period end is today or in the future
 * - GRACE: period expired 1..GRACE_DAYS ago (coach can still log in with warning)
 * - EXPIRED: period expired more than GRACE_DAYS ago (login blocked)
 */
export function resolveSubscriptionStatus(
  currentPeriodEnd: Date,
  billingStatus: string,
  now: Date = new Date()
): SubscriptionStatus {
  if (billingStatus === "CANCELLED") return "CANCELLED";
  const daysLeft = daysUntilExpiry(currentPeriodEnd, now);
  if (daysLeft >= 0) return "ACTIVE";
  if (daysLeft >= -GRACE_DAYS) return "GRACE";
  return "EXPIRED";
}

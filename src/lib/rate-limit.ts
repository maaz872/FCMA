/**
 * Database-backed rate limiting for login and registration endpoints.
 * Uses the `LoginAttempt` Prisma table — same table is reused for register
 * attempts via a "REGISTER:" prefix on the email column, so we only need
 * one table for both flows.
 */

import { prisma } from "./db";

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_FAILURES = 5;

const REGISTER_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const REGISTER_MAX_PER_IP = 3;

export const LOGIN_RATE_LIMIT_CONFIG = {
  windowMs: LOGIN_WINDOW_MS,
  maxFailures: LOGIN_MAX_FAILURES,
};

export const REGISTER_RATE_LIMIT_CONFIG = {
  windowMs: REGISTER_WINDOW_MS,
  maxPerIp: REGISTER_MAX_PER_IP,
};

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Check whether a login attempt from this email is allowed.
 * Blocks if there have been 5+ failed attempts in the last 15 minutes.
 *
 * Successful logins do NOT unblock a previously-blocked email — that would
 * defeat the purpose. The window has to expire naturally.
 */
export async function checkLoginRateLimit(
  email: string
): Promise<RateLimitResult> {
  if (!email) return { allowed: true };

  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      success: false,
      attemptedAt: { gte: since },
    },
  });

  if (failures >= LOGIN_MAX_FAILURES) {
    const oldest = await prisma.loginAttempt.findFirst({
      where: {
        email: email.toLowerCase(),
        success: false,
        attemptedAt: { gte: since },
      },
      orderBy: { attemptedAt: "asc" },
      select: { attemptedAt: true },
    });
    const retryAt = oldest
      ? new Date(oldest.attemptedAt.getTime() + LOGIN_WINDOW_MS)
      : new Date(Date.now() + LOGIN_WINDOW_MS);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((retryAt.getTime() - Date.now()) / 1000)
    );
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export async function recordLoginAttempt(
  email: string,
  ipAddress: string | null,
  success: boolean
): Promise<void> {
  if (!email) return;
  try {
    await prisma.loginAttempt.create({
      data: {
        email: email.toLowerCase(),
        ipAddress,
        success,
      },
    });
  } catch (err) {
    // Never let rate-limit bookkeeping break the login flow
    console.error("Failed to record login attempt:", err);
  }
}

/**
 * Check whether a registration from this IP is allowed.
 * Uses the same LoginAttempt table with a "REGISTER:" email prefix.
 */
export async function checkRegisterRateLimit(
  ipAddress: string | null
): Promise<RateLimitResult> {
  if (!ipAddress) return { allowed: true };

  const since = new Date(Date.now() - REGISTER_WINDOW_MS);
  const count = await prisma.loginAttempt.count({
    where: {
      email: { startsWith: "REGISTER:" },
      ipAddress,
      attemptedAt: { gte: since },
    },
  });

  if (count >= REGISTER_MAX_PER_IP) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(REGISTER_WINDOW_MS / 1000),
    };
  }
  return { allowed: true };
}

export async function recordRegisterAttempt(
  ipAddress: string | null
): Promise<void> {
  if (!ipAddress) return;
  try {
    await prisma.loginAttempt.create({
      data: {
        email: "REGISTER:" + ipAddress,
        ipAddress,
        success: true,
      },
    });
  } catch (err) {
    console.error("Failed to record register attempt:", err);
  }
}

/**
 * Extract the client IP from a Next.js Request. Works behind Vercel's proxy.
 * Returns null if no headers are present (direct local requests).
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

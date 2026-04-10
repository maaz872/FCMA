import { getCurrentUser, type JWTPayload } from "./auth";

/**
 * Resolves the coachId for any authenticated user:
 * - COACH → their own userId (they ARE the coach)
 * - USER → their coachId (assigned coach)
 * - SUPER_ADMIN → null (no single coach scope)
 */
export function getCoachIdFromUser(user: JWTPayload): string | null {
  if (user.role === "COACH") return user.userId;
  if (user.role === "USER") return user.coachId;
  return null; // SUPER_ADMIN
}

/**
 * For admin API routes: requires COACH role, returns coachId.
 * Returns null if not authenticated or not a COACH.
 */
export async function requireCoach(): Promise<{
  user: JWTPayload;
  coachId: string;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "COACH") return null;
  return { user, coachId: user.userId };
}

/**
 * For any authenticated user: resolves coachId context.
 * Returns null if not authenticated or if SUPER_ADMIN (no single scope).
 */
export async function getCoachScope(): Promise<{
  user: JWTPayload;
  coachId: string;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const coachId = getCoachIdFromUser(user);
  if (!coachId) return null;
  return { user, coachId };
}

/**
 * Prisma WHERE clause fragment for coach-scoped queries.
 */
export function coachWhere(coachId: string) {
  return { coachId };
}

/**
 * Adds coachId to a data object for Prisma create operations.
 */
export function withCoachId<T extends Record<string, unknown>>(
  data: T,
  coachId: string
): T & { coachId: string } {
  return { ...data, coachId };
}

/**
 * For super admin API routes: requires SUPER_ADMIN role.
 */
export async function requireSuperAdmin(): Promise<{
  user: JWTPayload;
} | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") return null;
  return { user };
}

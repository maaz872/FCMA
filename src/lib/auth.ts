import { SignJWT, jwtVerify } from "jose";
import { hashSync, compareSync } from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production-min-32-chars!!"
);

const COOKIE_NAME = "levelup_session";

export type JWTPayload = {
  userId: string;
  email: string;
  role: "USER" | "COACH" | "SUPER_ADMIN";
  coachId: string | null;
};

// ── Password Hashing ──────────────────────────────────────
export function hashPassword(password: string): string {
  return hashSync(password, 12);
}

export function verifyPassword(password: string, hash: string): boolean {
  return compareSync(password, hash);
}

// ── JWT Token ─────────────────────────────────────────────
export async function createToken(
  payload: JWTPayload,
  rememberMe = false
): Promise<string> {
  const expiresIn = rememberMe ? "30d" : "14d";
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const raw = payload as Record<string, unknown>;

    // Backward compat: old tokens have role="ADMIN" and no coachId
    let role = raw.role as string;
    if (role === "ADMIN") role = "COACH";

    return {
      userId: raw.userId as string,
      email: raw.email as string,
      role: role as JWTPayload["role"],
      coachId: (raw.coachId as string) ?? null,
    };
  } catch {
    return null;
  }
}

// ── Cookie Management ─────────────────────────────────────
export async function setSessionCookie(
  token: string,
  rememberMe = false
) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: rememberMe ? 30 * 24 * 60 * 60 : 14 * 24 * 60 * 60,
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ── Get Current User from Cookie ──────────────────────────
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getSessionCookie();
  if (!token) return null;
  return verifyToken(token);
}

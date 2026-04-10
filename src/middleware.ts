import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production-min-32-chars!!"
);

const COOKIE_NAME = "levelup_session";

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const raw = payload as Record<string, unknown>;
    // Backward compat: old tokens have role="ADMIN"
    let role = raw.role as string;
    if (role === "ADMIN") role = "COACH";
    return {
      userId: raw.userId as string,
      email: raw.email as string,
      role,
      coachId: (raw.coachId as string) ?? null,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await getUser(request);

  // Protected: /super-admin/* requires SUPER_ADMIN role
  if (pathname.startsWith("/super-admin")) {
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protected: /hub/* requires authenticated user (USER role)
  if (pathname.startsWith("/hub")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protected: /admin/* requires COACH role
  if (pathname.startsWith("/admin")) {
    if (!user || user.role !== "COACH") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect authenticated users away from login/checkout
  if (pathname === "/login" && user) {
    let redirectTo = "/hub";
    if (user.role === "SUPER_ADMIN") redirectTo = "/super-admin";
    else if (user.role === "COACH") redirectTo = "/admin";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hub/:path*", "/admin/:path*", "/super-admin/:path*", "/login"],
};

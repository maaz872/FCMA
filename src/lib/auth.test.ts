/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  type JWTPayload,
} from "./auth";

describe("hashPassword / verifyPassword", () => {
  it("hashes a password and verifies the correct one", () => {
    const hash = hashPassword("correctPassword123");
    expect(verifyPassword("correctPassword123", hash)).toBe(true);
  });

  it("rejects wrong passwords", () => {
    const hash = hashPassword("correctPassword123");
    expect(verifyPassword("wrongPassword", hash)).toBe(false);
    expect(verifyPassword("", hash)).toBe(false);
  });

  it("produces different hashes for different passwords", () => {
    const h1 = hashPassword("passwordA");
    const h2 = hashPassword("passwordB");
    expect(h1).not.toBe(h2);
  });

  it("produces different hashes for the same password (salted)", () => {
    const h1 = hashPassword("samePassword");
    const h2 = hashPassword("samePassword");
    expect(h1).not.toBe(h2);
    // Both still verify correctly
    expect(verifyPassword("samePassword", h1)).toBe(true);
    expect(verifyPassword("samePassword", h2)).toBe(true);
  });

  it("hashes empty string without crashing", () => {
    const hash = hashPassword("");
    expect(verifyPassword("", hash)).toBe(true);
    expect(verifyPassword("anything", hash)).toBe(false);
  });

  it("produces bcrypt-formatted hash ($2a$ or $2b$ prefix, ~60 chars)", () => {
    const hash = hashPassword("test");
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash.length).toBeGreaterThanOrEqual(59);
  });
});

describe("createToken / verifyToken roundtrip", () => {
  const basePayload: JWTPayload = {
    userId: "user-123",
    email: "test@example.com",
    role: "COACH",
    coachId: null,
  };

  it("creates a token and verifies it back to the same payload", async () => {
    const token = await createToken(basePayload);
    const decoded = await verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe("user-123");
    expect(decoded?.email).toBe("test@example.com");
    expect(decoded?.role).toBe("COACH");
    expect(decoded?.coachId).toBeNull();
  });

  it("preserves USER role and coachId", async () => {
    const payload: JWTPayload = {
      userId: "client-1",
      email: "client@example.com",
      role: "USER",
      coachId: "coach-abc",
    };
    const token = await createToken(payload);
    const decoded = await verifyToken(token);
    expect(decoded?.role).toBe("USER");
    expect(decoded?.coachId).toBe("coach-abc");
  });

  it("preserves SUPER_ADMIN role with null coachId", async () => {
    const payload: JWTPayload = {
      userId: "sa-1",
      email: "sa@example.com",
      role: "SUPER_ADMIN",
      coachId: null,
    };
    const token = await createToken(payload);
    const decoded = await verifyToken(token);
    expect(decoded?.role).toBe("SUPER_ADMIN");
    expect(decoded?.coachId).toBeNull();
  });

  it("rememberMe extends expiry to 30 days", async () => {
    const token = await createToken(basePayload, true);
    // Decode the exp claim manually to check duration
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    const expInSeconds = payload.exp - payload.iat;
    const expInDays = expInSeconds / (60 * 60 * 24);
    expect(expInDays).toBeGreaterThanOrEqual(29);
    expect(expInDays).toBeLessThanOrEqual(31);
  });

  it("default expiry is 14 days when rememberMe is false", async () => {
    const token = await createToken(basePayload, false);
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    const expInDays = (payload.exp - payload.iat) / (60 * 60 * 24);
    expect(expInDays).toBeGreaterThanOrEqual(13);
    expect(expInDays).toBeLessThanOrEqual(15);
  });
});

describe("verifyToken security", () => {
  const payload: JWTPayload = {
    userId: "u1",
    email: "a@b.com",
    role: "COACH",
    coachId: null,
  };

  it("returns null for tampered token (bad signature)", async () => {
    const token = await createToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    const decoded = await verifyToken(tampered);
    expect(decoded).toBeNull();
  });

  it("returns null for random garbage", async () => {
    expect(await verifyToken("not.a.jwt")).toBeNull();
    expect(await verifyToken("garbage")).toBeNull();
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken("aaa.bbb.ccc")).toBeNull();
  });

  it("returns null for an expired token", async () => {
    // Forge an expired token with the real secret
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const expired = await new SignJWT({
      userId: "u1",
      email: "a@b.com",
      role: "COACH",
      coachId: null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800) // expired 30 min ago
      .sign(secret);
    const decoded = await verifyToken(expired);
    expect(decoded).toBeNull();
  });

  it("returns null for a token signed with wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode(
      "different-secret-also-32-chars-long-12"
    );
    const forged = await new SignJWT({
      userId: "u1",
      email: "a@b.com",
      role: "COACH",
      coachId: null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("14d")
      .sign(wrongSecret);
    const decoded = await verifyToken(forged);
    expect(decoded).toBeNull();
  });
});

describe("verifyToken backward compat", () => {
  it("maps legacy ADMIN role to COACH", async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const legacyToken = await new SignJWT({
      userId: "u1",
      email: "a@b.com",
      role: "ADMIN", // legacy value
      // no coachId in old tokens
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("14d")
      .sign(secret);

    const decoded = await verifyToken(legacyToken);
    expect(decoded?.role).toBe("COACH");
    expect(decoded?.coachId).toBeNull();
  });

  it("defaults missing coachId to null", async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const token = await new SignJWT({
      userId: "u1",
      email: "a@b.com",
      role: "COACH",
      // coachId intentionally omitted
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("14d")
      .sign(secret);

    const decoded = await verifyToken(token);
    expect(decoded?.coachId).toBeNull();
  });
});

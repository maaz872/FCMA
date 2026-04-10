/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCoachIdFromUser,
  coachWhere,
  withCoachId,
} from "./coach-scope";
import type { JWTPayload } from "./auth";

// Mock getCurrentUser so async helpers don't touch real cookies
vi.mock("./auth", async () => {
  const actual = await vi.importActual<typeof import("./auth")>("./auth");
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

import { getCurrentUser } from "./auth";
import { requireCoach, getCoachScope, requireSuperAdmin } from "./coach-scope";

const mockedGetCurrentUser = getCurrentUser as unknown as ReturnType<typeof vi.fn>;

const COACH_USER: JWTPayload = {
  userId: "coach-123",
  email: "coach@example.com",
  role: "COACH",
  coachId: null,
};

const REGULAR_USER: JWTPayload = {
  userId: "user-456",
  email: "client@example.com",
  role: "USER",
  coachId: "coach-123",
};

const SUPER_ADMIN_USER: JWTPayload = {
  userId: "sa-789",
  email: "sa@example.com",
  role: "SUPER_ADMIN",
  coachId: null,
};

describe("getCoachIdFromUser", () => {
  it("returns the COACH's own userId when role is COACH", () => {
    expect(getCoachIdFromUser(COACH_USER)).toBe("coach-123");
  });

  it("returns the USER's coachId when role is USER", () => {
    expect(getCoachIdFromUser(REGULAR_USER)).toBe("coach-123");
  });

  it("returns null for USER with no coachId assigned", () => {
    const orphan: JWTPayload = { ...REGULAR_USER, coachId: null };
    expect(getCoachIdFromUser(orphan)).toBeNull();
  });

  it("returns null for SUPER_ADMIN (no tenant scope)", () => {
    expect(getCoachIdFromUser(SUPER_ADMIN_USER)).toBeNull();
  });
});

describe("coachWhere", () => {
  it("produces a Prisma where fragment with the coachId", () => {
    expect(coachWhere("abc-123")).toEqual({ coachId: "abc-123" });
  });
});

describe("withCoachId", () => {
  it("adds coachId to a data object", () => {
    const data = { title: "Test Recipe", calories: 300 };
    const result = withCoachId(data, "coach-xyz");
    expect(result).toEqual({
      title: "Test Recipe",
      calories: 300,
      coachId: "coach-xyz",
    });
  });

  it("overrides an existing coachId if present in source", () => {
    const data = { title: "Test", coachId: "old" };
    const result = withCoachId(data, "new");
    expect(result.coachId).toBe("new");
  });
});

describe("requireCoach (async)", () => {
  beforeEach(() => {
    mockedGetCurrentUser.mockReset();
  });

  it("returns null when not authenticated", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(null);
    const result = await requireCoach();
    expect(result).toBeNull();
  });

  it("returns null for USER role", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(REGULAR_USER);
    const result = await requireCoach();
    expect(result).toBeNull();
  });

  it("returns null for SUPER_ADMIN role", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(SUPER_ADMIN_USER);
    const result = await requireCoach();
    expect(result).toBeNull();
  });

  it("returns {user, coachId} for COACH role", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(COACH_USER);
    const result = await requireCoach();
    expect(result).not.toBeNull();
    expect(result?.coachId).toBe("coach-123");
    expect(result?.user.role).toBe("COACH");
  });
});

describe("getCoachScope (async)", () => {
  beforeEach(() => {
    mockedGetCurrentUser.mockReset();
  });

  it("returns null when not authenticated", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(null);
    const result = await getCoachScope();
    expect(result).toBeNull();
  });

  it("returns null for SUPER_ADMIN (no tenant scope)", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(SUPER_ADMIN_USER);
    const result = await getCoachScope();
    expect(result).toBeNull();
  });

  it("returns {user, coachId} for COACH role", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(COACH_USER);
    const result = await getCoachScope();
    expect(result?.coachId).toBe("coach-123");
    expect(result?.user.role).toBe("COACH");
  });

  it("returns {user, coachId} for USER role (coachId = user.coachId)", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(REGULAR_USER);
    const result = await getCoachScope();
    expect(result?.coachId).toBe("coach-123");
    expect(result?.user.role).toBe("USER");
  });
});

describe("requireSuperAdmin (async)", () => {
  beforeEach(() => {
    mockedGetCurrentUser.mockReset();
  });

  it("returns null when not authenticated", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(null);
    expect(await requireSuperAdmin()).toBeNull();
  });

  it("returns null for COACH role", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(COACH_USER);
    expect(await requireSuperAdmin()).toBeNull();
  });

  it("returns null for USER role", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(REGULAR_USER);
    expect(await requireSuperAdmin()).toBeNull();
  });

  it("returns {user} for SUPER_ADMIN role", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(SUPER_ADMIN_USER);
    const result = await requireSuperAdmin();
    expect(result?.user.role).toBe("SUPER_ADMIN");
  });
});

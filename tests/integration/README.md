# Integration tests

These tests run against a **live Next.js dev server** hitting a **dedicated test Postgres database**. They are **not** yet wired up — this README documents what Phase 4 of the testing plan will build.

## Prerequisites

1. A dedicated test Supabase project (or local Postgres via Docker)
2. Add to `.env.test` in the project root:
   ```
   TEST_DATABASE_URL=postgresql://...fcma-test...
   TEST_DIRECT_URL=postgresql://...fcma-test...
   JWT_SECRET=test-jwt-secret-minimum-32-characters-1234567890
   ```
3. Push the schema to the test DB once: `DIRECT_URL=$TEST_DIRECT_URL npx prisma db push`

## Running

```bash
# Start the dev server in one terminal (DATABASE_URL must point at test DB)
DATABASE_URL=$TEST_DATABASE_URL npm run dev

# In another terminal, run the integration suite
npm run test:integration
```

## Planned structure

```
tests/integration/
├── README.md             ← this file
├── fixtures.ts           ← seed Coach Alpha, Coach Beta, clients, recipes
├── db-reset.ts           ← truncate all tables + re-seed
├── http.ts               ← wrapper around fetch() with cookie jar helpers
├── auth/
│   ├── login.test.ts     ← ~12 test cases
│   ├── register.test.ts  ← ~8 cases (invite code validation)
│   ├── me.test.ts        ← ~5 cases (subscription field for COACH)
│   └── validate-invite.test.ts
├── super-admin/
│   ├── dashboard.test.ts
│   ├── coaches.test.ts   ← CRUD + subscription actions
│   └── billing.test.ts
├── admin/
│   ├── recipes.test.ts   ← CRUD + cross-coach isolation
│   ├── workouts.test.ts
│   ├── plans.test.ts
│   ├── users.test.ts
│   ├── signup-requests.test.ts
│   ├── notifications.test.ts
│   ├── progress-overview.test.ts
│   └── (one file per route group)
├── client/
│   ├── feed.test.ts
│   ├── messages.test.ts
│   ├── meals.test.ts
│   ├── measurements.test.ts
│   ├── steps.test.ts
│   ├── plan.test.ts
│   └── favourites.test.ts
├── isolation.test.ts     ← Multi-tenant attack tests (Phase 5)
└── middleware.test.ts
```

## Why the integration tests are NOT in Phase 2

Phase 2 focused on pure unit tests that need no DB or network. Integration tests require:
1. A second Postgres database (test-only)
2. A running Next.js dev server
3. Fixture seeding + reset between tests

The infrastructure is straightforward but takes ~4-5 days of solid work to build the 180+ test cases identified in the plan. See `C:\Users\Lenovo\.claude\plans\lovely-tickling-biscuit.md` Phase 4 for the full list.

## Sample test (aspirational — not yet runnable)

```typescript
// tests/integration/auth/login.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { resetDatabase, seedFixtures } from "../fixtures";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

beforeEach(async () => {
  await resetDatabase();
  await seedFixtures();
});

describe("POST /api/auth/login", () => {
  it("returns 401 for invalid password", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "coach-alpha@test.com",
        password: "wrong",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for coach with CANCELLED subscription", async () => {
    // fixtures have Coach Alpha with CANCELLED billing
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "coach-cancelled@test.com",
        password: "TestPass123",
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("cancelled");
  });
});
```

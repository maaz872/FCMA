# FCMA Test Suite

Automated tests for the FCMA multi-tenant fitness coaching SaaS. This directory implements the testing plan at `C:\Users\Lenovo\.claude\plans\lovely-tickling-biscuit.md`.

## Status

| Phase | Status | What's done |
|---|---|---|
| **Phase 1** — Foundation setup | ✅ Done | Vitest + Playwright installed, configs written, smoke tests passing |
| **Phase 2** — Unit tests (pure fns) | ✅ Done | 97 unit tests across `billing`, `auth`, `coach-scope`, `video`, `fetch-retry` |
| **Phase 3** — Component tests | 🟡 Partial | `FavouriteButton.test.tsx` done (5 tests) as template. 9 more components planned. |
| **Phase 4** — API integration tests | 📋 Scaffolded | Directory structure + README in `tests/integration/`. 0 tests yet. |
| **Phase 5** — Multi-tenant isolation | 📋 Planned | Will live in `tests/integration/isolation.test.ts` |
| **Phase 6** — E2E (Playwright) | 🟡 Partial | `login.spec.ts` smoke test + README with planned suites |
| **Phase 7** — Load (k6) | 🟡 Partial | `smoke.js` scaffolded + README with planned scenarios |
| **Phase 8** — Edge case / bug hunting | 📋 Planned | Will fold into phases above |
| **Phase 9** — CI/CD + hooks | 📋 Planned | `.github/workflows/ci.yml` not yet created |
| **Phase 10** — Production readiness | 📋 Planned | Manual audit, not automated |

**Current test count: 102 automated tests, all passing.**

## Running tests

```bash
# Unit tests (fast, ~10s)
npm test                   # one-shot
npm run test:watch         # watch mode
npm run test:coverage      # with coverage report in ./coverage

# Only lib/ or only components
npm run test:unit

# E2E tests (Playwright)
npm run test:e2e           # headless
npm run test:e2e:ui        # interactive UI mode

# Load tests (requires k6 installed)
npm run test:load          # smoke scenario
# See tests/load/README.md for staging setup
```

## Directory layout

```
src/
├── lib/
│   ├── billing.ts
│   ├── billing.test.ts          ← 28 tests (Phase 2)
│   ├── auth.ts
│   ├── auth.test.ts             ← 17 tests (Phase 2, @vitest-environment node)
│   ├── coach-scope.ts
│   ├── coach-scope.test.ts      ← 19 tests (Phase 2)
│   ├── video.ts
│   ├── video.test.ts            ← 25 tests (Phase 2)
│   ├── fetch-retry.ts
│   └── fetch-retry.test.ts      ← 8 tests (Phase 2)
└── components/ui/
    ├── FavouriteButton.tsx
    └── FavouriteButton.test.tsx ← 5 tests (Phase 3 sample)

tests/
├── README.md                ← this file
├── setup.ts                 ← Vitest global setup (jest-dom matchers, JWT_SECRET)
├── integration/
│   ├── README.md            ← Phase 4 plan
│   ├── auth/                ← planned
│   ├── super-admin/         ← planned
│   ├── admin/               ← planned
│   └── client/              ← planned
├── e2e/
│   ├── README.md            ← Phase 6 plan
│   └── login.spec.ts        ← smoke test (Phase 1)
└── load/
    ├── README.md            ← Phase 7 plan
    └── smoke.js             ← scaffolded (Phase 1)
```

## Adding a new unit test

Put `*.test.ts` or `*.test.tsx` next to the source file. Vitest picks them up automatically.

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./my-module";

describe("myFunction", () => {
  it("does the thing", () => {
    expect(myFunction("input")).toBe("output");
  });
});
```

### Async helpers that use `next/headers` or jose JWT

Add the node environment directive at the top of the file so `TextEncoder`/`Uint8Array` cross-realm issues don't bite:

```typescript
/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
// ...
```

### Mocking auth or DB

```typescript
import { vi } from "vitest";

vi.mock("./auth", async () => {
  const actual = await vi.importActual<typeof import("./auth")>("./auth");
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});
```

## Coverage thresholds

Configured in `vitest.config.ts`:
- Lines: 70%
- Functions: 70%
- Branches: 60%
- Statements: 70%

Run `npm run test:coverage` to see the report.

## Next steps to finish the plan

Remaining work, roughly in priority order:

1. **Phase 3 completion** — 9 more component tests (RetryError, NotificationBell, VideoEmbed, BarChart, PasswordInput, CountdownTimer, FAQAccordion, TimeRangeFilter, VideoThumbnail) — ~1.5 days
2. **Phase 4 infrastructure** — set up test Postgres, fixture seeding, HTTP helpers. See `tests/integration/README.md` — ~0.5 day
3. **Phase 4 tests** — ~180 integration tests across all 61 API routes — ~4 days
4. **Phase 5** — multi-tenant isolation attack tests — ~1 day
5. **Phase 6** — full E2E suites (super-admin, coach, client, subscription, edge-cases) — ~3 days
6. **Phase 7** — implement the other 6 k6 scenarios + baseline numbers — ~2 days
7. **Phase 9** — GitHub Actions CI + husky pre-commit — ~0.5 day

Total: ~12-14 more calendar days for a solo dev to finish the full plan as designed.

## Known gotchas

- **jose + jsdom**: JWT libraries need `@vitest-environment node` (see above)
- **bcrypt**: `hashPassword` takes ~1-2s per call due to cost factor 12. Test suite budget is noticeable (~7s for 17 auth tests).
- **React Testing Library imports**: `@testing-library/jest-dom/vitest` (not `/extend-expect`)
- **Coverage from components**: currently excludes presentational components like `Button`, `Section`, etc. See `vitest.config.ts`.

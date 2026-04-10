# Playwright E2E tests

Phase 1 smoke test (`login.spec.ts`) is wired up and ready to run.
Phase 6 full E2E suites (super-admin, coach, client, subscription-lifecycle, edge-cases) are scaffolded per the testing plan but not yet implemented.

## Running

Playwright is configured to spawn `npm run dev` automatically via `webServer` in `playwright.config.ts`.

```bash
# Headless run
npm run test:e2e

# Interactive UI mode (best for local debugging)
npm run test:e2e:ui

# Run against a staging deployment instead of local dev
E2E_BASE_URL=https://fcma.vercel.app npm run test:e2e
```

## First run setup

```bash
npx playwright install chromium
```

## Planned suites (Phase 6)

| File | Status | Focus |
|---|---|---|
| `login.spec.ts` | ✅ Smoke test scaffolded | Basic login form + error state |
| `super-admin.spec.ts` | 📋 Planned | Create coach, extend/renew/cancel/reactivate subscription, grant clients |
| `coach.spec.ts` | 📋 Planned | Branding edit, invite code, recipe/workout/plan CRUD, approve signup |
| `client.spec.ts` | 📋 Planned | Invite-code registration, hub dashboard, my-plan, messages |
| `subscription-lifecycle.spec.ts` | 📋 Planned | ACTIVE → GRACE → EXPIRED flow with login gate + banner |
| `edge-cases.spec.ts` | 📋 Planned | Mobile stepper, invalid invite code, XSS in user input, etc. |

See `C:\Users\Lenovo\.claude\plans\lovely-tickling-biscuit.md` Phase 6 for the full test scenarios.

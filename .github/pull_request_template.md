## Summary

<!-- What does this PR change, and why? -->

## Test plan

- [ ] New/modified code has unit tests (`npm test`)
- [ ] New API routes have integration tests (see `tests/integration/README.md`)
- [ ] New UI flows have a Playwright E2E test (see `tests/e2e/README.md`)
- [ ] Ran `npm run lint` locally — no warnings
- [ ] Ran `npm run build` locally — no errors
- [ ] Manually tested on mobile viewport (375×667)

## Multi-tenant isolation

If this PR touches any API route that reads or writes coach-scoped data:

- [ ] Verified the route filters by `coachId` (admin routes) or resolves coachId via `getCoachScope()` (client routes)
- [ ] Cross-coach access returns 404, not 403
- [ ] Added or updated a test in `tests/integration/isolation.test.ts` if applicable

## Schema changes

- [ ] None
- [ ] Updated `prisma/schema.prisma` and ran `npx prisma db push` on local
- [ ] Documented any migration steps in the commit message
- [ ] Updated `scripts/migrate-multi-tenant.ts` if adding a new coach-scoped table

## Env vars

- [ ] No new env vars
- [ ] Added to `.env.example` and documented in commit message

## Notes for reviewer

<!-- Anything to call attention to? -->

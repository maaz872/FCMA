# k6 load tests

Phase 7 of the testing plan. k6 is a standalone binary — install separately:

```bash
# macOS
brew install k6

# Windows
winget install k6

# Linux
sudo apt install k6  # or see https://k6.io/docs/get-started/installation/
```

## Running

```bash
# Local dev server
npm run dev  # in one terminal
k6 run tests/load/smoke.js  # in another

# Against staging
BASE_URL=https://fcma.vercel.app k6 run tests/load/smoke.js
```

**Never run load tests against production.** The dev server or a dedicated staging environment only.

## Scenarios

| File | Status | Purpose |
|---|---|---|
| `smoke.js` | ✅ Scaffolded | 1 VU, 1 min, hits public endpoints. Baseline sanity check. |
| `cold-start.js` | 📋 Planned | 1 request every 90s for 15 min — measures cold-start time on Vercel |
| `sustained.js` | 📋 Planned | 50 VUs for 5 min — realistic coach + client traffic |
| `burst.js` | 📋 Planned | 500 VU spike on `/api/auth/login` — tests Vercel autoscaling + brute-force surface |
| `multitenant.js` | 📋 Planned | 60 VUs across 10 coaches — proves isolation holds under load |
| `feed.js` | 📋 Planned | 200 posts × 50 comments × 30 likes — exposes N+1 feed query |
| `upload.js` | 📋 Planned | 5 concurrent 2MB uploads — tests payload size limits |

## Baseline numbers

Once each scenario is implemented, record its first successful run here. Future runs compare against the baseline to catch regressions.

### smoke.js baseline (local)

| Metric | Value |
|---|---|
| p50 http_req_duration | TBD |
| p95 http_req_duration | TBD |
| http_req_failed rate | TBD |
| iterations/sec | TBD |

See `C:\Users\Lenovo\.claude\plans\lovely-tickling-biscuit.md` Phase 7 for the full scenario specs.

# FCMA — Project Reference

> Encyclopedia-grade companion to `CLAUDE.md` / `AGENTS.md`. Where `CLAUDE.md` gives an orientation, this file gives the full atlas. Sourced from a complete pass over every file in `src/`, `prisma/`, `scripts/`, `public/`, `tests/`, plus a live cross-check against the Supabase project `fzfzxwmaxhizghzcvwhl` on 2026-05-20.

---

## What's new since the initial pass (2026-05-20 → 2026-05-21)

Two big areas of change landed after the first encyclopedia pass, merged to `main` as a single feature: the **Seed Content & Illustrations** branch (`feature/seed-content-and-illustrations`, merge commit `4a8ecc1`).

- **`PlanExercise` model + XOR CHECK constraint** (template-day FK *or* client-day FK, never both). `Workout` gained illustration metadata: `gifUrl`, `bodyPart`, `equipment`, `primaryMuscles`. Free Exercise DB JSON (`src/data/exercise-library.json`, 873 entries, MIT) is bundled and powers the `IllustrationPicker`, but no longer drives the seed.
- **HD-video curated seed** (`src/lib/seed/workout-picks.ts`): every new coach gets 22 self-contained workout definitions (wger.de 1080p MOV/MP4 + curated YouTube), 50 recipes, and 3 plan templates ("Upper / Lower Split", "Arm Specialization", "8-Week Foundation"). Plan prescriptions carry `weightKg` and `durationSeconds` defaults on compound lifts. Coverage: chest 3, back 4, legs 6, shoulders 2, arms 6, core 1.
- **`WorkoutMediaThumbnail`** (`src/components/ui/WorkoutMediaThumbnail.tsx`): unified hover-to-play video / gif / iframe component used on every card surface. Mouse enter starts playback; mouse leave pauses. YouTube cards use the poster image (`img.youtube.com/vi/<id>/hqdefault.jpg`) until hover, then mount an autoplay+mute iframe.
- **bodyPart-first navigation**: pills (Chest / Back / Legs / Shoulders / Arms / Core / Full body / Cardio) are primary nav on `/admin/workouts` and `/hub/workouts`. The hub sidebar no longer carries the WorkoutCategory tree (removed because it duplicated the pills); it keeps only Search + Difficulty + Goal.
- **Multi-exercise plan editor** at `/admin/plans/[id]/edit` — coaches build training days with multiple exercises, each with `sets`, `repsLow`, `repsHigh`, `durationSeconds`, `restSeconds`, `weightKg`, `notes`, and up/down reordering. Pickers: `IllustrationPicker` (Free Exercise DB modal) and `WorkoutPickerModal` (coach's own library).
- **Editable assigned plans without touching templates** — `/admin/users/[id]` Plans tab has a clickable calendar; each cell opens `EditPlanDayModal` (defined in `UserDetailClient.tsx`) which writes to `ClientPlanDay` / `PlanExercise` / `PlanDayMeal` on the *client side*. Source `PlanTemplate` stays canonical. Endpoint: `PUT /api/admin/users/[id]/plan/days/[dayId]` with cross-coach FK validation.
- **In-page exercise detail on `/hub/my-plan`** — tapping a card or title opens an in-page `ExerciseDetailModal` (full video, prescription, instructions) instead of navigating to `/hub/workouts/[slug]`.
- **Live demo state**: super admin retained; coaches Sarah/John/Maaz/etc. and all their clients wiped; new coach **Adele Reyes** (`adele@fcma.com` / `Adele2026!`) provisioned with 3 clients (`sarah.mitchell@demo.com`, `james.oconnor@demo.com`, `priya.sharma@demo.com` — all `demo1234`) and 8 weeks of per-client history (meal/step/weight/body/progress logs + 20-message coach conversation). See §15 and §18.
- **UX backlog**: `docs/UX-RECOMMENDATIONS.md` — 15 ranked improvements (auto-advance workout timer, at-risk client dashboard panel, push notifications, etc.).

The relevant `§` sections (data model, API surface, page tour, components, scripts, demo accounts) have been patched in-place to reflect this; everything else from the original pass is still accurate.

---

## Table of Contents

1. [Project identity](#1-project-identity)
2. [Stack & dependencies](#2-stack--dependencies)
3. [Environment variables](#3-environment-variables)
4. [Directory structure](#4-directory-structure)
5. [Data model](#5-data-model)
6. [Auth & sessions](#6-auth--sessions)
7. [Multi-tenant scoping](#7-multi-tenant-scoping)
8. [Subscription & billing](#8-subscription--billing)
9. [API surface](#9-api-surface)
10. [Page-by-page tour](#10-page-by-page-tour)
11. [Lib modules](#11-lib-modules)
12. [Components](#12-components)
13. [PWA & service worker](#13-pwa--service-worker)
14. [Branding & theming](#14-branding--theming)
15. [Scripts](#15-scripts)
16. [Tests](#16-tests)
17. [Build & deploy](#17-build--deploy)
18. [Demo accounts](#18-demo-accounts)
19. [Known issues, gotchas, and tech debt](#19-known-issues-gotchas-and-tech-debt)
20. [Open questions](#20-open-questions)

---

## 1. Project identity

**FCMA — Fitness Coach Management App.** A multi-tenant SaaS hosted under one Next.js codebase. The platform owner (`SUPER_ADMIN`) provisions independent fitness coaches; each coach gets a self-contained, brandable workspace where they manage their own content (recipes/workouts/plans/food database) and their own client roster. Each client (`USER`) sees only their coach's content via a personal "Hub" portal.

The product is split into three sub-apps that share the same Next.js app:

| Role | URL prefix | Capabilities |
|---|---|---|
| **`USER`** | `/hub/*` | Daily plan view, meal/workout logging, body/step/measurement tracking, recipes browser, workouts browser, calorie calculator, favourites, weekly targets, community feed (within their coach's tenant), DM with their coach, notifications, health profile, password/account/reminders. |
| **`COACH`** | `/admin/*` | Branding settings (logo, favicon, PWA icons, marketing copy), billing read-out, recipe CRUD, workout CRUD, food-database CRUD, plan-template CRUD + per-user plan assignment, social feed moderation, user roster (suspend / activate / delete / view-detail dashboards with 8 tabs), pending signup approval, asset library, mass + targeted notifications, DM inbox, content settings, newsletter (folder present but no page). |
| **`SUPER_ADMIN`** | `/super-admin/*` | Platform dashboard (revenue, capacity), per-coach billing table, create coach accounts, per-coach detail (extend / renew / cancel / reactivate subscription, adjust price/limits, grant clients, seed defaults, activate/deactivate coach which cascades to clients). |

Legacy quirk: the original schema used `role: "ADMIN"` for what is now `COACH`. The string `"ADMIN"` is silently rewritten to `"COACH"` in `src/lib/auth.ts:64`, `src/middleware.ts:32`, and `/api/auth/me` (`route.ts:60`). The login page and registration flow both treat the two as equivalent. There is no remaining `ADMIN` row in the live DB but the compat shim is still wired.

---

## 2. Stack & dependencies

Versions copied verbatim from `package.json`:

### Production deps

| Package | Version | Used for |
|---|---|---|
| `next` | `16.2.2` | App Router; **breaking changes vs. training-data Next**, see `AGENTS.md`. Async `params`/`cookies()`, etc. |
| `react`, `react-dom` | `19.2.4` | UI runtime. React 19 — `use(promise)` available (used in `admin/recipes/[id]/edit/page.tsx` etc.). |
| `prisma`, `@prisma/client` | `^7.6.0` | ORM. Client output is `src/generated/prisma/` (import as `@/generated/prisma/client`). |
| `@prisma/adapter-pg` | `^7.6.0` | The only Prisma driver actually used (wired in `src/lib/db.ts:11`). |
| `pg` | `^8.20.0` | Postgres pool feeding the adapter. |
| `jose` | `^6.2.2` | JWT sign/verify (HS256). Chosen because `next/headers` is unavailable in middleware. |
| `bcryptjs` | `^3.0.3` | Password hashing, cost factor 12. |
| `clsx` | `^2.1.1` | className combiner; only `Button` uses it (everywhere else is template strings). |
| `dotenv` | `^17.3.1` | Loads `.env` for `prisma.config.ts` and seed scripts. |
| `ws` | `^8.20.0` | Pulled by `@neondatabase/serverless`, otherwise unused. |
| **Unused** | | |
| `@libsql/client` | `^0.17.2` | Leftover from an aborted libsql driver attempt. Not imported anywhere. |
| `@neondatabase/serverless` | `^1.0.2` | Same — Neon adapter prep, never wired. |
| `@prisma/adapter-better-sqlite3` | `^7.6.0` | Same — SQLite adapter prep. |
| `@prisma/adapter-libsql` | `^7.6.0` | Same. |
| `@prisma/adapter-neon` | `^7.6.0` | Same. |
| `@prisma/adapter-pg-worker` | `^6.9.0` | Same. Note this one is at v6 — out of sync with the rest. |
| `@types/better-sqlite3`, `better-sqlite3` | `^7.6.13`, `^12.8.0` | Carryover from the same attempt. |
| `@types/ws` | `^8.18.1` | Types for `ws`. Probably unused unless TS catches a re-export. |

### Dev deps

| Package | Version | Used for |
|---|---|---|
| `typescript` | `^5` | Strict mode, `noEmit`. |
| `@types/node`, `@types/react`, `@types/react-dom`, `@types/bcryptjs` | latest | Type defs. |
| `eslint` + `eslint-config-next` | `^9` / `16.2.2` | Lint (rules in `eslint.config.mjs`). |
| `tailwindcss` + `@tailwindcss/postcss` | `^4` | Tailwind v4 (PostCSS-only — `postcss.config.mjs` has just `@tailwindcss/postcss`). No `tailwind.config.{js,ts}`. |
| `vitest` + `@vitest/coverage-v8` | `^3.2.4` | Unit + component tests (jsdom env). |
| `@testing-library/react`, `/user-event`, `/jest-dom` | `^16.3.2`, `^14.6.1`, `^6.9.1` | RTL + matchers. |
| `jsdom` | `^25.0.1` | Vitest DOM env. |
| `msw` | `^2.13.2` | **Installed but not used yet** — Phase 4 (integration tests) is scaffolded but not implemented. |
| `@playwright/test` | `^1.59.1` | E2E. One spec exists (`tests/e2e/login.spec.ts`). |
| `husky` + `lint-staged` | `^9.1.7` + `^16.4.0` | Pre-commit hook runs `eslint --fix` on `*.{ts,tsx}` (`.husky/pre-commit`, `.lintstagedrc.json`). |

### Build / scripts (`package.json:5-19`)

| Script | Command | Notes |
|---|---|---|
| `dev` | `next dev` | Turbopack by default in Next 16. |
| `build` | `prisma generate && next build` | Generates client into `src/generated/prisma`, then builds. |
| `postinstall` | `prisma generate` | Runs after every `npm install`. |
| `prepare` | `husky || true` | Husky bootstrap, non-fatal. |
| `start` | `next start` | Production server. |
| `lint` | `eslint` | Uses flat config (`eslint.config.mjs`). |
| `test`, `test:watch`, `test:coverage` | `vitest run` and variants | Default test runner. |
| `test:unit` | `vitest run src/lib src/components` | Just the colocated tests. |
| `test:integration` | `vitest run tests/integration` | **No tests under that path yet** — folder has only a README. |
| `test:e2e`, `test:e2e:ui` | `playwright test` and `--ui` | Single login spec. |
| `test:load` | `k6 run tests/load/smoke.js` | Requires k6 installed locally. |

---

## 3. Environment variables

| Variable | Read in | Behaviour if missing | Dev fallback |
|---|---|---|---|
| `DATABASE_URL` | `src/lib/db.ts:9` (preferred-second), `prisma.config.ts:12` (preferred-second). Used to build the `pg.Pool` connection string. | Pool construction fails on first DB access — `Cannot read property of undefined`. | None. |
| `DIRECT_URL` | `src/lib/db.ts:9` (preferred-first), `prisma.config.ts:12` (preferred-first), `prisma/seed.ts:6`, every `scripts/*.ts`. | App falls back to `DATABASE_URL`. | None. |
| `JWT_SECRET` | `src/lib/auth.ts:6`, `src/middleware.ts:6` (**duplicated loader** — drift risk). | In `NODE_ENV=production` throws on import if missing or < 32 chars; in dev/test, falls back to literal `"dev-secret-change-in-production-min-32-chars!!"`. | Hardcoded above; tests override via `tests/setup.ts:7` (`"test-jwt-secret-minimum-32-characters-1234567890"`). |
| `NODE_ENV` | `src/lib/auth.ts:7`, `src/middleware.ts:7`, `src/lib/auth.ts:84` (cookie `secure` flag), every Next.js default. | Treated as not-production. | Defaults are dev-friendly. |
| `CI` | `playwright.config.ts:12-14`. | Disables `--ui`, sets retries=2, workers=1, forbids `.only`. | None. |
| `E2E_BASE_URL` | `playwright.config.ts:17, 28`. | Falls back to `http://localhost:3000` and Playwright auto-starts `npm run dev`. | None. |
| `BASE_URL` | `tests/load/smoke.js:14`. | Falls back to `http://localhost:3000`. | None. |
| `LOAD_TEST_URL` (CI secret) | `.github/workflows/ci.yml:86`. | k6 manual workflow exits empty BASE_URL. | None. |

Notable: no `.env` keys for SMTP, payment, push notifications, analytics. The "forgot password" + "reset password" pages exist (`src/app/(marketing)/forgot-password/page.tsx`, `reset-password/page.tsx`) but both are **stubs that just toggle local UI state**. Payment is manual — users upload a screenshot, coach reviews it.

`.env.example` (committed) shows the expected shape; the local `.env` (gitignored but present) points at `fzfzxwmaxhizghzcvwhl.supabase.co` with a real password and the production JWT secret.

---

## 4. Directory structure

```
.
├── .agents/                       # supabase agent-skills installed at project scope (see .mcp.json)
├── .claude/                       # local Claude Code settings
├── .github/
│   ├── pull_request_template.md   # PR checklist (multi-tenant isolation reminders)
│   └── workflows/ci.yml           # lint + unit + build + manual k6 load
├── .husky/pre-commit              # `npx lint-staged`
├── .mcp.json                      # Supabase MCP at HTTP endpoint, project_ref=fzfzxwmaxhizghzcvwhl
├── .env / .env.example            # see §3
├── AGENTS.md                      # 1-paragraph "this is not your Next.js" warning
├── CLAUDE.md                      # codebase tour, conventions, gotchas
├── README.md                      # default create-next-app boilerplate (not project-specific)
├── dev.db                         # **stale 2.9 MB SQLite file at repo root, unused**
├── next.config.ts                 # empty NextConfig object
├── prisma.config.ts               # Prisma 7 config; reads DIRECT_URL || DATABASE_URL
├── package.json                   # see §2
├── playwright.config.ts           # see §16
├── postcss.config.mjs             # only `@tailwindcss/postcss`
├── prisma/
│   ├── schema.prisma              # single source of truth for the data model — see §5
│   └── seed.ts                    # 1807-line legacy seed (pre-multi-tenant, not currently used; live demo data is generated by a separate one-off script — see §17)
├── public/
│   ├── icon-192.png, icon-512.png # static PWA icons
│   ├── manifest.json              # static PWA manifest (always wired) — see §13
│   ├── offline.html               # served by sw.js on nav failure
│   ├── sw.js                      # hand-rolled service worker — see §13
│   ├── file.svg, globe.svg, next.svg, vercel.svg, window.svg  # leftover from CNA template
│   └── images/                    # whatever the marketing pages need
├── scripts/                       # graveyard of one-off scripts — see §15
├── src/
│   ├── middleware.ts              # JWT gate for /hub, /admin, /super-admin, /login
│   ├── app/
│   │   ├── globals.css            # Tailwind v4 import + custom CSS variables
│   │   ├── layout.tsx             # root html shell; registers /sw.js; links /manifest.json
│   │   ├── api/                   # ~67 route.ts files — see §9
│   │   ├── (marketing)/           # public surface (URL has no `/(marketing)/`)
│   │   │   ├── layout.tsx         # Header + Footer + force-dynamic
│   │   │   ├── page.tsx           # redirect("/login")
│   │   │   ├── not-found.tsx      # 404 page
│   │   │   ├── login/, checkout/, forgot-password/, reset-password/, privacy-policy/, terms/
│   │   ├── admin/                 # COACH portal — see §10
│   │   ├── hub/                   # USER portal — see §10
│   │   └── super-admin/           # SUPER_ADMIN portal — see §10
│   ├── components/
│   │   ├── InstallPrompt.tsx      # PWA install CTA (Android + iOS instructions)
│   │   ├── admin/                 # ChangePasswordModal (orphan), PreviewModal
│   │   ├── hub/                   # RemindersCard
│   │   ├── layout/                # Header (marketing only), Footer (marketing only)
│   │   └── ui/                    # 28 components, ~13 actually used, 15 orphans — see §12
│   ├── lib/                       # auth, billing, branding, coach-scope, db, fetch-retry,
│   │                              # notifications, rate-limit, seed-coach-defaults,
│   │                              # upload-validation, video — see §11
│   ├── data/sample-recipes.ts     # unused sample fixture
│   ├── types/                     # empty
│   └── generated/prisma/          # ~1.5 MB of generated Prisma client (committed? — gitignore covers it)
├── tests/
│   ├── README.md                  # 148-line test plan with phase status
│   ├── setup.ts                   # Vitest global setup (JWT_SECRET fallback, jest-dom matchers)
│   ├── e2e/login.spec.ts          # Playwright smoke
│   ├── integration/README.md      # planned, no specs yet
│   └── load/smoke.js              # k6 smoke (1 VU, 1 min)
├── tsconfig.json                  # strict, alias @/* → src/*, excludes prisma/seed.ts
└── vitest.config.ts               # jsdom env, coverage thresholds 70/70/60/70
```

---

## 5. Data model

The schema lives in `prisma/schema.prisma`. Provider is `postgresql` with no datasource URL hardcoded — `prisma.config.ts` injects from `DIRECT_URL || DATABASE_URL`. Custom client output `../src/generated/prisma` (so imports are `@/generated/prisma/client`, not `@prisma/client`).

**Schema vs live DB:** verified 2026-05-20 against Supabase project `fzfzxwmaxhizghzcvwhl` via MCP. Every table, column type, default, nullability, and index matches. There is **no `prisma/migrations/` folder** and `list_migrations` returns empty — the DB was provisioned via `prisma db push`, not migrations. All 34 tables also have **RLS enabled with zero policies** — irrelevant in practice because the app connects as the `postgres` role (Prisma+pg adapter), which bypasses RLS. The Supabase-default `public.rls_auto_enable()` `SECURITY DEFINER` function is callable by anon/authenticated (advisor WARN), but the app never touches Supabase REST.

Row counts as of 2026-05-20 are appended to each model below.

---

### `User` (live rows: 18)

The role discriminator AND the full inline health profile AND the multi-tenant self-link AND the manual payment-proof fields all live on this one table.

| Field | Type | Meaning |
|---|---|---|
| `id` | `String @id @default(uuid())` | UUID; populated by Prisma, not by Postgres `gen_random_uuid()`. |
| `email` | `String @unique` | Stored lowercase (every write path lowercases). |
| `passwordHash` | `String` | bcryptjs cost 12. |
| `firstName`, `lastName` | `String` | Non-null. |
| `country` | `String?` | Free-text, but registration UI uses ISO-like codes. |
| `role` | `String @default("USER")` | `USER | COACH | SUPER_ADMIN`. Legacy `ADMIN` rewritten to `COACH` on read in several call-sites; no DB enum. |
| `plan` | `String @default("FREE")` | `FREE | HUB` informally. Used by login error copy. |
| `planStatus` | `String @default("PENDING")` | For USERs: `PENDING | ACTIVE | CANCELLED | EXPIRED`. Gates USER login (`/api/auth/login:101-130`). Coaches are always `ACTIVE`. |
| `unitPreference` | `String @default("METRIC")` | `METRIC | IMPERIAL`. |
| `isActive` | `Boolean @default(true)` | Soft-delete flag. Login blocked if false. |
| `paymentScreenshot`, `paymentAccountName`, `paymentTransactionRef` | `String?` | Manual-payment proof, set by `/api/auth/payment-proof`. Screenshot is base64. |
| `createdAt`, `updatedAt`, `lastLoginAt` | DateTime | Standard. |
| `coachId` | `String?` | **The tenant key.** USERs point to their coach. COACHes have it null. |
| `isCoachActive` | `Boolean @default(true)` | Only meaningful on COACH rows; flipping false also cascades `User.isActive=false` on all clients via `/api/super-admin/coaches/[id]:117`. |
| `inviteCode` | `String? @unique` | Coach-only. Generated as `firstName.toLowerCase() + "-" + random 4 chars of base36` (`/api/super-admin/coaches/route.ts:108`). The slugified portion is **not collision-safe** — re-using a first name + same RNG seed can collide, throwing on insert. |
| `age`, `gender`, `heightCm`, `currentWeightKg`, `bodyFatPercent`, `fitnessGoal`, `activityLevel`, `dietaryPrefs`, `healthConditions`, `targetWeightKg` | mixed | Inline health profile. `dietaryPrefs` is stringified JSON. |
| `activePlanId` | `Int?` | **Loose pointer**, no `@relation` — see Gotcha #6. |
| Reverse relations | | `clients` (self-rel `CoachClients`), `weightLogs`, `progressPhotos`, `mealLogs`, `macroTarget`, `assets`, `favourites`, `sentMessages`, `receivedMessages`, `posts`, `postLikes`, `postComments`, `stepLogs`, `bodyMeasurements`, `notifications`, `reminders`, `clientPlans`, `dailyProgress`, `weeklyTargets`, plus coach-side `coachRecipes` / `coachRecipeCategories` / `coachDietaryTags` / `coachWorkouts` / `coachWorkoutCats` / `coachWorkoutSubs` / `coachFoodItems` / `coachPlanTemplates` / `coachPosts` / `coachAssets` / `coachSiteContent` / `coachPaymentSettings` / `coachBilling`. |
| Indexes | | `@@index([coachId])`; primary on `id`; unique on `email`; unique on `inviteCode`. |

---

### `CoachBilling` (live rows: 6)

| Field | Type | Meaning |
|---|---|---|
| `id` | `Int @id @default(autoincrement())` | Surrogate key. |
| `coachId` | `String @unique` | 1:1 with a COACH user. |
| `basePriceMonthly` | `Int @default(15000)` | PKR. Stored as integer. |
| `extraClientPrice` | `Int @default(3500)` | PKR per client over `includedClients`. |
| `includedClients` | `Int @default(5)` | Soft floor — clients up to this count cost nothing extra. |
| `maxClients` | `Int @default(5)` | Hard cap — `/api/auth/register` triggers a "Client limit reached" notification when crossed (does **not** block registration). |
| `billingStatus` | `String @default("ACTIVE")` | `ACTIVE | CANCELLED` (the only manually settable values). `GRACE`/`EXPIRED` are derived, never written. |
| `currentPeriodEnd` | `DateTime` | Required. Compared against `now()` by `resolveSubscriptionStatus`. |
| `createdAt`, `updatedAt` | DateTime | Standard. |
| Relations | | `coach User @relation("CoachBilling", fields: [coachId], references: [id])`. |

Hardcoded default-defaults appear in `/api/super-admin/coaches/route.ts:118-121` (creation) **and** `/api/super-admin/coaches/[id]/route.ts:221-224` (upsert-create branch) — drift risk if pricing changes.

---

### `Message` (live rows: 6)

| Field | Type | Meaning |
|---|---|---|
| `id` | `Int @id @default(autoincrement())` | |
| `senderId`, `receiverId` | `String` | Both FK to `User`. Cascade delete on either side. |
| `content` | `String` | May be empty when only `imageData` is present. |
| `imageData` | `String?` | Base64 payload. **Not validated** through `upload-validation` (see Gotcha #11). |
| `isRead` | `Boolean @default(false)` | |
| `createdAt` | DateTime | |
| Indexes | | `[senderId, receiverId]`, `[receiverId, isRead]`. |

---

### `Post` / `PostLike` / `PostComment` (live rows: 3 / 0 / 0)

`Post` has `authorId` (any user in the tenant — both COACH and USER post here), `coachId?` (the tenant), `content`, `mediaType?` (`youtube|instagram|tiktok|facebook|image`), `mediaUrl?`, `createdAt`, `updatedAt`. Indexed on `[coachId, createdAt]`.

`PostLike` is a join table `(postId, userId)` unique; cascade delete on both sides.

`PostComment` keeps `postId`, `userId`, `content`, `createdAt`; indexed on `postId`.

---

### `RecipeCategory` / `DietaryTag` / `Recipe` / `RecipeDietaryTag` (live rows: 60 / 72 / 9 / 2)

All three "owned" models follow the same multi-tenant pattern: `coachId?` (null = legacy global), `@@unique([slug, coachId])` so two coaches can collide on slugs, `@@index([coachId])`.

`Recipe` carries the rich nutritional + content payload: `title`, `slug`, `description`, `categoryId`, `ingredients` (stringified JSON array), `instructions` (stringified JSON array), `videoUrl?`, `imageUrl?` (base64), `calories`, `protein`, `carbs`, `fat`, `servings`, `prepTimeMins`, `cookTimeMins`, `isPublished`. Indexed on `[categoryId, isPublished]`.

`RecipeDietaryTag` is a join `(recipeId, tagId)` cascade-deleted from both sides.

The seed-coach-defaults helper (`src/lib/seed-coach-defaults.ts`) seeds 10 categories and 12 dietary tags per new coach.

---

### `WorkoutCategory` / `WorkoutSubcategory` / `Workout` (live rows after Phase 3 seed: 30 / 168 / 50+ per coach)

Same multi-tenant pattern. `Workout` carries `title`, `slug`, `description`, `videoUrl` (now optional in practice — workouts can be illustration-only), `instructions` (stringified JSON array), `subcategoryId`, `difficulty @default("Intermediate")`, `duration?`, `sets?`, `reps?`, `targetGoal?`, `isPublished`. **Phase 4 added `gifUrl?`, `bodyPart?` (chest|back|legs|shoulders|arms|core|full_body|cardio), `equipment?` (bodyweight|dumbbell|barbell|kettlebell|machine|cable|band|other), `primaryMuscles?` (comma-separated)** — populated when a coach picks an entry from the Free Exercise DB via the IllustrationPicker. Indexed on `[subcategoryId, isPublished]`.

Default seed: 5 workout categories with 28 subcategories total + 50 workouts per coach (Phase 3), distributed 5 chest / 6 back / 12 legs / 5 shoulders / 6 arms / 8 core / 4 full body / 4 cardio.

---

### `Favourite` (live rows: 0)

| Field | Type | Meaning |
|---|---|---|
| `id`, `userId`, `recipeId?`, `workoutId?` | mixed | Either recipe **or** workout is set — no DB-level XOR. |

Cascade from `User` and `Recipe`; no cascade from `Workout` (would orphan favourites if a workout is deleted — `/api/admin/recipes/[id]` route does manual cleanup via `prisma.favourite.deleteMany({where:{recipeId}})` at `route.ts:159`; the workout DELETE route does not).

---

### `FoodItem` (live rows: 510)

| Field | Type | Meaning |
|---|---|---|
| `id`, `name`, `coachId?`, `category`, `subcategory?`, `caloriesPer100g`, `proteinPer100g`, `carbsPer100g`, `fatPer100g`, `fiberPer100g?`, `servingSize?`, `servingUnit?`, `isVerified @default(true)`, `createdAt` | mixed | Per-100g macros + a default serving (e.g. 100 g, 1 cup). |
| Indexes | | `[coachId]`, `[category]`, `[name]`. |

85 items seeded per new coach (`seed-coach-defaults.ts:72-167`).

---

### `StepLog` (live rows: 106) / `BodyMeasurement` (36) / `WeightLog` (0) / `ProgressPhoto` (0) / `MealLog` (201)

All user-tracking tables. Each has `userId` (cascade-delete from User) + `loggedDate` and is indexed on `[userId, loggedDate]`. `StepLog`, `BodyMeasurement`, `WeightLog` each have a `@@unique([userId, loggedDate])` constraint so the upsert pattern works.

`MealLog` extras: `mealType @default("Snack")` (Breakfast/Lunch/Dinner/Snack), `description`, full macros, `ingredients?` (stringified JSON), `loggedTime` (string `HH:MM`), `imageData?` base64. Meals starting with `[Plan] ` are flagged as plan-checkbox-generated by `/api/user/plan/progress` (`route.ts:` — idempotent via `description: { startsWith: "[Plan] " }`).

`BodyMeasurement.weightKg` is also stored here, separate from `WeightLog` (which is empty in the live DB).

`ProgressPhoto.imageData` is the only non-trivial blob column outside `Asset`/`SiteContent`/messages.

---

### `Notification` (live rows: 21)

`userId` cascade-delete, `title`, `message`, `type @default("system")` (informal: `system | admin_alert | achievement | plan | meal_reminder | target`), `actionUrl?`, `isRead`, `createdAt`. Indexed on `[userId, isRead]`.

The `coachId` is NOT on this table — admin listing (`/api/admin/notifications` GET) does a two-step lookup: first `User.findMany({where:{coachId}})`, then `Notification.findMany({where:{userId:{in:userIds}}})`.

---

### `UserReminder` (live rows: 0)

`userId` cascade-delete, `type` (wake/breakfast/lunch/dinner/snack/sleep), `time` (string), `enabled`. Composite unique `@@unique([userId, type])`. Driven by `/api/reminders` GET/PUT and the `RemindersCard` component.

---

### `SiteContent` (live rows: 24)

Generic per-coach key-value store for branding and marketing copy. `contentKey`, `coachId?`, `contentValue`, `contentType @default("TEXT")` (informal: `TEXT|BOOLEAN|JSON|IMAGE`), `updatedAt`. Composite unique `@@unique([contentKey, coachId])`. Keys used: `site_name`, `coach_name`, `site_logo`, `site_favicon`, `pwa_icon_192`, `pwa_icon_512`, `hero_headline`, `hero_subtitle`, `hub_price`, `hub_old_price`, `youtube_url`, `instagram_url`, `facebook_url`, `tiktok_url`, `youtube_visible`, `instagram_visible`, `facebook_visible`, `tiktok_visible`, `transformations_visible`, `countdown_visible`, `about_heading`, `about_bio`.

Logos/icons are stored as base64 in `contentValue`.

---

### `Asset` (live rows: 0)

Multi-purpose file library. `filename`, `data` (base64), `fileSize`, `mimeType`, `altText?`, `coachId?`, `uploadedById?` (SetNull on user delete), `createdAt`. Indexed on `[coachId]`. Used by `/admin/assets` — every upload bounces through `validateBase64Upload` (5 MB cap, JPEG/PNG/WebP only).

---

### `UserMacroTarget` (live rows: 1)

1:1 with User. `calories`, `protein`, `carbs`, `fat`, `goal`. Set by `/api/user/macro-targets` (driven by `/hub/calculator`).

---

### `PaymentSettings` (live rows: 0)

1:1 with coach. `accountNumber`, `accountName`, `qrCodeData?`, `instructions?`, `price @default(79)`, `currency @default("PKR")`. The 79/PKR defaults are very specific to one coach's setup and are clearly a starter value rather than a meaningful default.

---

### `PlanTemplate` (live rows after Phase 3: 13+) / `PlanTemplateDay` (489+) / `ClientPlan` (5) / `ClientPlanDay` (170) / `PlanDayMeal` (2090+) / `PlanExercise` (858+) / `DailyProgress` (3)

This is the largest entity cluster.

**Plan templates** are coach-owned re-usable plans. A `PlanTemplate` has `name`, `coachId?`, `description?`, `type @default("combined")` (combined/workout/diet), `durationWeeks @default(4)`. Each template has many `PlanTemplateDay` rows keyed by `(weekNumber, dayOfWeek)`, each carrying `workoutId?`, `workoutNotes?`, `mealPlan?` (free text), per-day macro targets (`calorieTarget`, `proteinTarget`, `carbsTarget`, `fatTarget`), and `notes?`. Each template day has many `PlanDayMeal` rows linking to a `Recipe` with `mealType`, `servings`, `sortOrder`. Indexed `[templateId, weekNumber, dayOfWeek]`.

**Client plans** are the assigned-to-a-user copies. `ClientPlan` has `userId` (cascade), `templateId?` (the source — kept for traceability, may be null for custom-built plans), `name`, `description?`, `type`, `startDate`, `endDate?`, `status @default("active")` (`active|paused|completed`). Same nested shape: `ClientPlanDay → PlanDayMeal`.

**`PlanDayMeal`** is shared between template-side (`templateDayId?`) and client-side (`clientDayId?`). **Only one is meant to be set**, no DB-level XOR. The unique constraints + cascade behaviour mean a template-side meal is deleted with its `PlanTemplateDay`, and a client-side meal is deleted with its `ClientPlanDay`. Indexes: `[templateDayId, mealType]`, `[clientDayId, mealType]`, `[recipeId]`.

**`PlanExercise` (added Phase 1)** mirrors the `PlanDayMeal` dual-FK shape: `templateDayId?` + `clientDayId?` + required `workoutId`, plus per-prescription fields `orderIndex`, `sets?`, `repsLow?`, `repsHigh?`, `durationSeconds?`, `restSeconds? @default(60)`, `weightKg?`, `notes?`. **Unlike `PlanDayMeal` this one has a DB-level XOR**: the CHECK constraint `PlanExercise_xor_day` (installed by `scripts/backfill-plan-exercises.ts`) enforces that exactly one of `templateDayId` / `clientDayId` is set. Indexes: `[templateDayId, orderIndex]`, `[clientDayId, orderIndex]`, `[workoutId]`. The seed (Phase 3) wires every plan-template training day with 4-8 PlanExercise rows.

**`DailyProgress`** holds per-day completion flags. `userId + clientPlanId + date` is the composite unique. Booleans: `workoutCompleted`, `breakfastCompleted`, `lunchCompleted`, `snackCompleted`, `dinnerCompleted`. Indexed `[userId, date]`. POST `/api/user/plan/progress` upserts these and side-effects on `MealLog` (creates `[Plan] ` prefixed logs when meal flags flip to true).

---

### `WeeklyTarget` (live rows: 24)

`userId` (cascade), `weekStartDate`, `metric` (one of `weight, belly, waist, chest, hips, arms, steps`), `targetValue`, `currentValue?` (server-enriched, not stored — actually it IS stored, but rarely updated; see `/api/admin/users/[id]/targets` POST which writes only the target, and `/api/user/targets` GET which computes currentValue at read time from latest measurements/steps). `isVisible`. Indexed `[userId, weekStartDate]`.

Coach-set in `/admin/users/[id]` Targets tab; user views read-only in `/hub/targets`.

---

### `LoginAttempt` (live rows: 61)

Rate-limit log shared between login and register flows. `email`, `ipAddress?`, `success`, `attemptedAt`. Indexed `[email, attemptedAt]` and `[ipAddress, attemptedAt]`. **Register attempts are stored as `email = "REGISTER:" + ip`** (see `src/lib/rate-limit.ts:107, 129`). Any login-analytics query must filter out `email LIKE 'REGISTER:%'`.

---

## 6. Auth & sessions

### Cookie + JWT mechanics

- Cookie name: `levelup_session` (defined in both `src/lib/auth.ts:23` and `src/middleware.ts:22`).
- Flags: `httpOnly`, `sameSite: lax`, `path: /`, `secure` when `NODE_ENV=production`.
- Token: HS256 JWT signed with `JWT_SECRET`. Payload: `{ userId, email, role, coachId }`. TTL 14 days, or 30 days when `rememberMe=true`. (`src/lib/auth.ts:46-51`.)
- Verification: `verifyToken(token)` returns the payload or `null` on any error. **No explicit error reporting** — just an opaque null.
- The same loader function is **duplicated** in `auth.ts` and `middleware.ts` because middleware can't import `next/headers`. If the secret length check or the format ever changes in one place, the other can drift silently. (Gotcha #2.)

### `getCurrentUser()` (`src/lib/auth.ts:102`)

```
read levelup_session cookie → if missing return null → else verifyToken(token)
```

This is the single read-path used by API routes. Every protected route either calls this directly or wraps it via `coach-scope`.

### `coach-scope.ts` helpers (`src/lib/coach-scope.ts`)

| Helper | Returns | Used by |
|---|---|---|
| `getCoachIdFromUser(user)` | `user.userId` for COACH; `user.coachId` for USER; `null` for SUPER_ADMIN. | Internal, called by `getCoachScope`. |
| `requireCoach()` | `{user, coachId} | null` — null if not authed OR role≠COACH. | Every `/api/admin/*` route. |
| `getCoachScope()` | `{user, coachId} | null` — null if not authed OR SUPER_ADMIN (no single tenant). | `/api/feed/*`, `/api/food-items`, `/api/recipes`. |
| `coachWhere(coachId)` | `{coachId}` literal. | Rarely used in practice (most routes inline `{coachId}`). |
| `withCoachId(data, coachId)` | `{...data, coachId}`. | Rarely used. |
| `requireSuperAdmin()` | `{user} | null`. | Every `/api/super-admin/*` route. |

### Middleware (`src/middleware.ts:44`)

```
matches /hub/:path*, /admin/:path*, /super-admin/:path*, /login
  decode JWT (silently ignore failure)
  /super-admin/* → require role==='SUPER_ADMIN', else redirect /login
  /hub/*         → require any authed user
  /admin/*       → require role==='COACH'
  /login (when authed) → redirect to /hub | /admin | /super-admin based on role
```

Middleware does **not** check `isActive`, `planStatus`, or `subscription.status` — it only checks the JWT payload. Stale users (account deactivated while session still valid) won't be ejected until `/api/auth/me` (or any DB-backed route) returns 401/403.

### Login flow (`/api/auth/login/route.ts`)

```
1. POST {email,password,rememberMe}
2. Rate-limit: 5 failed attempts per email per 15 min → 429 with Retry-After
3. prisma.user.findUnique({email:lowercased})
4. verifyPassword(password, user.passwordHash)
   ↳ if either fails: recordLoginAttempt(false); return 401
5. user.isActive? else 403
6. COACH path:
   a. user.isCoachActive? else 403 ("suspended")
   b. resolveSubscriptionStatus(billing.currentPeriodEnd, billing.billingStatus):
      - EXPIRED → 403
      - CANCELLED → 403
      - ACTIVE / GRACE → continue (grace banner surfaces via /api/auth/me)
7. USER path:
   a. planStatus === "PENDING"     → 403 "pending approval"
   b. planStatus === "CANCELLED|EXPIRED" → 403 "contact coach to renew"
   c. planStatus !== "ACTIVE"      → 403 generic
8. role === "ADMIN" rewritten to "COACH"
9. createToken; setSessionCookie; recordLoginAttempt(true); user.update lastLoginAt
10. return {success, user:{id,firstName,lastName,email,role}}
```

Coach name for the error-copy in step 7 is looked up from `SiteContent[contentKey="coach_name"]` for the user's coach (line 94-98 of the route), so the rejection message is branded (e.g. "Coach Sarah will review and activate your account within 24 hours of payment confirmation").

### Registration flow (`/api/auth/register/route.ts`)

- Public POST, invite-code required. Looks up coach by `inviteCode + role:"COACH" + isCoachActive:true` (`route.ts:65-68`). Returns 400 if the code is missing, expired, or belongs to an inactive coach.
- Password rules: ≥ 8 chars, must contain at least one letter and one digit (`route.ts:77-89`).
- Email uniqueness via `findUnique` on lowercase. Returns 409 on collision.
- Creates the user with `role:"USER"`, `coachId` from the looked-up coach, `unitPreference:"METRIC"`, `isActive:true`, `plan: plan || "HUB"`, `planStatus: planStatus || "PENDING"`. Health-profile fields are conditionally spread.
- **Does NOT create a session** — the message asks the user to wait for coach approval and upload payment proof via `/api/auth/payment-proof`.
- Rate-limit: 3 registrations per IP per hour, tracked via `LoginAttempt` rows with `email = "REGISTER:<ip>"`.
- Capacity warning: after creation, recounts active clients; if `>= maxClients`, creates a `system` notification for the coach with `actionUrl:"/admin/billing"`. Does **not** block registration over capacity.

### Payment proof (`/api/auth/payment-proof/route.ts`)

Public POST `{email, paymentScreenshot, paymentAccountName, paymentTransactionRef?}`. Validates the base64 screenshot via `validateBase64Upload` (5 MB, JPEG/PNG/WebP). Looks up user by email, sets the three payment fields. No auth — anyone with an email address can attach payment proof to that account. Mitigated by the coach reviewing before approval, but worth noting.

### Approval (`/api/admin/signup-requests/[id]/route.ts`)

PUT `{action: "approve" | "decline"}`. Coach-scoped. Sets `planStatus` to `ACTIVE` (approve) or `CANCELLED` (decline). No password emailed; the user already set one during registration.

---

## 7. Multi-tenant scoping

Tenant key is `coachId` on virtually every coach-owned table. The model is:

- **COACH:** their own `User.id` IS the `coachId` for all their content.
- **USER:** their `User.coachId` points to their assigned coach.
- **SUPER_ADMIN:** no single tenant scope — must use SUPER_ADMIN-only endpoints.

The scoping discipline is enforced **only at the API layer**, by always filtering by `coachId` derived from the session via `requireCoach()` / `getCoachScope()` and never trusting `coachId` from the request body. The DB does not enforce any tenant boundary.

### Audit summary (all 67 API routes)

Detailed per-route audit lives in §9. Below is just the headline list of **scoping issues found** during a sweep:

| Severity | Route | File | Issue |
|---|---|---|---|
| **High** | `PUT /api/meals/[id]` | `src/app/api/meals/[id]/route.ts:19` | Check is `meal.userId !== user.userId && user.role !== "COACH"`. Any COACH, regardless of tenant, can edit any MealLog by guessing its ID. Should also verify the meal's owner is one of the coach's clients. |
| **High** | `GET /api/user/dashboard` | `src/app/api/user/dashboard/route.ts:150` | `latestPosts` query has no `coachId` filter. A USER on coach A sees the 3 most recent posts from any coach's feed on their dashboard. |
| **Medium** | `POST /api/messages` | `src/app/api/messages/route.ts:87` | No cross-tenant guard on `receiverId`. Any authenticated user can DM any other user globally if they know the cuid (or rather, the UUID — cuids would be harder to enumerate). Side effect: `notifyAdmin` fires too. |
| **Medium** | `POST /api/admin/plans/[id]/days` and `POST /api/admin/plans/assign` (custom-day path) | resp. `[id]/days/route.ts`, `assign/route.ts` | `workoutId` / `recipeId` from the body are not verified to belong to the same coach before being written as FKs. A coach can construct a plan that references another coach's content. |
| **Medium** | `POST /api/admin/workouts` and `PUT /api/admin/workouts/[id]` | `workouts/route.ts:70`, `workouts/[id]/route.ts:80` | `subcategoryId` taken from body without verifying it belongs to the same coach. A coach can attach their workout to another coach's subcategory tree. |
| **Medium** | `GET /api/admin/content` | `src/app/api/admin/content/route.ts:30` | Uses `getCurrentUser()` + manual role check, then falls back to `where: coachId ? {coachId} : {}`. If `coachId` is null for any reason on a COACH (shouldn't happen, but the code allows it), returns all coaches' SiteContent. |
| **Medium** | `GET /api/admin/progress-overview` | `progress-overview/route.ts:51` | `prisma.clientPlan.findUnique({where:{id:u.activePlanId}})` has no tenant filter. Combined with `User.activePlanId` being a loose pointer (no Prisma `@relation`), a stale or malicious value could leak another coach's plan name into this coach's overview. Mitigated in practice because `activePlanId` is set by this app's own assign route. |
| **Low** | `POST /api/favourites`, `POST /api/favourites/workouts` | resp. `favourites/route.ts`, `favourites/workouts/route.ts` | No verification that the `recipeId`/`workoutId` belongs to the user's coach. Doesn't leak data (favourite is a join row), but allows arbitrary IDs. |
| **Low** | `GET /api/messages/[userId]` | `messages/[userId]/route.ts:5` | Doesn't verify the other party is the user's coach. Returns empty for non-conversations, so no real leak. |
| **Low** | `PUT /api/user/password` | `user/password/route.ts:5` | No rate-limit on the `currentPassword` check. Brute-forceable by session-cookie holders. |
| **Low** | `DELETE /api/user/account` | `user/account/route.ts:5` | No password re-confirmation. Soft-deletes with just a session cookie. |
| **Info** | `POST /api/feed` | `feed/route.ts:75` | Any authenticated user (not just COACH) can post to the tenant's feed. Probably intentional but worth flagging. |
| **Info** | Inconsistent billing math | `/super-admin/dashboard` and `/super-admin/coaches/[id]` use **total client count** for monthly revenue / `monthlyBill`; `/super-admin/billing` uses **active-and-billable** count. Numbers diverge between pages. |

Everything else is scoped correctly via `requireCoach()` / `getCoachScope()` / `requireSuperAdmin()` and explicit `coachId` filters on every DB read/write.

---

## 8. Subscription & billing

### State machine

`resolveSubscriptionStatus(periodEnd, billingStatus, now=Date)` in `src/lib/billing.ts:49-59`:

```
billingStatus === "CANCELLED"           → CANCELLED
else daysUntilExpiry >= 0               → ACTIVE
else daysUntilExpiry >= -7 (GRACE_DAYS) → GRACE
else                                    → EXPIRED
```

The only states **written to the DB** are `ACTIVE` and `CANCELLED` (via `billingStatus`). `GRACE` and `EXPIRED` are derived from `currentPeriodEnd` at read time. There is no scheduled job or cron flipping anyone — every admin action is manual.

### Transitions (driven by `PUT /api/super-admin/coaches/[id]`)

| Action | Body | Effect |
|---|---|---|
| Extend | `{action:"extend", days}` (1..365) | `currentPeriodEnd = max(currentPeriodEnd, now) + days`. Does **not** change `billingStatus`. |
| Renew | `{action:"renew"}` | `currentPeriodEnd = max(currentPeriodEnd, now) + 30d`, `billingStatus="ACTIVE"`. |
| Cancel | `{action:"cancelSubscription"}` | `billingStatus="CANCELLED"`. |
| Reactivate | `{action:"reactivateSubscription"}` | `billingStatus="ACTIVE"`, and if the period was expired, `currentPeriodEnd = now + 30d`. **Uses `update` not `upsert`** — will 500 if no billing row exists (inconsistent with the other action branches which return 400). |
| Seed defaults | `{action:"seedDefaults"}` | Pre-check: if `recipeCategory.count` for this coach > 0, return 409. Otherwise call `seedCoachDefaults(id)`. |
| Toggle active | `{isCoachActive:false}` | `user.update`; AND cascades `user.updateMany({where:{role:"USER",coachId:id}, data:{isActive:false}})`. Not wrapped in a transaction. |
| Adjust limits | `{basePriceMonthly?, extraClientPrice?, includedClients?, maxClients?}` | `coachBilling.upsert`. Hardcoded defaults if upserting fresh: `15000/3500/5/5`, `currentPeriodEnd: now + 30d`. |

Unknown actions silently fall through to the toggle/limits branches and return `{success:true}` with no mutation — bug.

### Monthly bill (`calculateMonthlyBill`)

```
extraClients = max(0, activeClientCount - includedClients)
return basePriceMonthly + extraClients * extraClientPrice
```

### Where it's recomputed

- **Every call to `/api/auth/me`** (`route.ts:31-49`). The admin layout fetches this on mount, so on every navigation that re-mounts the layout. Not cached.
- `/api/super-admin/billing` (table for SUPER_ADMIN).
- `/admin/page.tsx` server component (coach dashboard) — but uses a hardcoded `hubUsersCount * 79` instead of `calculateMonthlyBill` (Gotcha #5).

### What the user sees in each state

| State | COACH sees | USER sees |
|---|---|---|
| ACTIVE | No banner. `/admin/billing` shows status pill green. If `daysLeft ≤ 3 && ≥ 0`, blue "Your subscription renews in N days" banner across `/admin/*`. | No effect (this is the coach's subscription, not the user's). |
| GRACE | Amber banner across `/admin/*`: "Your subscription expired N days ago. You're in a 7-day grace period — M days left before your account is locked." Login still succeeds. `/admin/billing` shows yellow chip. | If the coach is GRACE the users can still log in — only EXPIRED/CANCELLED block the coach login flow. USER login itself is not affected. |
| EXPIRED | Coach login itself is blocked (`/api/auth/login` step 6b). Already-authenticated sessions can still navigate until the next `/api/auth/me` round-trip rejects them (none of the API gates check subscription status — see Gotcha #14). | Same — login still allowed (clients of an expired coach can still use the app, as long as their own `planStatus` is ACTIVE). |
| CANCELLED | Coach login blocked. | Same as EXPIRED for the user. |

USER-side subscription (`User.planStatus`) is the gate for client logins: PENDING / CANCELLED / EXPIRED all block.

---

## 9. API surface

67 `route.ts` files under `src/app/api/`. Detailed audit from a per-route sweep below.

### Auth (6 routes)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | public | Rate-limited (5/15 min/email). State machine described in §6. |
| POST | `/api/auth/logout` | public | Clears the cookie. |
| POST | `/api/auth/register` | public | Invite-code required. Rate-limited (3/hr/IP). |
| GET | `/api/auth/me` | authed | Returns user + (COACH only) subscription summary. Re-counts active clients per call. |
| POST | `/api/auth/payment-proof` | public | Validates base64 image, attaches to user by email. No auth gate. |
| GET | `/api/auth/validate-invite` | public | `?code=` query; returns `{valid, coachName}` or 404. Force-dynamic. |

### Admin — content (recipes, workouts, food-DB, plans)

| Method | Path | Scope check | Notes |
|---|---|---|---|
| GET | `/api/admin/recipes` | `requireCoach()` + `where:{coachId}` | Also returns categories+tags for UI. |
| POST | `/api/admin/recipes` | `requireCoach()` + `coachId` injected | 409 on slug collision. |
| GET | `/api/admin/recipes/[id]` | `requireCoach()` + `findFirst({coachId})` | |
| PUT | `/api/admin/recipes/[id]` | same | Updates + manages dietary-tag join rows. |
| DELETE | `/api/admin/recipes/[id]` | same | 409 with `linkedCount` if linked to a PlanDayMeal; `?force=true` drops those first. Manual cleanup of `RecipeDietaryTag` and `Favourite` rows. |
| GET / POST | `/api/admin/workouts` | `requireCoach()` | Phase 4: POST now accepts gifUrl/bodyPart/equipment/primaryMuscles. videoUrl is optional when gifUrl is present. `subcategoryId` ownership-verified against this coach (resolves gotcha #16 / #23). |
| GET / PUT / DELETE | `/api/admin/workouts/[id]` | `requireCoach()` + `findFirst({coachId})` | Phase 4: PUT is now a partial allowlisted update (publish-toggle from /admin/workouts can no longer clobber instructions/subcategoryId — resolves gotcha #38). subcategoryId ownership-verified. Accepts the four illustration fields. |
| GET | `/api/admin/workouts/categories` | `requireCoach()` | Filters both categories and subcategories by `coachId`. |
| GET / POST | `/api/admin/food-database` | `requireCoach()` | |
| GET / PUT / DELETE | `/api/admin/food-database/[id]` | `requireCoach()` + `findFirst({coachId})` | |
| GET / POST | `/api/admin/plans` | `requireCoach()` | POST has dual mode: create new template OR `duplicateId` to clone (with day+meal copying). |
| GET / PUT / DELETE | `/api/admin/plans/[id]` | `requireCoach()` + `findFirst({coachId})` | |
| GET / POST | `/api/admin/plans/[id]/days` | `requireCoach()` + template ownership + (Phase 5) per-FK ownership check for workoutId + recipeId | POST destructive: `deleteMany` template days (cascades to PlanExercise + PlanDayMeal), then bulk-insert. **Accepts `exercises[]` per day** with prescription fields; cross-coach FK check fixes gotcha #23. |
| GET | `/api/admin/exercise-library` | `requireCoach()` (Phase 4) | Coach-only proxy in front of the bundled Free Exercise DB. Query string: `?query=`, `?bodyPart=chest|...|cardio`, `?equipment=bodyweight|...|other`, `?level=beginner|intermediate|expert`, `?limit=` (max 200). Returns `{entries, total}` with absolute image URLs and FCMA-native bodyPart/equipment projections. Static JSON read in-memory — no DB hit. |
| POST | `/api/admin/plans/assign` | `requireCoach()` + user+template ownership | Copies template into ClientPlan/ClientPlanDay/PlanDayMeal, sets `user.activePlanId`, sends notification. |
| GET / POST | `/api/admin/assets` | `requireCoach()` | POST validates base64. |
| DELETE | `/api/admin/assets/[id]` | `requireCoach()` + ownership | |
| GET / PUT | `/api/admin/content` | `getCurrentUser()` + manual role check (slight scope gap if coachId is null) | PUT does upsert per key. Validates base64 for image-keyed entries. |

### Admin — users / progress / notifications

| Method | Path | Scope check | Notes |
|---|---|---|---|
| GET | `/api/admin/users` | `requireCoach()` + `where:{coachId, role:"USER"}` | |
| PUT | `/api/admin/users/[id]` | `requireCoach()` + `findFirst({coachId})` | Allows editing most user fields incl. health profile, planStatus, isActive, role, plan. |
| DELETE | `/api/admin/users/[id]` | `requireCoach()` + `findFirst({coachId})` + can't-self-delete | Cascade handles related data. |
| PUT | `/api/admin/users/[id]/password` | `requireCoach()` + ownership | min-8 char only. |
| PUT | `/api/admin/users/[id]/plan` | `requireCoach()` + ownership | active/paused/completed; on completed/paused, clears `user.activePlanId`; notifies user. |
| GET / POST | `/api/admin/users/[id]/targets` | `requireCoach()` + ownership | POST does deleteMany+create per metric; single notification if values changed. |
| GET | `/api/admin/signup-requests` | `requireCoach()` + `where:{coachId, role:"USER", paymentScreenshot:{not:null}}` | Returns full base64 screenshots — heavy. |
| PUT | `/api/admin/signup-requests/[id]` | `requireCoach()` + ownership | approve/decline. |
| POST / GET | `/api/admin/notifications` | `requireCoach()` | POST: targeted or broadcast (within tenant). GET: two-step query through `User.findMany`. |
| GET | `/api/admin/progress-overview` | `requireCoach()` | N+1 across all clients. **Inner clientPlan.findUnique lacks `coachId` filter** (mitigated). |
| POST / DELETE | `/api/admin/user-data` | `requireCoach()` + ownership re-verified per write | Creates MealLog/WeightLog/StepLog/BodyMeasurement, or deletes by record id. |
| DELETE | `/api/admin/meals/[id]` | `requireCoach()` + ownership via meal.userId → user | |

### Super-admin

| Method | Path | Notes |
|---|---|---|
| GET | `/api/super-admin/dashboard` | `requireSuperAdmin()`. Returns 4 counts + `monthlyRevenue` computed with **total client count** (mismatches `/billing`). |
| GET | `/api/super-admin/billing` | Returns per-coach table with active-and-billable counts via `user.groupBy`. |
| GET | `/api/super-admin/coaches` | Coaches + billing joined client-side. `clientCount` is total, not active. |
| POST | `/api/super-admin/coaches` | Creates User+CoachBilling+2 SiteContent rows+calls `seedCoachDefaults`. **No transaction.** Weak invite-code entropy. |
| GET | `/api/super-admin/coaches/[id]` | Coach detail. **Computes `monthlyBill` from only the first 20 clients** — undercounts. |
| PUT | `/api/super-admin/coaches/[id]` | Multi-branch (see §8). |

### Hub — user-facing CRUD

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET / POST / DELETE | `/api/meals` | `getCurrentUser()` | POST validates base64 imageData; fires notifyAdmin. |
| PUT / DELETE | `/api/meals/[id]` | `getCurrentUser()` + ownership (PUT has the COACH bypass bug). | |
| GET / POST | `/api/measurements` | `getCurrentUser()` | POST upserts (composite key). Validates base64. |
| DELETE | `/api/measurements/[id]` | `getCurrentUser()` + ownership | |
| GET / POST / DELETE | `/api/steps` | `getCurrentUser()` | DELETE takes `{loggedDate}` in body. |
| GET / POST | `/api/user/macro-targets` | `getCurrentUser()` | Upsert by userId. |
| GET | `/api/user/dashboard` | `getCurrentUser()` | **latestPosts lacks `coachId` filter (Gotcha)** — see §7. |
| GET | `/api/user/analytics` | `getCurrentUser()` | Heavy aggregator. |
| GET | `/api/user/plan` | `getCurrentUser()` | Returns current/selected day. **Phase 6:** now includes `today.exercises[]` with nested `workout {id, title, slug, gifUrl, videoUrl, bodyPart, equipment, primaryMuscles, description, instructions}` so the hub can render the illustrated multi-exercise day without per-exercise round-trips. |
| POST | `/api/user/plan/progress` | `getCurrentUser()` | Upserts DailyProgress; creates/deletes `[Plan]` MealLog rows; notifyAdmin on workout/full adherence. |
| GET | `/api/user/targets` | `getCurrentUser()` | Server-enriches `currentValue` from latest measurements/steps. |
| PUT | `/api/user/profile` | `getCurrentUser()` | Whitelist-edits only (no role/email/coachId etc.). |
| PUT | `/api/user/password` | `getCurrentUser()` | Min 8 chars; no rate limit. |
| DELETE | `/api/user/account` | `getCurrentUser()` | Soft delete (isActive=false), clears cookie. |

### Hub — content browsing

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/recipes` | `getCoachScope()` | `?search&category&tags&sort&page&limit`. Paginated (50 max/page). |
| GET | `/api/food-items` | `getCoachScope()` | `?search&category`. Capped at 50 results. |
| GET / POST | `/api/favourites` | `getCurrentUser()` | POST is toggle (returns `{favourited}`). |
| GET | `/api/favourites/recipes` | `getCurrentUser()` | Full recipe list. |
| GET / POST | `/api/favourites/workouts` | `getCurrentUser()` | Same toggle pattern. |

### Hub — feed

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/feed` | `getCoachScope()` | Tenant-scoped. |
| POST | `/api/feed` | `getCoachScope()` | Any user can post (not gated to COACH). |
| GET / DELETE | `/api/feed/[id]` | `getCoachScope()` | DELETE requires COACH. |
| POST | `/api/feed/[id]/like` | `getCoachScope()` | Toggle; notifyAdmin on like. |
| GET / POST / DELETE | `/api/feed/[id]/comments` | `getCoachScope()` | DELETE requires COACH. POST notifyAdmin. |

### Hub — messaging / reminders / notifications

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/messages` | `getCurrentUser()` | Conversations list. Non-COACH filtered to coach conversations only. |
| POST | `/api/messages` | `getCurrentUser()` | **No cross-tenant guard on receiverId** (Gotcha). |
| GET | `/api/messages/[userId]` | `getCurrentUser()` | Returns thread; marks received as read. |
| GET | `/api/messages/admin` | `getCurrentUser()` | Returns `{adminId, adminName}` resolved by session. |
| GET | `/api/notifications` | `getCurrentUser()` | `?count=true` returns just `{count}`. |
| PUT | `/api/notifications` | `getCurrentUser()` | `{all:true}` or `{ids:[]}`. |
| GET / PUT | `/api/reminders` | `getCurrentUser()` | Upsert by userId+type. |

### Public / utility

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/site-settings` | optional | `?coach=<inviteCode>` for marketing pages; else resolves from session. Force-dynamic. |
| GET | `/api/manifest` | optional | Per-coach PWA manifest. **Not actually used** — root layout links static `/manifest.json` (Gotcha). |
| GET | `/api/favicon` | optional | Returns coach favicon bytes if set, else 302 to `/images/logo.svg`. Cached 1h. |
| GET | `/api/apple-icon` | optional | Same pattern for apple-touch-icon. Cached 24h. |

---

## 10. Page-by-page tour

### Marketing (URL has no `/(marketing)/`)

| Route | File | Loads on mount | Mutations | Notes |
|---|---|---|---|---|
| `/` | `src/app/(marketing)/page.tsx` | nothing | nothing | Just `redirect("/login")`. |
| `/login` | `src/app/(marketing)/login/page.tsx` | uses `useBranding()` | POST `/api/auth/login` | Redirects by role on success. Legacy `ADMIN` recognized. |
| `/checkout` | `src/app/(marketing)/checkout/page.tsx` | InviteGate calls GET `/api/auth/validate-invite?code=`; nested `BrandingProvider` triggers GET `/api/site-settings?coach=` | POST `/api/auth/register`, POST `/api/auth/payment-proof` | 3-step flow (account → health → payment) + success. Wrapped in `<Suspense>` because of `useSearchParams`. Hard-navigates after invite-gate (Turbopack/N16 quirk explained inline). |
| `/forgot-password` | `…/forgot-password/page.tsx` | nothing | **No API call yet** — just sets `submitted` locally. | Stub. |
| `/reset-password` | `…/reset-password/page.tsx` | nothing | Same — stub. | Validates pw client-side. |
| `/privacy-policy` | `…/privacy-policy/page.tsx` | Server: `prisma.siteContent.findFirst({contentKey:"site_name"})` | none | Static text interpolating site name. Server component. |
| `/terms` | `…/terms/page.tsx` | Server: same | none | Mirror of privacy. |
| 404 | `(marketing)/not-found.tsx` | nothing | none | "View The Hub" button links to `/nutrition` which doesn't exist (Gotcha #19). |

### Hub (`/hub/*`)

Layout (`src/app/hub/layout.tsx`) wraps everything in `BrandingProvider`, fetches `/api/auth/me` via `fetchWithRetry` for the sidebar profile chip, mounts `NotificationBell` (polls `/api/notifications?count=true` every 30s) and `InstallPrompt`.

| Route | File | Loads on mount | Mutations | Notes |
|---|---|---|---|---|
| `/hub` | `page.tsx` | parallel `fetchWithRetry`: GET `/api/user/dashboard?range=today`, GET `/api/user/plan`, GET `/api/user/targets` | POST `/api/user/plan/progress` (workout checkbox) | Dashboard widget grid. |
| `/hub/calculator` | `calculator/page.tsx` | GET `/api/auth/me` (pre-fill profile) | POST `/api/user/macro-targets` ("Save to My Profile") | BMR/TDEE + macro split (Mifflin-St Jeor or Katch-McArdle). Local DonutChart. |
| `/hub/favourites` | `favourites/page.tsx` | GET `/api/favourites/recipes` | none | Favouriting itself happens via `FavouriteButton`. |
| `/hub/feed` | `feed/page.tsx` | `fetchWithRetry` GET `/api/feed` | POST `/api/feed`, POST `/api/feed/:id/like`, GET `/api/feed/:id/comments` (lazy), POST `/api/feed/:id/comments` | Comments expand inline; videos via `parseVideoUrl`+`VideoEmbed`. |
| `/hub/food-chart` | `food-chart/page.tsx` | GET `/api/food-items?category=&search=` (refetches on filter change) | none | Hardcoded category pills. |
| `/hub/health-profile` | `health-profile/page.tsx` | `fetchWithRetry` GET `/api/auth/me` | none | Read-only; copy says "managed by your coach" though `/hub/settings` does in fact let users edit health fields server-side (settings UI for these is currently dead code — Gotcha #10). |
| `/hub/messages` | `messages/page.tsx` | GET `/api/messages` → GET `/api/messages/admin` (fallback) → GET `/api/messages/:adminId` (polled every 5s) | POST `/api/messages` (text + optional base64 image) | 5-sec poll; full-screen image viewer. |
| `/hub/my-meals` | `my-meals/page.tsx` | `fetchWithRetry` GET `/api/meals?date=` (refetches on date change) | PUT `/api/meals/:id`, DELETE `/api/meals/:id` | Edit modal; `[Plan]` prefix → PLAN badge, otherwise OFF badge. |
| `/hub/my-plan` | `my-plan/page.tsx` | `fetchWithRetry` GET `/api/user/plan` + `/api/user/targets`; on date change GET `/api/user/plan?date=`; off-plan search GET `/api/food-items?search=` (debounced 300ms) | POST `/api/user/plan/progress` (manual workoutCompleted toggle; auto-fired when all set-buttons are ticked), POST `/api/meals` (off-plan logging) | Biggest page (~900 lines); empty-state if no plan; past/future days view-only. **Phase 6:** when the day has `exercises[]`, renders an illustrated card per exercise with gif preview, "N × A-B reps · rest s" prescription line, and per-set toggle buttons. Set-state is ephemeral per spec §9 — once all sets across all exercises are ticked, the existing `workoutCompleted` flag auto-flips true. Legacy single-workout view is the fallback. |
| `/hub/notifications` | `notifications/page.tsx` | GET `/api/notifications` | PUT `/api/notifications` (`{ids:[id]}` per row, `{all:true}` button) | Optimistic mark-read; clicks navigate to `actionUrl`. |
| `/hub/progress` | `progress/page.tsx` | `fetchWithRetry` GET `/api/measurements` | POST `/api/measurements`, DELETE `/api/measurements/:id` | Local SVG `MetricChart`; `TimeRangeFilter`. |
| `/hub/recipes` | `recipes/page.tsx` (server) + `RecipeBrowser.tsx` (client) | Server: Prisma direct (Recipe/Category/Tag by coachId). Client: GET `/api/favourites`. | Heart via `FavouriteButton`. | Force-dynamic; retries once; uses `<RetryError>`. |
| `/hub/recipes/[slug]` | `[slug]/page.tsx` | Server: Prisma findFirst(slug,coachId)+favourite check | via `FavouriteButton` | `notFound()` on miss. |
| `/hub/settings` | `settings/page.tsx` | GET `/api/auth/me` | PUT `/api/user/profile`, PUT `/api/user/password`, DELETE `/api/user/account` → POST `/api/auth/logout` → `/` | Health-profile state defined but **never rendered** (dead code). `RemindersCard` mounted at bottom. |
| `/hub/steps` | `steps/page.tsx` | `fetchWithRetry` GET `/api/steps?range=`; GET `/api/user/targets` | POST `/api/steps`, DELETE `/api/steps` (body `{loggedDate}`) | Local `CircularProgress` + `StepBarChart`. |
| `/hub/targets` | `targets/page.tsx` | `fetchWithRetry` GET `/api/user/targets` | none | Local `CenteredGauge`; metrics: weight/belly/waist/chest/hips/arms/steps. |
| `/hub/workouts` | `workouts/page.tsx` (server) + `WorkoutsBrowser.tsx` (client) | Server: Prisma workout+categories by coachId | none | Sidebar filters (search/cat/subcat/difficulty/goal). No pagination. **Phase 6:** cards now show the `gifUrl` as the primary thumbnail (falls back to `VideoThumbnail` if missing) and add bodyPart/equipment badges + primary-muscles line. |
| `/hub/workouts/[slug]` | `[slug]/page.tsx` | Server: Prisma findFirst+3 related workouts | none | `notFound()` on miss. **Phase 6:** new side-by-side layout when both gif and video are present (illustration left, video right); bodyPart/equipment badges and primary-muscles line in the header. |

### Admin (`/admin/*`)

Layout (`src/app/admin/layout.tsx`) wraps in `BrandingProvider`, fetches `/api/auth/me` for subscription summary, shows GRACE / "renews soon" banners.

| Route | File | Loads on mount | Mutations | Notes |
|---|---|---|---|---|
| `/admin` | `page.tsx` server + `AdminDashboardClient.tsx` | Prisma direct: user/recipe/mealLog/post counts, billing, recent users | none | Capacity banner if `activeClients >= maxClients`. Revenue hardcoded `count * 79` (Gotcha #5). |
| `/admin/assets` | `assets/page.tsx` | GET `/api/admin/assets` | POST `/api/admin/assets` (file picker), DELETE `/api/admin/assets/[id]` | Grid; Copy URL writes data URL to clipboard. |
| `/admin/billing` | `billing/page.tsx` | GET `/api/auth/me` | none | Read-only summary; says to contact administrator. |
| `/admin/branding` | `branding/page.tsx` | GET `/api/site-settings`, GET `/api/auth/me` | PUT `/api/admin/content` (one call for text fields, then one per image entry) | Client-side image compression via canvas to 256/64/192/512 max, JPEG 0.8. |
| `/admin/content` | `content/page.tsx` | GET `/api/admin/content` | PUT `/api/admin/content` per section save | Collapsible sections; logo upload rejects > 500 KB. Booleans stored as "true"/"false" strings. |
| `/admin/feed` | `feed/page.tsx` | GET `/api/feed` | POST `/api/feed`, DELETE `/api/feed/[id]`, POST `/api/feed/[id]/comments`, DELETE `/api/feed/[id]/comments?commentId=` | Composer supports text + YouTube/IG/TT/FB URL + image (5MB). Likers reveal dropdown. |
| `/admin/food-database` | `food-database/page.tsx` | GET `/api/admin/food-database` | POST + PUT + DELETE on `/api/admin/food-database[/:id]` | Modal for add/edit; 11 hardcoded categories. |
| `/admin/messages` | `messages/page.tsx` | GET `/api/messages` (polled 5s); on convo select GET `/api/messages/[userId]` (also polled 5s); user search GET `/api/admin/users` | POST `/api/messages` | Two parallel `setInterval(5000)` pollers. New chat user search. |
| `/admin/notifications` | `notifications/page.tsx` | GET `/api/admin/notifications`; on user search GET `/api/admin/users?search=` (debounced 300ms) | POST `/api/admin/notifications` | Types: admin_alert/achievement/system/meal_reminder. |
| `/admin/plans` | `plans/page.tsx` server + `AdminPlansClient.tsx` client | Prisma direct | POST `/api/admin/plans` (duplicate), DELETE `/api/admin/plans/[id]` | Then `router.refresh()`. |
| `/admin/plans/new` | `plans/new/page.tsx` | nothing | POST `/api/admin/plans` then `router.push(.../edit)` | Defaults: type=combined, weeks=4. |
| `/admin/plans/[id]/edit` | `plans/[id]/edit/page.tsx` | parallel GET `/api/admin/plans/[id]` + GET `/api/admin/workouts` + GET `/api/admin/recipes` | POST `/api/admin/plans/[id]/days` (Save All Days — now includes `exercises[]` per day), PUT `/api/admin/plans/[id]` (onBlur name/type/weeks) | 7-day grid editor with cell modal, "Copy to..." day cloning, per-week "Copy to all weeks". Local Map cache until Save All Days. **Phase 5:** cell modal now has an "Exercises" section above the legacy workout dropdown: each exercise card has a gif preview, up/down/× reorder controls, and 4-column inline inputs for sets/repsLow/repsHigh/restSeconds/durationSeconds/weightKg/notes. "+ Add exercise" opens the new `WorkoutPickerModal` (sources from the coach's own workouts). Legacy `workoutId` dropdown is rendered only when `exercises.length === 0` for back-compat. |
| `/admin/recipes` | `recipes/page.tsx` server + `AdminRecipeList.tsx` client | Prisma direct | PUT `/api/admin/recipes/[id]` (publish toggle), DELETE `/api/admin/recipes/[id]` (+ retry with `?force=true` on 409), GET `/api/admin/recipes/[id]` (Preview) | Uses `PreviewModal`. |
| `/admin/recipes/new` | `recipes/new/page.tsx` | GET `/api/admin/recipes` (for categories+tags) | POST `/api/admin/recipes` | 18 useState fields; slug auto-generates from title until manually edited. |
| `/admin/recipes/[id]/edit` | `recipes/[id]/edit/page.tsx` | parallel GET `/api/admin/recipes` + GET `/api/admin/recipes/[id]` | PUT `/api/admin/recipes/[id]` | `use(params)` (React 19); "Preview as User" button → PreviewModal. |
| `/admin/signup-requests` | `signup-requests/page.tsx` | GET `/api/admin/signup-requests` | PUT `/api/admin/signup-requests/[id]` | Tabs (All/Pending/Approved/Declined). |
| `/admin/users` | `users/page.tsx` server + `UsersAdmin.tsx` client | Prisma direct | PUT `/api/admin/users/[id]` (Suspend/Activate), DELETE `/api/admin/users/[id]` (two confirms) | Whole card is a Link; action buttons `e.preventDefault()`. |
| `/admin/users/[id]` | `users/[id]/page.tsx` server + `UserDetailClient.tsx` client | Many Prisma reads server-side incl. user (with mealLogs, weightLogs, macroTarget, favourites, stepLogs, bodyMeasurements), unread count, recent messages, plan templates, active plan with days+meals+progress, weekly targets enriched | POST `/api/admin/notifications`, POST `/api/messages`, DELETE `/api/admin/meals/[id]`, DELETE `/api/admin/user-data?type=&id=&userId=`, PUT `/api/admin/users/[id]`, POST/DELETE `/api/admin/users/[id]/plan`, POST `/api/admin/users/[id]/targets` | 8 tabs (Overview/Meals/Steps/Body/Messages/Plans/Targets/Analytics); sticky tab bar on desktop, mobile card grid. |
| `/admin/workouts` | `workouts/page.tsx` server + `AdminWorkoutsClient.tsx` client | Prisma direct | PUT `/api/admin/workouts/[id]` (publish toggle — **sends whole workout with `instructions:[]` and `subcategoryId:0`, risk of clobbering** — see Gotcha #21), DELETE `/api/admin/workouts/[id]`, GET `/api/admin/workouts/[id]` | Preview via `PreviewModal`. |
| `/admin/workouts/new` | `workouts/new/page.tsx` | GET `/api/admin/workouts/categories` | POST `/api/admin/workouts` | `targetGoal === "All"` sent as null. **Phase 4:** "Choose illustration" card at the top opens `IllustrationPicker` against the Free Exercise DB; picking auto-fills title/slug/description/instructions and stamps gifUrl/bodyPart/equipment/primaryMuscles. Video URL becomes optional once an illustration is picked. |
| `/admin/workouts/[id]/edit` | `workouts/[id]/edit/page.tsx` | parallel GET `/api/admin/workouts/[id]` + categories | PUT `/api/admin/workouts/[id]` | `use(params)`. **Phase 4:** same Illustration card as the new-page; existing gif/metadata loads from the workout's saved fields. |
| `/admin/newsletter` | (no `page.tsx`) | — | — | Folder exists, page missing — orphan. |

### Super-admin (`/super-admin/*`)

Layout (`src/app/super-admin/layout.tsx`) is plain — no `BrandingProvider` (the platform owner sees the FCMA brand). No subscription banners.

| Route | File | Loads on mount | Mutations | Notes |
|---|---|---|---|---|
| `/super-admin` | `page.tsx` | GET `/api/super-admin/dashboard` | none | Stat grid + revenue card. Revenue uses total clients, not active (Gotcha). |
| `/super-admin/billing` | `billing/page.tsx` | GET `/api/super-admin/billing` | none | Rows link to `/super-admin/coaches/[id]`. |
| `/super-admin/coaches` | `coaches/page.tsx` | GET `/api/super-admin/coaches` | PUT `/api/super-admin/coaches/[id]` (`{isCoachActive: !current}`) | |
| `/super-admin/coaches/new` | `coaches/new/page.tsx` | nothing | POST `/api/super-admin/coaches` | Defaults: 15000 base / 5 included / 5 max / 3500 extra. Success reveals invite code. |
| `/super-admin/coaches/[id]` | `coaches/[id]/page.tsx` | GET `/api/super-admin/coaches/[id]` | All on `PUT /api/super-admin/coaches/[id]` (extend/renew/cancel/reactivate/seedDefaults/isCoachActive/plan-limits/grant-clients) | Save Plan button disabled unless any field changed. |

---

## 11. Lib modules

`src/lib/` is the kitchen junk drawer — auth, billing, DB, validation, branding, and seed-defaults all live here. Every non-trivial helper has a colocated `*.test.ts` (Vitest, 102 unit tests total).

| File | Exports | Used by |
|---|---|---|
| `auth.ts` | `JWTPayload` (type), `hashPassword`, `verifyPassword`, `createToken`, `verifyToken`, `setSessionCookie`, `getSessionCookie`, `clearSessionCookie`, `getCurrentUser`, plus internal `loadJwtSecret` and `COOKIE_NAME`. | Every API route that gates by session; admin user routes for password update; payment-proof; auth/login + register + me + logout. |
| `auth.test.ts` | 17 unit tests (covers hashing, JWT round-trip, cookie set/clear, currentUser nulls). | — |
| `billing.ts` | `calculateMonthlyBill`, `addDays`, `daysUntilExpiry`, `GRACE_DAYS = 7`, `resolveSubscriptionStatus`, `SubscriptionStatus` (type). | `/api/auth/login`, `/api/auth/me`, `/api/super-admin/billing`, `/api/super-admin/coaches/[id]`. |
| `billing.test.ts` | 28 unit tests. | — |
| `branding.tsx` | `BrandingProvider`, `useBranding` (context with `siteName`, `coachName`, `logoUrl`, `faviconUrl`, `loading`). | `/admin/layout.tsx`, `/hub/layout.tsx`, `/checkout` (nested with `coachCode`). |
| `coach-scope.ts` | `getCoachIdFromUser`, `requireCoach`, `getCoachScope`, `coachWhere`, `withCoachId`, `requireSuperAdmin`. | Almost every API route — see §9. |
| `coach-scope.test.ts` | 19 unit tests. | — |
| `db.ts` | `getDb`, `prisma` (a `Proxy` over lazy `getDb`). Singleton pool, max 3 connections, idle timeout 10 s. | Every Prisma call site. |
| `fetch-retry.ts` | `fetchWithRetry(url, options?, retries=3)`. 15s timeout per attempt, exponential backoff, 30s on final attempt. Returns on `res.ok || res.status < 500`. | Hub layout, dashboard, my-plan, my-meals, progress, steps, targets, health-profile, feed. Admin layout uses plain `fetch` (inconsistency — Gotcha #7). |
| `fetch-retry.test.ts` | 8 unit tests. | — |
| `notifications.ts` | `createNotification(userId,title,message,type?,actionUrl?)`, `getAdminUserId()` (returns first COACH user — **legacy single-tenant**), `notifyAdmin(title,message,type?,actionUrl?)`. | Many user-side writes call `notifyAdmin` server-side. **Cross-tenant correctness depends on this helper resolving the right coach** — currently it just picks the first COACH in the DB, which is broken in multi-tenant (Gotcha #20). |
| `rate-limit.ts` | `LOGIN_RATE_LIMIT_CONFIG`, `REGISTER_RATE_LIMIT_CONFIG`, `RateLimitResult` (interface), `checkLoginRateLimit`, `recordLoginAttempt`, `checkRegisterRateLimit`, `recordRegisterAttempt`, `getClientIp`. | `/api/auth/login`, `/api/auth/register`. |
| `rate-limit.test.ts` | unit tests | — |
| `seed-coach-defaults.ts` | `seedCoachDefaults(coachId)`. Phase 3 rewrite: seeds taxonomies (10 RecipeCategories + 12 DietaryTags + 5 WorkoutCategories + 28 WorkoutSubcategories + 85+ FoodItems) **plus 50 Recipes, 50 Workouts (with gif illustrations from the Free Exercise DB), 6 PlanTemplates fully wired with PlanTemplateDay + PlanExercise + PlanDayMeal rows**. Idempotent — re-running fills missing rows. Returns `{recipeCount, workoutCount, planCount}`. | `/api/super-admin/coaches` POST; `/api/super-admin/coaches/[id]` PUT action=`seedDefaults`; `scripts/backfill-coach-defaults.ts`; `scripts/backfill-coach-seed-content.ts` (Phase 3, manual opt-in for existing coaches). |
| `seed/recipes.ts` | `SEED_RECIPES` — 50 curated recipe definitions (12 breakfast / 15 lunch / 15 dinner / 8 snacks, ~60 % Pakistani regional). | `seed-coach-defaults.ts`, `seed-data.test.ts`. |
| `seed/workout-picks.ts` | `WORKOUT_PICKS` — 50 library-id picks with optional bodyPart/equipment/difficulty overrides. Body-part distribution matches spec §6 exactly. | `seed-coach-defaults.ts`, `seed/plans.ts` (cross-validation), `seed-data.test.ts`. |
| `seed/plans.ts` | `SEED_PLANS` (6 plan definitions: Beginner Fat Loss 4w/3d, Intermediate Fat Loss 8w/4d, Beginner Muscle Gain 8w/3d, Intermediate Muscle Gain 12w/4d, Home Workout No Equipment 4w/5d, Maintenance/Recomp 4w/3d). Self-validating on module load: every plan day has 4-8 exercises and every workoutSlug + recipeSlug resolves. | `seed-coach-defaults.ts`, `seed-data.test.ts`. |
| `exercise-library.ts` | `LIBRARY_SIZE`, `searchExerciseLibrary({query, bodyPart, equipment, level, limit})`, `getExerciseLibraryEntry(id)`, `getAllExerciseLibraryEntries()`, `deriveAppBodyPart`, `deriveAppEquipment`, `resolveImageUrl`, `AppBodyPart` / `AppEquipment` types. Reads from bundled `src/data/exercise-library.json` (Free Exercise DB, MIT, 873 entries, ~1 MB). | `seed-coach-defaults.ts`, `/api/admin/exercise-library` route, `IllustrationPicker` component (via the API), `seed/workout-picks.ts` (cross-validation), `exercise-library.test.ts`. |
| `upload-validation.ts` | `MAX_UPLOAD_SIZE_MB`, `ValidateUploadResult` (interface), `validateBase64Upload(input, explicitMimeType?)`. Max 5 MB decoded, MIME whitelist: JPEG/PNG/WebP. | `/api/admin/assets` POST, `/api/admin/content` PUT (image keys), `/api/auth/payment-proof` POST, `/api/meals` POST, `/api/measurements` POST. **Not** called from `/api/messages` POST or anywhere assets are written via SiteContent text fields. |
| `upload-validation.test.ts` | unit tests | — |
| `video.ts` | `VideoPlatform` (type), `VideoInfo` (interface), `parseVideoUrl`, `extractYouTubeId`, `getPlatformLabel`. Handles YouTube (incl. shorts), Instagram reels/posts, TikTok (full + short URLs), Facebook reels/watch/fb.watch. | `VideoEmbed`, `VideoThumbnail` components. |
| `video.test.ts` | 25 unit tests. | — |

---

## 12. Components

`src/components/` contains 29 files. **15 of the 28 UI components have zero consumers** — they're leftover marketing-template scaffolding from before the product pivoted to a login-only public surface. Detailed audit:

### Used components (14)

| File | Purpose | Props (informal) | Used by |
|---|---|---|---|
| `InstallPrompt.tsx` | PWA install CTA; captures `beforeinstallprompt`, shows iOS instruction modal, hides when in standalone mode. | none | Admin + hub layouts (4 mount points total). |
| `admin/PreviewModal.tsx` | "Preview as user" modal for workouts/recipes. | `{type, data, onClose}` | Admin workout/recipe list + edit pages. |
| `admin/IllustrationPicker.tsx` (Phase 4) | Modal that searches the Free Exercise DB and one-clicks the selection back to the caller. Lazy-loads results via `/api/admin/exercise-library`. | `{open, onClose, onSelect, initialQuery?, initialBodyPart?, initialEquipment?}` | `/admin/workouts/new`, `/admin/workouts/[id]/edit`. |
| `admin/WorkoutPickerModal.tsx` (Phase 5) | Modal listing the coach's existing `Workout` rows (with gif thumbs) — used for picking exercises into a plan-template day. | `{open, onClose, onSelect, workouts}` | `/admin/plans/[id]/edit`. |
| `hub/RemindersCard.tsx` | Daily reminders UI; GET/PUT `/api/reminders`. | none | `/hub/settings`. |
| `layout/Footer.tsx` | Marketing footer. Server component; resolves coach via `getCurrentUser` then queries SiteContent for socials/branding. Anonymous visitors skip the DB. | none | `(marketing)/layout.tsx`. |
| `layout/Header.tsx` | Marketing header. Client component; fetches `/api/auth/me`, uses `useBranding()`, embeds `NotificationBell`. | none | `(marketing)/layout.tsx`. |
| `ui/BarChart.tsx` | SVG bar chart with target line + hover tooltip. | `{data, targetValue?, color, colorMode?, unit, height?, emptyText?, targetLabel?}` | `/admin/users/[id]` analytics. |
| `ui/Button.tsx` | Variant-style button or `<Link>` if `href`. | `{variant?, href?, className?, children, onClick?, type?, fullWidth?}` | `/hub/settings`, all marketing pages. |
| `ui/FavouriteButton.tsx` | Heart toggle, POSTs `/api/favourites` with optimistic update. | `{type:"recipe", itemId, initialFavourited?, className?}` | `/hub/recipes` browser + detail. The `type` prop is accepted but unused inside (it's always called with `"recipe"`). |
| `ui/NotificationBell.tsx` | Bell with unread badge. Polls `/api/notifications?count=true` every 30 s; on open GET `/api/notifications`. `panelMode:"sidebar"` for full-height drawer. | `{panelMode?}` | Marketing header + admin layout + hub layout. |
| `ui/PasswordInput.tsx` | Show/hide password input. | `{value, onChange, placeholder?, id?, required?, className?}` | `/hub/settings`, login, checkout, reset-password. |
| `ui/RetryError.tsx` | Auto-retries once via `window.location.reload()` (per-path token in sessionStorage), then shows Try Again. | `{message?}` | `/hub/workouts`, `/hub/recipes`. |
| `ui/TimeRangeFilter.tsx` | Segmented control for date ranges. | `{value, onChange, options?}` | `/admin/users/[id]`, `/hub/steps`, `/hub/progress`. |
| `ui/VideoEmbed.tsx` | Universal video embed; auto-picks 9:16 vs 16:9. | `{url, className?}` | `PreviewModal`, `/hub/workouts/[slug]`, `/hub/recipes/[slug]`, `/admin/feed`, `/hub/feed`. |
| `ui/VideoThumbnail.tsx` | Grid thumbnail with platform overlay. | `{url, className?, height?}` | `/admin/workouts` list, `/hub/workouts/[slug]`, `/hub/workouts` browser. |

### Orphans (15) — safe to delete

`admin/ChangePasswordModal.tsx`, `ui/CTASection.tsx`, `ui/Carousel.tsx`, `ui/CountdownTimer.tsx`, `ui/FAQAccordion.tsx`, `ui/FeatureItem.tsx`, `ui/PhoneMockup.tsx` (also uses `dangerouslySetInnerHTML` — would be an XSS risk if ever reintroduced with user input), `ui/PlaceholderImage.tsx`, `ui/PricingBox.tsx`, `ui/Section.tsx`, `ui/SocialIcons.tsx`, `ui/StatsBar.tsx`, `ui/StepCard.tsx`, `ui/TransformationCard.tsx`, `ui/WhyCard.tsx`.

The folder `src/components/marketing/` is empty.

---

## 13. PWA & service worker

### Service worker — `public/sw.js` (37 lines)

```
cache name:  fcma-v1
precache:    /offline.html, /icon-192.png, /icon-512.png
install:     opens cache, precaches → skipWaiting()
activate:    deletes all caches whose name !== fcma-v1, clients.claim()
fetch:       only intercepts mode==='navigate'; tries network, falls back to /offline.html
```

Notes:
- No caching of API or asset responses — the SW is purely an offline-fallback shim for navigations.
- Registered inline in the root layout via `dangerouslySetInnerHTML` (`src/app/layout.tsx:30`) inside an `if('serviceWorker' in navigator)` + `addEventListener('load')` wrapper.
- **Registered at scope `/`** — caches across all three sub-apps including `/super-admin`. That's the documented behaviour (CLAUDE.md gotcha) but it does mean a SUPER_ADMIN running the app offline will see the same offline.html as USERs.
- Cache busting: when you change cached assets, you must bump `CACHE_NAME` to `fcma-v2`.

### Manifest

There are **two** manifest sources in the codebase:

1. **Static** — `public/manifest.json` (40 lines). Has `id:"/hub"`, name `"FCMA — Fitness Coach"`, four icon entries (192/512 each in `any` and `maskable`).
2. **Dynamic** — `GET /api/manifest` (`src/app/api/manifest/route.ts`). Per-coach: resolves coachId from session (anonymous gets static fallback), loads `site_name + pwa_icon_192 + pwa_icon_512` from SiteContent, builds a manifest with the coach's icons (purpose `"any maskable"`) and the coach's site name. `Cache-Control: public, max-age=3600`.

**The root layout (`src/app/layout.tsx:19`) links the STATIC `/manifest.json`, not the dynamic `/api/manifest`.** The dynamic route is dead code unless someone wires it up (Gotcha #1). A user installing the PWA gets the generic FCMA name/icon regardless of which coach they're with.

The apple-touch-icon link (`src/app/layout.tsx:24`) points to `/api/apple-icon`, which IS dynamic — so the iOS home-screen icon is per-coach, but the PWA manifest itself isn't.

### Install prompt — `src/components/InstallPrompt.tsx`

- Checks `display-mode: standalone` on mount; if already installed, renders nothing.
- Captures `beforeinstallprompt` (Android/Chrome) and stores the event.
- Detects iPhone/iPad/iPod via UA sniff.
- Renders "Install App" button only when either: deferred prompt exists, OR running on iOS.
- Android: calls `deferredPrompt.prompt()` then awaits userChoice.
- iOS: opens a modal with Safari Share → Add to Home Screen → Add instructions.

Mounted in the admin sidebar (desktop + mobile drawer) and hub sidebar (desktop + mobile drawer) — four call sites total.

### Offline page — `public/offline.html`

Inline-styled HTML with retry button. Shown only on failed navigation requests (per the SW fetch handler). Sub-resource failures use the browser default.

---

## 14. Branding & theming

### Where branding values live

`SiteContent` rows keyed by `coachId`. The keys read by the branding pipeline:

| Key | Type | Set in | Read in |
|---|---|---|---|
| `site_name` | text | `/admin/branding` | `useBranding()`, footer, header, manifest, marketing privacy/terms |
| `coach_name` | text | `/admin/branding` | `useBranding()`, login error copy, register flow, validate-invite |
| `site_logo` | base64 image (compressed to 256px JPEG @ 0.8 client-side) | `/admin/branding` (also `/admin/content`) | `useBranding()` (logoUrl) |
| `site_favicon` | base64 image | `/admin/branding` | `useBranding()` (faviconUrl) + `/api/favicon` |
| `pwa_icon_192`, `pwa_icon_512` | base64 image | `/admin/branding` | `/api/manifest` (currently unused — Gotcha #1), `/api/apple-icon` |
| `hero_*`, `hub_price`, `hub_old_price`, `youtube/instagram/facebook/tiktok_url + _visible`, `transformations_visible`, `countdown_visible`, `about_heading`, `about_bio` | mixed | `/admin/content` | Footer (socials), no other consumer present in the current code (marketing pages were removed/never rendered these). |

Asset library (`/admin/assets`) is **separate** — it stores files in the `Asset` table for general purpose (PDFs/videos/etc.); branding-specific images go in `SiteContent`.

### `BrandingProvider` (`src/lib/branding.tsx`)

Client-side context. Two effects:

1. On mount, fetches `/api/site-settings` (with `?coach=<inviteCode>` if `coachCode` prop supplied; else falls back to whatever the session implies). Spreads response into state: siteName, coachName, logoUrl, faviconUrl.
2. After loading, replaces `<link rel="icon">` with `/api/favicon` if a custom favicon is set; otherwise leaves the default `/images/logo.svg`.

Default state on first render is `{siteName:"FCMA", coachName:"FCMA", logoUrl:"/images/logo.svg", faviconUrl:"/images/logo.svg", loading:true}` — hence the documented FOUC: until the API call returns, every coach's portal briefly shows "FCMA". (Gotcha #4.)

### Marketing layout's `force-dynamic`

`src/app/(marketing)/layout.tsx:1` sets `export const dynamic = "force-dynamic"`. This is because `Footer` is a server component that calls `getCurrentUser()` → reads cookies → has to be a per-request render. Without `force-dynamic`, Next.js would try to statically generate it and fail at build time on `cookies()` usage.

### Color palette (CSS variables / Tailwind utilities)

No `tailwind.config.{js,ts}` — Tailwind v4 is PostCSS-only, with theme variables defined inline in `src/app/globals.css`. Common hex values seen across the codebase:

- Backgrounds: `#0A0A0A` (sidebars, html theme color), `#111111` (main content), `#1E1E1E` (cards/modals), `#1A1A1A` (borders), `#2A2A2A` (borders).
- Accent red: `#E51A1A` (CTA buttons, active sidebar pill).
- Accent orange: `#FF6B00`.
- Accent yellow: `#FFB800`.
- Manifest `theme_color` / `background_color`: `#0A0A0A`.

---

## 15. Scripts

`scripts/*.ts` — 8 files, all one-off. None are wired into `package.json`. All use the `pg` driver directly (not Prisma) except `backfill-coach-defaults.ts`, all read `DIRECT_URL` via `dotenv/config`. Detailed status:

| Script | What it does | Idempotent? | Status |
|---|---|---|---|
| `add-recipe-videos.ts` | Hardcodes 10 YouTube URLs and `UPDATE "Recipe" SET videoUrl=$1 WHERE id=$2` for ids 1–10. | Yes (same UPDATE, same result; missing ids log undefined title). | Companion to `seed-database.ts`. Safe to keep — harmless. |
| `backfill-coach-defaults.ts` | Iterates all COACH users, skips those that already have any RecipeCategory rows, calls `seedCoachDefaults(coach.id)` on the rest. | Yes — gated by `existingCats > 0` skip. | **Keep.** Useful self-heal for coaches missing seed defaults. |
| `backfill-subscription-dates.ts` | For every CoachBilling: `currentPeriodEnd = User.createdAt + 30d`. | Technically yes, but **destructive** — overwrites unconditionally. | One-off historical. Safe to delete. |
| `fix-emma.ts` | Creates `emma@demo.com / demo1234` plus 60 days of body/step/meal/measurement data + PlanDayMeal rows. Guarded by email existence check. | Top-level only. | **Predates multi-tenant** — never sets `coachId` on the user. Orphans against current schema. Safe to delete. |
| `migrate-multi-tenant.ts` | Flips the lone ADMIN user to COACH, backfills `coachId` across all content tables, creates `superadmin@fcma.com / SuperAdmin2026!` + CoachBilling row. | Mostly (existence guards; coachId updates are `WHERE coachId IS NULL`). | **Already executed.** No ADMIN rows remain so re-running exits at the guard. Safe to delete (kept only as history). |
| `seed-database.ts` | Foundational pre-multi-tenant seed: 10 RecipeCategories, 12 DietaryTags, 5 WorkoutCategories + 28 subs, ~85 FoodItems, 10 Recipes, 6 Workouts — all with `coachId=NULL`. | Yes (`ON CONFLICT DO NOTHING`). | **Won't run cleanly against current schema** because `@@unique([slug, coachId])` expects non-null coachId for collision logic. Safe to delete (superseded by `seed-coach-defaults.ts`). |
| `seed-demo-data.ts` | Atop `seed-database.ts`: 3 PlanTemplates (8-Week Fat Loss / 12-Week Muscle Gain / 4-Week Maintenance), 2 demo Posts (TikTok+IG), users `jake@demo.com` + `emma@demo.com` (demo1234), 2 months of contrasting data. | Partial — Posts/Users insert without conflict guards. | Pre-multi-tenant. Safe to delete. |
| `seed-plan-days.ts` | Populates PlanTemplateDay + template-side PlanDayMeal for all 3 templates AND backfills ClientPlanDay PlanDayMeals for Jake & Emma. Hardcoded recipe-id map (R.proteinOats=1 … =10) and `workoutIds=[1,2,5,6]`. | **No** — `INSERT INTO PlanDayMeal/PlanTemplateDay` without conflict guards multiplies meals on rerun. | Pre-multi-tenant. Safe to delete. |

`prisma/seed.ts` (1807 lines, excluded from typecheck by `tsconfig.json:33`) is the older "demo" seed but it predates multi-tenant — it creates users with `role:"ADMIN"` and no coachId. **Not used.** The current live demo state in Supabase was built by a now-deleted one-off script that:

1. Wiped every non-`SUPER_ADMIN` user + all coach-owned content;
2. Created **Coach Adele** (`adele@fcma.com` / `Adele2026!`) and called `seedCoachDefaults(adeleId)` to populate 50 recipes + 22 HD-video workouts + 3 plan templates;
3. Provisioned **3 demo clients** — `sarah.mitchell@demo.com` (35F, fat-loss, Upper/Lower Split), `james.oconnor@demo.com` (28M, muscle-gain, 8-Week Foundation), `priya.sharma@demo.com` (31F, recomp, Arm Specialization) — all with password `demo1234`;
4. Generated 8 weeks of per-client history: 56 step logs, 9 weekly weights, 5 bi-weekly body measurements, ~45 daily-progress rows, 4 weekly targets, 20-message coach conversation, 3 notifications, ~165 meal logs per client.

That script is not committed (intentional — it's destructive and one-shot). If you need to rebuild the demo from scratch, the procedure is: write a fresh `_rebuild-demo.ts` under `scripts/`, run with `npx tsx`, delete after.

---

## 16. Tests

### Test counts

Per `tests/README.md`: 102 automated tests, all passing. Layout:

- **Unit / pure functions:** 97 colocated tests across `src/lib/*.test.ts`:
  - `auth.test.ts` — 17 tests (`@vitest-environment node` for jose)
  - `billing.test.ts` — 28 tests
  - `coach-scope.test.ts` — 19 tests
  - `video.test.ts` — 25 tests
  - `fetch-retry.test.ts` — 8 tests
  - `rate-limit.test.ts` — (count not given, mostly likely ~8-10)
  - `upload-validation.test.ts` — small
- **Component tests:** 5 tests in `src/components/ui/FavouriteButton.test.tsx`, plus `PasswordInput.test.tsx` and `RetryError.test.tsx`.
- **Integration tests:** scaffolded only — `tests/integration/README.md` exists, no specs.
- **E2E:** one Playwright file (`tests/e2e/login.spec.ts`, 35 lines) — smoke check that login page renders and rejects invalid creds.
- **Load:** one k6 file (`tests/load/smoke.js`, 42 lines) — 1 VU, 1 minute, hits 5 public endpoints, asserts p95 < 1 s, fail rate < 1%.

### Running tests

```
npm test                # vitest run (all unit + component)
npm run test:watch      # vitest watch
npm run test:coverage   # vitest with v8 coverage; thresholds 70/70/60/70 — fails if below
npm run test:unit       # vitest run src/lib src/components
npm run test:integration # vitest run tests/integration (no specs currently)
npm run test:e2e        # playwright test (auto-starts dev server if no E2E_BASE_URL)
npm run test:e2e:ui     # playwright with --ui
npm run test:load       # k6 run tests/load/smoke.js (requires k6 binary)
```

### Vitest config (`vitest.config.ts`)

- Env: jsdom (so React component tests work in-process).
- Setup: `tests/setup.ts` — injects `JWT_SECRET` if missing, registers jest-dom matchers, stubs global fetch.
- Coverage includes `src/lib/**` + `src/components/ui/**`, excludes `src/generated/**` and `*.test.ts`. Thresholds 70/70/60/70.
- Excludes `tests/e2e/**`, `tests/load/**`, `src/generated/**` from collection.

### Playwright config (`playwright.config.ts`)

- testDir: `./tests/e2e`. Chromium only. `fullyParallel: false` (DB tests run serially). Retries 2 on CI, 0 locally. Workers 1 on CI, default locally.
- Auto-starts `npm run dev` unless `E2E_BASE_URL` is set; 120 s startup timeout.
- Trace on first retry, screenshot on failure, video retained on failure.

### CI (`.github/workflows/ci.yml`)

Triggers on push to main, PRs to main, manual dispatch. Concurrency-grouped per ref.

Jobs:
- **Lint** — `npm ci` → `npx prisma generate` → `npm run lint`.
- **Unit tests** — same + `npm test` with `JWT_SECRET=ci-test-secret-…`; uploads `coverage/` artifact for 7 days.
- **Build** — same + `npm run build` with dummy DB URLs + `JWT_SECRET=ci-build-secret-…`.
- **Load tests (manual)** — `if: github.event_name == 'workflow_dispatch'`; installs k6 via apt; runs the smoke test against `LOAD_TEST_URL` secret.

No E2E in CI. No integration tests in CI (because there are none).

---

## 17. Build & deploy

### Build

`npm run build` runs `prisma generate && next build`. Output goes to `.next/`.

- `prisma generate` reads `prisma/schema.prisma` and writes the client into `src/generated/prisma/` (overrides default `node_modules/.prisma/client`). The generated client is **not** committed (covered by `.gitignore`).
- `next build` compiles app + collects route metadata.
- Every API route that uses dynamic data sets `export const dynamic = "force-dynamic"` explicitly or via cookie/header reads — there's no static export attempt.

### Vercel

- No `vercel.json` is present. Vercel uses the default Next.js preset.
- No `vercel/og` or other Vercel-specific helpers in use.
- The fetch-retry helper exists specifically to ride out Vercel cold starts (15 s timeout → 1500 ms backoff → 30 s timeout on final attempt — `src/lib/fetch-retry.ts:22-33`).
- The connection pool in `src/lib/db.ts:11` is `max: 3, idleTimeoutMillis: 10_000` — small enough to not blow through Vercel's per-function limits.
- Supabase pooler is used in production (`.env` shows `aws-1-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true` for `DATABASE_URL`; port 5432 direct for `DIRECT_URL`).

### Postinstall

`npm install` runs `prisma generate` via the `postinstall` hook (`package.json:8`). This means a fresh checkout doesn't need a separate step — `npm install` is enough to populate `src/generated/prisma/`.

### What gets generated where

| Artifact | Path | Generated by | Committed? |
|---|---|---|---|
| Prisma client | `src/generated/prisma/` | `prisma generate` (postinstall + build) | No |
| Next build | `.next/` | `next build` | No |
| TS incremental | `tsconfig.tsbuildinfo` | `tsc --incremental` | **Yes** (and 220 KB — likely a mistake) |
| Husky hook | `.husky/pre-commit` | `husky` (one-time setup) | Yes |
| Coverage | `coverage/` | `vitest --coverage` | No |
| Playwright artifacts | `test-results/`, `playwright-report/` | `playwright test` | No |

---

## 18. Demo accounts

### Live database accounts (`fzfzxwmaxhizghzcvwhl`)

**Queried 2026-05-21 after the presentation rebuild.** The DB was wiped on this date and reseeded for the demo — all prior coaches (admin@levelup.com, raheel@*, john@mail.com, maaz@fcma.com, sarah@testcoach.com) and their clients have been removed.

#### SUPER_ADMIN (1)

| Email | Password | Notes |
|---|---|---|
| `superadmin@fcma.com` | `SuperAdmin2026!` (original from `scripts/migrate-multi-tenant.ts:74`; not modified by the rebuild) | Sole SUPER_ADMIN. Survived the rebuild because the script explicitly excluded `role = 'SUPER_ADMIN'`. |

#### COACH (1)

| Email | Password | Invite code | Active clients | Notes |
|---|---|---|---|---|
| `adele@fcma.com` | `Adele2026!` | `adele-demo` | 3 | Coach Adele Reyes. Library: 50 recipes + 22 HD-video workouts + 3 plan templates (Upper / Lower Split, Arm Specialization, 8-Week Foundation). |

#### USERs (3 — all ACTIVE)

| Email | Password | Coach | Goal | Plan | Adherence |
|---|---|---|---|---|---|
| `sarah.mitchell@demo.com` | `demo1234` | Adele | FAT_LOSS (87→84 kg, target 78) | Upper / Lower Split | 80% — consistent, motivated |
| `james.oconnor@demo.com` | `demo1234` | Adele | MUSCLE_GAIN (72→75 kg, target 80) | 8-Week Foundation | 65% — work/life inconsistency |
| `priya.sharma@demo.com` | `demo1234` | Adele | RECOMPOSITION (65→64 kg, belly −2", target 60) | Arm Specialization | 92% — top performer |

Each client has 8 weeks of history pre-populated: 56 step logs, 9 weekly weights, 5 bi-weekly body measurements, ~45 daily-progress rows, 4 weekly targets (weight/belly/waist/steps), ~165 meal logs, 20 messages with Adele, 3 notifications.

To reset a coach's password, a SUPER_ADMIN currently has **no UI for it** — only `/api/admin/users/[id]/password` exists, scoped to a coach updating their own USER's password. A SUPER_ADMIN would need to update via SQL.

### Historical / orphan seed scripts

`prisma/seed.ts`, `scripts/seed-database.ts`, `scripts/seed-demo-data.ts`, `scripts/seed-plan-days.ts`, `scripts/fix-emma.ts` all predate multi-tenant and would not produce a coherent state against the current schema. They reference old demo accounts (`demo@levelup.com`, `emma@demo.com`, `jake@demo.com`, etc.) that no longer exist in the live DB. Safe to delete; kept as history. The current canonical seed entrypoint is `src/lib/seed-coach-defaults.ts` (called per new coach, idempotent).

---

## 19. Known issues, gotchas, and tech debt

### Schema and DB

| # | Severity | What | What breaks | Where | Suggested fix |
|---|---|---|---|---|---|
| 1 | low | `dev.db` (SQLite, 2.9 MB) committed at repo root, unused | Repo bloat; potential confusion | `/dev.db` | Delete and add to `.gitignore`. |
| 2 | low | All 34 tables have RLS enabled with zero policies | No impact today (Prisma uses postgres role); blocks any future Supabase REST/anon use | Live DB | Either disable RLS (uniform with the actual access pattern) or write policies if anon access is ever planned. |
| 3 | low | No `prisma/migrations/` folder; DB was provisioned via `prisma db push` | No migration history; "what changed and when" is opaque | Live DB | Baseline a migration via `prisma migrate resolve --applied` and shift to `prisma migrate` going forward. |
| 4 | low | Supabase advisor flags `public.rls_auto_enable()` as `SECURITY DEFINER` callable by anon | No impact in current app (Supabase REST not used) | Live DB | Revoke EXECUTE from anon/authenticated or switch to SECURITY INVOKER. |
| 5 | med | `PlanDayMeal.templateDayId` and `clientDayId` are both nullable, no DB-level XOR | Could end up with rows attached to both or neither; nothing enforces it | `prisma/schema.prisma:591-607` | Add a CHECK constraint via a migration: `CHECK ((templateDayId IS NULL) <> (clientDayId IS NULL))`. **(Partially RESOLVED 2026-05-20: the new `PlanExercise` model uses the same dual-FK shape but ships with a `PlanExercise_xor_day` CHECK constraint installed by Phase 1's backfill script. `PlanDayMeal` itself still lacks the constraint — same pattern can be applied to it.)** |
| 6 | med | `User.activePlanId` is a loose `Int?` with no Prisma `@relation` | Stale pointer can point at deleted plan or another coach's plan; `/api/admin/progress-overview` reads this without filtering by `coachId` | `prisma/schema.prisma:71` | Add a relation with `onDelete: SetNull` and `coachId` check in queries that follow the pointer. |
| 7 | med | `Favourite` has no cascade from `Workout` (only from `Recipe`) | Deleting a workout orphans its favourites with FK error or silent leak | `prisma/schema.prisma:243-251` | Add `onDelete: Cascade` on `Workout` relation. |
| 8 | low | `dietaryPrefs`, `ingredients`, `instructions` stored as stringified JSON | Type safety lost; can't query | Multiple | Convert to `Json` columns in a migration. |
| 9 | low | `passwordScreenshot`, `imageData`, asset payloads stored as base64 in Postgres | DB bloat at scale; very large rows | Many models | Move to object storage (Supabase Storage, S3) when uploads grow past prototype scale. |

### Auth / sessions

| # | Severity | What | What breaks | Where | Suggested fix |
|---|---|---|---|---|---|
| 10 | med | `JWT_SECRET` loader duplicated between `src/lib/auth.ts` and `src/middleware.ts` | If one changes without the other, sessions silently break across page/API boundary | Both files | Extract to a shared helper that both files import; middleware can import a server-only file as long as it doesn't pull `next/headers`. |
| 11 | med | Dev fallback secret hardcoded (`dev-secret-change-in-production-min-32-chars!!`) | If `NODE_ENV` accidentally isn't `production` on a deployed env, every JWT is signed with a known-public secret | `src/lib/auth.ts:18`, `middleware.ts:17` | Make the fallback opt-in via an explicit `ALLOW_DEV_JWT_SECRET=1` env flag. |
| 12 | low | `verifyToken` swallows all errors as null | Hard to debug "why is the user being kicked"; doesn't differentiate expired token from invalid signature | `src/lib/auth.ts:54-74` | Log via `console.error` or expose via response header in dev. |
| 13 | high | Stale-session amplification: middleware does **not** check `isActive`, `planStatus`, `isCoachActive`, or subscription status | A user deactivated mid-session can keep navigating until they hit an API that re-checks (most APIs don't) | `src/middleware.ts` | Add a `/api/auth/me`-equivalent server check in middleware, or invalidate the JWT on deactivate (track a `tokenVersion` on User). |
| 14 | med | Subscription `EXPIRED`/`CANCELLED` is enforced only at login, not on subsequent requests | A coach who expires while logged in can keep using their portal until they next log in | `/api/auth/login` step 6b | Add a session-level subscription check (e.g. in `requireCoach`). |
| 15 | low | `JWT_SECRET` length is checked only in production; dev/test paths skip the length guard | A short dev secret in CI/staging-with-NODE_ENV-not-set passes silently | `src/lib/auth.ts:7-19` | Apply the same check unless an explicit dev flag is set. |
| 16 | low | Login error copy leaks "your account is pending approval" before bcrypt check | Strictly, this is OK because the message comes after password verification, but the existence of `?email=` could be enumerated via timing | `/api/auth/login` step 7 | Constant-time-ish path: always 401 first if password fails, regardless of status. |
| 17 | med | `/api/auth/payment-proof` POST has no auth gate | Anyone with knowledge of an email can attach payment-proof to that account | `src/app/api/auth/payment-proof/route.ts:5` | Require an unauthenticated registration token, OR require session, OR limit by the lookup matching the latest `paymentScreenshot IS NULL` user only. |
| 18 | low | Weak coach `inviteCode` entropy (firstName + 4 chars of base36) | Collisions on common first names; enumerable | `/api/super-admin/coaches/route.ts:108` | Use `crypto.randomBytes(8).toString("base64url")`. |

### Multi-tenant scoping

| # | Severity | What | Where | Suggested fix |
|---|---|---|---|---|
| 19 | high | `PUT /api/meals/[id]` lets any COACH edit any USER's meal across tenants | `src/app/api/meals/[id]/route.ts:19` | Also require `meal.user.coachId === currentCoach.userId`. |
| 20 | med | `GET /api/user/dashboard` `latestPosts` is not coach-scoped | `src/app/api/user/dashboard/route.ts:150` | Add `where: { coachId: user.coachId }`. |
| 21 | med | `POST /api/messages` allows cross-tenant DM | `src/app/api/messages/route.ts:87` | Require receiver be either the user's coach (for USER sender) or one of the coach's clients (for COACH sender). |
| 22 | med | `notifyAdmin` (`src/lib/notifications.ts:24`) resolves "admin" as the **first COACH user in the DB** — singleton assumption from pre-multi-tenant | Notifications fire on the wrong coach's dashboard | `src/lib/notifications.ts:17` | Take `coachId` as an argument and resolve `findFirst({where:{id:coachId, role:"COACH"}})`. Update every call site (most pass nothing). |
| 23 | ~~med~~ **RESOLVED (2026-05-20)** | Plan-day editor accepts cross-coach `workoutId` / `recipeId` / `subcategoryId` from the body | Coach A can reference Coach B's content; later reads will show those names on Coach A's plans | `/api/admin/plans/[id]/days`, `/api/admin/plans/assign`, `/api/admin/workouts*` | **Done:** Phase 5 added an up-front `findMany({id: {in:[...]}, coachId})` cross-check for all workoutId + recipeId values in the `/days` payload; Phase 4 added a `findFirst({coachId})` guard on `subcategoryId` in both POST and PUT of `/api/admin/workouts*`. `/api/admin/plans/assign` (custom-days path) still needs the same workoutId check — leave open if any future custom-day support is added there. |
| 24 | low | `/api/admin/content` GET falls back to `where: {}` if `getCoachIdFromUser` returns null | If a COACH user ever has a null `coachId` (shouldn't, but defensively), they'd see all coaches' SiteContent | `src/app/api/admin/content/route.ts:30` | Return 401 instead of `{}` fallback. |

### Performance

| # | Severity | What | Where | Suggested fix |
|---|---|---|---|---|
| 25 | med | `/api/auth/me` re-counts active clients on every call (admin layout fetches this on every mount) | DB-heavy at scale | `route.ts:31-49` | Cache for 30-60 s or compute lazily only when subscription is needed. |
| 26 | med | `/api/admin/progress-overview` N+1: 5 sub-queries per client | Coach with 50 clients = 250 queries per overview load | `route.ts:31-130` | Rewrite as bulk JOIN/groupBy; only need aggregates. |
| 27 | med | `/api/admin/signup-requests` returns full base64 paymentScreenshot in list | Several MB per response | `route.ts:11-15` | Return a screenshot URL or a flag, fetch full image on detail open. |
| 28 | low | `/api/super-admin/dashboard` revenue uses total clients, not active-and-billable | Numbers diverge from `/super-admin/billing` | `dashboard/route.ts:34-46` | Switch to `user.groupBy` like `/billing` does. |
| 29 | low | `/api/super-admin/coaches/[id]` `monthlyBill` uses first-20-clients-only count | Undercounts when coach has >20 clients | `route.ts:79-95` | Use `user.count` filtered by isActive+planStatus. |
| 30 | low | `/admin/page.tsx` (dashboard server) hardcodes revenue as `count * 79` | Wrong unit (€79 instead of PKR), wrong client filter | `src/app/admin/page.tsx` | Use `calculateMonthlyBill`. |
| 31 | low | `/admin/messages` and `/hub/messages` both poll every 5 s | Each open browser = 12 req/min/user | Both pages | Move to WebSocket or SSE; or backoff when tab not focused. |

### UX / DX

| # | Severity | What | Where | Suggested fix |
|---|---|---|---|---|
| 32 | low | Static `/manifest.json` linked in root layout despite the dynamic `/api/manifest` existing | Per-coach branding never lands in installed PWA | `src/app/layout.tsx:19` | Switch to `<link rel="manifest" href="/api/manifest" />`. |
| 33 | low | Branding FOUC: "FCMA" flashes before swap to coach name | Aesthetic | `src/lib/branding.tsx:28-49` | Inline coach branding into the response (server component reading the cookie) OR keep cached values in localStorage with stale-while-revalidate. |
| 34 | low | Two `fetch` patterns coexist: `fetchWithRetry` (hub) and raw `fetch` (admin) | Cold-start failures are visible to admins | Admin layout, all admin pages | Either standardize on `fetchWithRetry` or document why admin doesn't need it. |
| 35 | low | `/hub/settings` has dead code: health-profile state, `handleHealthSave`, `DIETARY_OPTIONS`, etc. defined but never rendered | Maintenance overhead | `src/app/hub/settings/page.tsx` | Delete or wire up. |
| 36 | low | `/hub/health-profile` page is misleading: copy says "managed by your coach" but the user can in fact edit health fields via `/hub/settings` PUT `/api/user/profile` | UX mismatch | `health-profile/page.tsx` | Either truly lock the route or update the copy. |
| 37 | low | `(marketing)/not-found.tsx` "View The Hub" CTA links to `/nutrition` which doesn't exist | 404→404 loop | `not-found.tsx` | Update href to `/hub`. |
| 38 | ~~low~~ **RESOLVED (2026-05-20)** | `/admin/workouts` publish-toggle PUT sends `instructions:[]` and `subcategoryId:0` | Clobbers content if the PUT goes through | `AdminWorkoutsClient.tsx` | **Done in Phase 4:** the server-side PUT handler `/api/admin/workouts/[id]` now uses an allowlisted partial update — fields not present in the request body are no longer overwritten. The client can still send a full payload; only the explicitly-set fields actually change. |
| 39 | low | `/admin/feed` post creation supports image upload but doesn't pass through `validateBase64Upload` | Could store unrestricted blobs | `src/app/admin/feed/page.tsx` (and POST `/api/feed`) | Wire upload validation into `/api/feed` POST. |
| 40 | low | `/api/messages` POST doesn't validate base64 `imageData` | DB bloat / non-image content | `src/app/api/messages/route.ts:115` | Call `validateBase64Upload`. |
| 41 | low | 15 unused UI components in `src/components/ui/` (orphan marketing scaffolding) | Bundle/maintenance overhead | See §12 | Delete after a sweep. |
| 42 | low | `src/components/marketing/` is an empty folder | Lint clutter | `src/components/marketing/` | Delete. |
| 43 | low | `src/data/sample-recipes.ts` not imported anywhere | Dead code | `src/data/sample-recipes.ts` | Delete. |
| 44 | low | `src/types/` is empty | Dead folder | `src/types/` | Delete or add types. |
| 45 | low | `tsconfig.tsbuildinfo` (220 KB) is committed | Repo bloat; cache regenerates on build | repo root | Add to `.gitignore`. |
| 46 | low | `next.config.ts` is empty (default scaffold) | No effect — but indicates no Next-specific tuning happened | `next.config.ts` | Either remove or use to set `images.remotePatterns`, etc. |
| 47 | low | README is the default `create-next-app` boilerplate | New contributors get useless info | `README.md` | Replace with project-specific quickstart. |
| 48 | low | 6 unused Prisma adapters in deps (`better-sqlite3`, `libsql`, `neon`, `pg-worker` + their `@types/*`) | ~10 MB of unused node_modules; security surface | `package.json:22-31` | Remove. |
| 49 | low | `@prisma/adapter-pg-worker` is at v6 while everything else is v7 | Version drift; same root install resolves both | `package.json:28` | Remove (unused). |

### Tests / CI

| # | Severity | What | Where | Suggested fix |
|---|---|---|---|---|
| 50 | low | Integration tests are scaffolded but empty (0 tests) | Lots of API surface untested | `tests/integration/` | Implement per phase plan in `tests/README.md`. |
| 51 | low | One Playwright spec, no role-based E2E | Critical flows untested | `tests/e2e/` | Per-role suites (super-admin, coach, client, subscription). |
| 52 | low | CI has no E2E or integration step | Regressions only caught by humans | `.github/workflows/ci.yml` | Add an E2E job that boots the dev server against a test DB. |
| 53 | low | `msw` installed but unused | Dependency without benefit yet | `package.json:60` | Either start using it for integration tests or remove. |
| 54 | low | k6 load test only hits public endpoints | Doesn't load-test the real cost endpoints (auth, dashboard, plan) | `tests/load/smoke.js` | Add scenarios for authed endpoints once integration tests exist. |

### Misc

| # | Severity | What | Where | Suggested fix |
|---|---|---|---|---|
| 55 | low | `src/app/admin/newsletter/` exists but has no `page.tsx` | 404 if linked; sidebar doesn't link it but route folder is dead | `admin/newsletter/` | Delete. |
| 56 | low | Service worker registered at `/` scope so it caches across `/super-admin` too | Documented; OK but worth noting | `public/sw.js` | Either change scope to `/hub` or accept. |
| 57 | low | `getAdminUserId` is called nowhere directly (only via `notifyAdmin`) but exported | Dead-ish export | `src/lib/notifications.ts:16` | Inline or remove the public export. |
| 58 | low | Default JWT in `tests/setup.ts:7` is committed | OK because it's clearly test-only and 32 chars; but if it ever ends up in dev fallback it'd be confusing | `tests/setup.ts` | Comment it more clearly. |
| 59 | low | No transaction wrapping for `/api/super-admin/coaches` POST (User → CoachBilling → SiteContent → seedCoachDefaults) | Failure midway leaves orphan coach | `src/app/api/super-admin/coaches/route.ts:111-138` | Wrap in `prisma.$transaction`. |
| 60 | low | No transaction wrapping for `isCoachActive: false` cascade | Failure leaves coach inactive but clients still active | `src/app/api/super-admin/coaches/[id]/route.ts:113-127` | Wrap in `prisma.$transaction`. |
| 61 | low | Unknown action strings in `/api/super-admin/coaches/[id]` PUT fall through to "no mutation success" | Caller might believe their action succeeded | `route.ts:108-260` | Validate `action` against an enum; return 400 on unknown. |
| 62 | low | `reactivateSubscription` uses `update` not `upsert` — throws if no billing row | Internal 500 instead of clean 400 | `route.ts` reactivate branch | Use `upsert` or pre-check like the other branches. |
| 63 | low | Footer/Header on marketing pages depend on session — explains the `force-dynamic` | OK; just costs a request | `(marketing)/layout.tsx:1` | None — known trade-off. |

---

## 20. Open questions

These are things the code is ambiguous about and that a human needs to answer:

1. **Currency / pricing semantics.** `CoachBilling.basePriceMonthly` is documented as PKR (Pakistani Rupees) throughout, but `/admin/page.tsx` revenue shows `count * 79` with no symbol, and `PaymentSettings.currency` defaults to `"PKR"`. Is the "€"/"$"/etc. ever expected to be exposed? `PricingBox` (orphan) is hardcoded to `€`. Is multi-currency planned, or is PKR the only one?

2. **Plan type semantics.** `PlanTemplate.type` is documented as `combined | workout | diet` but no code branches on it. Was this meant to filter the UI (e.g. hide meals for `workout`-type plans) and the implementation got dropped?

3. **Newsletter feature.** `src/app/admin/newsletter/` is an empty folder. Was it once implemented and removed, or just stubbed and never built? Sidebar has no link to it.

4. **`/hub/settings` health-profile form.** Big chunks of state + handlers for editing health fields exist but are never rendered. Was the form removed because `/hub/health-profile` took over (which itself is read-only)? What's the intended user flow for editing weight/goal?

5. **Forgot/reset password.** Both pages are stubs with no API. Was an email provider chosen? Is this on the roadmap or de-scoped?

6. **`notifyAdmin` semantics.** Today it picks the first COACH in the whole DB (`prisma.user.findFirst({where:{role:"COACH"}})`). Did the intent survive the multi-tenant migration? Should it derive the coachId from the actor and notify only that coach?

7. **Demo seed plan.** `prisma/seed.ts` is excluded from typecheck, creates users with `role:"ADMIN"`, and is 1807 lines old. Is it expected to still work on a fresh DB, or has it been replaced by some other workflow we should document?

8. **`User.activePlanId`.** Loose pointer, no relation. Is it superseded by `ClientPlan.status === "active"`, or is it still load-bearing? If load-bearing, should it become a real relation? If not, can we remove?

9. **`Recipe.ingredients` / `instructions` storage.** They're stored as stringified JSON in `String` columns. Was that to ease Prisma adapter swapping, or just expediency? Should they migrate to `Json` columns?

10. **PWA manifest gap.** Dynamic per-coach manifest exists but isn't wired. Was the static manifest left in place intentionally (e.g., to keep install-prompt UI consistent), or is it just an oversight?

11. **Email/notification provider.** Many flows could use an email — signup approval, plan assignment, payment-proof received, subscription expiring. The code only writes in-app `Notification` rows. Is an external provider planned (Resend, SES, Postmark)?

12. **`paymentTransactionRef` workflow.** Users upload a screenshot and transaction reference; coach reviews and clicks Approve. Is there any reconciliation against a bank statement or payment gateway, or is this fully manual today?

13. **Multi-currency / international.** `seed-coach-defaults.ts` adds Pakistani staples (basmati rice, hummus) and Irish-coded names (Aoife Kelly, Liam Dunne in `prisma/seed.ts`). Is the product targeted at one geography, or are coaches expected to localize their own food/recipe data?

14. **Mobile-only or also desktop?** Service worker, install prompt, manifest, and mobile-first sidebars all suggest mobile is primary. But admin/super-admin pages have full desktop chrome. Is mobile-COACH a real user, or only mobile-USER?

15. **`Asset` vs `SiteContent` for images.** Both store base64. When does a coach put something in `Asset` vs as a SiteContent image key? Today branding uses SiteContent and the `/admin/assets` library is empty in the live DB (0 rows). Was the assets library intended for other purposes (PDFs, longer videos) that haven't been built yet?

---

*Document generated 2026-05-20 from a complete read of every source file plus a live cross-check against Supabase project `fzfzxwmaxhizghzcvwhl`. Line numbers cited are accurate as of commit `6d688f2` (`docs: add CLAUDE.md codebase tour`).*

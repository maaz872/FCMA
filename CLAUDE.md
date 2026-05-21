@AGENTS.md

# FCMA — Fitness Coach Management App

Multi-tenant SaaS. Each fitness **COACH** gets a branded portal under `/admin`, owns their own recipes/workouts/plans/food-database, and manages their **USER** clients via `/hub`. A platform owner (`SUPER_ADMIN`) provisions coaches via `/super-admin`. Tenant key is `coachId` on almost every table.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js **16.2.2** (App Router) — *not* the Next.js in your training data, see `AGENTS.md` |
| UI | React **19.2.4**, Tailwind **v4** (PostCSS-only, no config file) |
| Language | TypeScript strict, alias `@/* → ./src/*` |
| ORM | Prisma **7.6**, custom client output `src/generated/prisma` |
| DB | PostgreSQL via `pg` + `@prisma/adapter-pg` (other adapters in deps are unused) |
| Auth | `jose` JWT (HS256) in `levelup_session` httpOnly cookie; `bcryptjs` cost 12 |
| Tests | Vitest (unit/integration) + Playwright (E2E) + MSW + k6 (load) |
| PWA | hand-rolled `public/sw.js`, registered inline in root layout |

Scripts: `dev`, `build` (= `prisma generate && next build`), `start`, `lint`, `test`, `test:e2e`, `test:load`.

## Directory map

```
prisma/                schema.prisma, seed.ts            ← single source of truth for data model
prisma.config.ts       Prisma v7 config, reads DIRECT_URL || DATABASE_URL
scripts/               One-off migration/backfill scripts (see Gotchas)
public/                sw.js, manifest.json, offline.html, icons
src/
  middleware.ts        JWT gate for /hub /admin /super-admin /login
  app/
    layout.tsx         Root HTML; registers /sw.js; links /manifest.json
    (marketing)/       Public: /, /login, /checkout, /forgot-password, /reset-password, /terms, /privacy-policy
    hub/               USER app (clients)  — 18 feature folders
    admin/             COACH app           — content + clients + billing
    super-admin/       SUPER_ADMIN app     — coaches + platform billing
    api/               ~60 route.ts handlers grouped by feature
  components/
    ui/                Shared presentational pieces
    layout/            Header/Footer (marketing only)
    admin/, hub/       A couple of role-specific modals
    InstallPrompt.tsx  PWA install CTA
  lib/                 auth, db, coach-scope, billing, branding, rate-limit,
                       fetch-retry, notifications, video, upload-validation,
                       seed-coach-defaults (+ co-located *.test.ts)
  generated/prisma/    Generated Prisma client — import as @/generated/prisma/client
  data/sample-recipes.ts
  types/               EMPTY
tests/
  setup.ts, fixtures/
  integration/         admin/, auth/, client/, super-admin/
  e2e/login.spec.ts    Single Playwright spec
  load/                k6 smoke
```

## Key files

| File | Role |
|---|---|
| `src/middleware.ts` | Verifies JWT cookie, gates `/hub`, `/admin`, `/super-admin`, redirects authed users away from `/login` |
| `src/app/layout.tsx` | Root layout, mounts service worker, links manifest |
| `src/app/(marketing)/page.tsx` | Home — just `redirect("/login")` |
| `src/app/{hub,admin,super-admin}/layout.tsx` | Per-role client layouts with sidebars + mobile drawer; fetch `/api/auth/me` on mount |
| `src/lib/auth.ts` | `hashPassword`, `verifyPassword`, `createToken`, `verifyToken`, cookie helpers, `getCurrentUser()` |
| `src/lib/coach-scope.ts` | `requireCoach()`, `requireSuperAdmin()`, `getCoachScope()`, `coachWhere()`, `withCoachId()` — use these in API routes |
| `src/lib/db.ts` | Prisma singleton on `globalThis._prisma`; `prisma` is a lazy `Proxy` |
| `src/lib/billing.ts` | `calculateMonthlyBill`, `resolveSubscriptionStatus` (ACTIVE / GRACE / EXPIRED / CANCELLED), `GRACE_DAYS = 7` |
| `src/lib/rate-limit.ts` | Login (5/15min/email) + register (3/hr/IP) via `LoginAttempt` table |
| `src/lib/branding.tsx` | `BrandingProvider` + `useBranding()`; fetches `/api/site-settings` client-side |
| `src/lib/fetch-retry.ts` | `fetchWithRetry(url, opts?, retries=3)` — used selectively on the client |
| `src/lib/seed-coach-defaults.ts` | Seeds a new coach's default categories/tags/etc. |
| `src/app/api/auth/login/route.ts` | Login flow incl. rate limit, `isActive`/`isCoachActive`/subscription gates, USER `planStatus` gate |
| `src/app/api/auth/register/route.ts` | Invite-only registration; sets `planStatus: "PENDING"` |
| `src/app/api/auth/me/route.ts` | Current user + coach `subscription` summary (re-counts active clients each call) |
| `prisma/schema.prisma` | All models — start here for data questions |

## Roles & routes

- **USER** → `/hub/*` — dashboard, my-plan, my-meals, recipes, workouts, food-chart, progress, analytics, targets, steps, calculator, feed, messages, notifications, favourites, health-profile, settings.
- **COACH** → `/admin/*` — dashboard, branding, billing, recipes, workouts, food-database, plans, feed, users, signup-requests, messages, notifications, newsletter, assets, content.
- **SUPER_ADMIN** → `/super-admin/*` — coaches, billing, dashboard.

Legacy `role: "ADMIN"` is silently mapped to `"COACH"` in `auth.ts`, `middleware.ts`, `/api/auth/me`, and the login page redirect.

## Data model essentials

- `User` carries the role discriminator AND the full health profile inline. Self-references via `coachId` (`@relation("CoachClients")`). Coaches have `inviteCode` used by `/api/auth/register`.
- `CoachBilling` is 1:1 with a COACH user — `basePriceMonthly`, `extraClientPrice`, `includedClients`, `maxClients`, `billingStatus`, `currentPeriodEnd`.
- Coach-owned content (`Recipe`, `Workout`, `FoodItem`, `PlanTemplate`, `RecipeCategory`, `DietaryTag`, `WorkoutCategory`, `WorkoutSubcategory`, `Post`, `Asset`, `SiteContent`, `PaymentSettings`) all carry nullable `coachId` with `@@unique([slug, coachId])` so two coaches can collide on slugs.
- Plans: `PlanTemplate → PlanTemplateDay → PlanDayMeal` (recipes) **and `PlanTemplateDay → PlanExercise` (workouts)**; assigning to a user duplicates as `ClientPlan → ClientPlanDay → {PlanDayMeal | PlanExercise}`. `PlanDayMeal` has both `templateDayId?` and `clientDayId?` (no DB-level XOR). `PlanExercise` has the same dual-FK shape but **with** a CHECK constraint `PlanExercise_xor_day` enforcing XOR at the DB layer. The legacy single-workout-per-day field `PlanTemplateDay.workoutId` / `ClientPlanDay.workoutId` is retained for back-compat but the editor and hub now drive everything through `PlanExercise`.
- `Workout` carries optional illustration metadata: `gifUrl`, `bodyPart`, `equipment`, `primaryMuscles`. Coach-uploaded videos still go to `videoUrl`; the bundled Free Exercise DB at `src/data/exercise-library.json` populates the gif fields when a coach picks from the library.
- `Asset.data` and `SiteContent` logos/icons are **base64 strings in Postgres**.
- `LoginAttempt` doubles as the register-throttle log via `"REGISTER:" + ip` rows in the `email` column.

## Conventions

- **Client-heavy.** Almost every `app/<role>/<feature>/page.tsx` starts with `"use client"`. Pages own their state with `useState` + `useEffect` + raw `fetch`. **No Redux/Zustand/SWR/React-Query.** The only Context is `BrandingProvider`.
- **API style.** REST-ish JSON under `src/app/api/<group>/route.ts`. Export `GET`/`POST`/`PUT`/`DELETE`. Auth via `getCurrentUser()` / `requireCoach()` / `requireSuperAdmin()` / `getCoachScope()`; never trust `coachId` from the request body — derive it from the session.
- **Multi-tenant queries.** Always filter coach-owned models by `coachId` from `getCoachScope()`. Use `coachWhere(coachId)` / `withCoachId(data, coachId)` helpers.
- **Forms.** `handleSubmit` → `fetch(..., { method, headers: {"Content-Type":"application/json"}, body: JSON.stringify(...) })` → check `res.ok` → set `error`/`success` state. No shared mutation hook.
- **Loading.** Inline `animate-pulse` skeleton divs, not a shared `<Spinner>`.
- **Naming.** kebab-case folders, PascalCase components, camelCase functions, SCREAMING_CASE for Prisma string enums. Detail routes use `[id]` or `[slug]`. Page bodies live in `page.tsx` — splitting into `*Client.tsx` is rare (one instance: `admin/AdminDashboardClient.tsx`).
- **Imports.** `@/...` everywhere; Prisma client is `@/generated/prisma/client`, **not** `@prisma/client`.
- **Tests.** Unit/component tests sit next to source (`*.test.ts(x)`); integration in `tests/integration/<role>/`; one Playwright spec; k6 smoke. `tsconfig.json` excludes `prisma/seed.ts` from typecheck.
- **Styling.** Tailwind v4 utilities only. Dark palette: bg `#0A0A0A`/`#111111`/`#1E1E1E`, borders `#1A1A1A`/`#2A2A2A`, accent red `#E51A1A`, orange `#FF6B00`, yellow `#FFB800`.

## Auth flow recap

1. `/api/auth/register` requires `coachCode` (a coach's `inviteCode`). Creates USER with `planStatus: "PENDING"`, no session.
2. Coach reviews at `/admin/signup-requests`, flips to `ACTIVE`.
3. `/api/auth/login` order: rate-limit → password → `isActive` → (COACH only) `isCoachActive` → (COACH only) subscription status (`EXPIRED`/`CANCELLED` block, `GRACE` allows with banner) → (USER only) `planStatus === "ACTIVE"`.
4. JWT issued (14d / 30d remember-me), cookie set, client redirects by role.
5. `middleware.ts` re-verifies on every protected request.

## Gotchas

- **`dev.db` (SQLite) is committed at repo root** but Prisma is configured for PostgreSQL. Unused, but `package.json` carries several Prisma adapters (`better-sqlite3`, `libsql`, `neon`, `pg-worker`) that aren't wired up either. Leftover from an aborted multi-driver effort.
- **`JWT_SECRET` is duplicated** between `src/lib/auth.ts` and `src/middleware.ts` (middleware can't import `next/headers`, but the secret loader itself could be shared). Drift risk.
- **Prisma client is a `Proxy`** in `src/lib/db.ts` with `as any` casts on the adapter — types are loose at that boundary.
- **`/api/auth/me` re-counts active clients on every call** to compute `monthlyBill`. Called by every layout on mount. Not cached — will sting at scale.
- **Branding flashes default content.** `BrandingProvider` fetches client-side only; expect a brief "FCMA" before swap.
- **Two `fetch` patterns coexist.** Hub layout uses `fetchWithRetry`, admin layout uses raw `fetch` for the same `/api/auth/me` call. Pick the one that matches the file you're in; don't refactor wholesale without a reason.
- **`PlanDayMeal.templateDayId` and `clientDayId`** are both nullable — only one is meant to be set at a time. No DB constraint enforces it. (The newer `PlanExercise` model uses the same dual-FK shape but does have a CHECK constraint enforcing XOR.)
- **Per-coach seed library.** Every new coach gets 50 recipes + 22 workouts (all with HD video — wger.de 1080p MOV/MP4 or curated YouTube via exercemus) + 3 plan templates pre-wired via `seedCoachDefaults` (`src/lib/seed-coach-defaults.ts`). The curated content lives in `src/lib/seed/{recipes,workout-picks,plans}.ts`, all self-contained (no external dataset dependency at seed time). Existing coaches opt in via `npx tsx scripts/backfill-coach-seed-content.ts <coachId>`.
- **Free Exercise DB is bundled but no longer drives the seed.** `src/data/exercise-library.json` ships ~1 MB / 873 entries (MIT licensed) and is queried by `searchExerciseLibrary` / `getExerciseLibraryEntry` in `src/lib/exercise-library.ts`. It powers the coach-side `IllustrationPicker` (when a coach wants to attach a 2-frame gif illustration to a new manual workout) and the `/api/admin/exercise-library` proxy. The seed itself uses the smaller curated HD-video list, not this dataset.
- **Workout media priority is `videoUrl` first, hover-to-play.** Cards across `/hub/workouts`, `/admin/workouts`, the plan editor, `/hub/my-plan` and both pickers use `WorkoutMediaThumbnail` (`src/components/ui/WorkoutMediaThumbnail.tsx`), which plays the `<video>` on mouseenter/touchstart and pauses on mouseleave/touchend for direct MP4/MOV/WebM URLs. YouTube cards show the `img.youtube.com/vi/<id>/hqdefault.jpg` poster and swap to an autoplay+mute iframe only on hover (iframe unmounts on leave to stop). `ExerciseGif` (2-frame CSS toggle) is the gif fallback. The `/hub/workouts/[slug]` detail page renders a single full-controls `VideoEmbed` when `videoUrl` is set — gif is only used if no video is attached.
- **Picker components.** `src/components/admin/IllustrationPicker.tsx` (modal over the bundled Free Exercise DB — picks a library entry, used by `/admin/workouts/new` and `/admin/workouts/[id]/edit` to attach gif + auto-fill metadata) and `src/components/admin/WorkoutPickerModal.tsx` (modal over the coach's existing `Workout` rows — used by `/admin/plans/[id]/edit` for the multi-exercise day editor).
- **bodyPart-first navigation.** `/admin/workouts` and `/hub/workouts` both show a row of bodyPart pill filters (Chest / Back / Legs / Shoulders / Arms / Core / Full body / Cardio) at the top — primary nav. `/hub/workouts` no longer has the Strength/Cardio/Flexibility category tree in the sidebar (removed because it duplicated the pills); the sidebar keeps only Search + Difficulty + Goal as secondary filters.
- **Editable assigned plans without touching templates.** `/admin/users/[id]` Plans tab calendar cells are clickable; tapping any day opens `EditPlanDayModal` (defined in `UserDetailClient.tsx`). The modal writes to `ClientPlanDay` / `PlanExercise` / `PlanDayMeal` on the *client side* — the source `PlanTemplate` stays canonical. Endpoint: `PUT /api/admin/users/[id]/plan/days/[dayId]` with cross-coach FK validation for every workoutId/recipeId.
- **In-page exercise detail on `/hub/my-plan`.** Tapping an exercise thumbnail or title opens `ExerciseDetailModal` (defined in `src/app/hub/my-plan/page.tsx`) which renders the full-controls `VideoEmbed` + today's prescription + parsed instructions, without navigating away from the plan.
- **Demo state (presentation seed).** The live Supabase DB has been wiped to: 1 SUPER_ADMIN + 1 COACH (Adele, `adele@fcma.com` / `Adele2026!`) + 3 USERs (`sarah.mitchell@demo.com`, `james.oconnor@demo.com`, `priya.sharma@demo.com` — all `demo1234`). Each client has 8 weeks of meal/step/weight/measurement/progress logs + 20-message coach conversation, generated by a one-off script (already deleted) that called `seedCoachDefaults(adeleId)` and then back-filled history.
- **`User.activePlanId Int?`** is a loose pointer (no Prisma `@relation`). Possibly a holdover.
- **`scripts/fix-emma.ts`** is a one-off data fix — assume that whole `scripts/` folder is a graveyard of one-shots (`migrate-multi-tenant`, `backfill-*`, `seed-*`, `add-recipe-videos`).
- **Service worker is global.** Registered in the root layout, so it caches across all three sub-apps including `/super-admin`.
- **`LoginAttempt` analytics.** If you query it for login analytics, filter out `email LIKE 'REGISTER:%'` rows.
- **AGENTS.md says read the bundled docs first.** Before touching framework APIs (App Router, `cookies()`, `headers()`, route handlers, middleware), open `node_modules/next/dist/docs/` rather than relying on training data.

# UX recommendations — FCMA presentation prep

**Author:** DeepLearnHQ
**Date:** 2026-05-21

Concrete improvements I'd ship before / shortly after the presentation. Each is a real issue I found in the current code, ranked rough ROI vs effort.

---

## High impact / low effort

### 1. Auto-advance through exercises with a rest timer
**Why:** The "30 Day Fitness Challenge" reference app gets so much of its feel from auto-progressing through exercises with a visible countdown. We already have set-by-set checkoff in `/hub/my-plan`. Adding a "Start workout" button that goes full-screen and walks through each exercise with a 60-second rest timer would close the experience gap.
**Effort:** ~1 day. Component is a finite-state machine: idle → exercise active → rest countdown → next exercise.
**Files:** `src/app/hub/my-plan/page.tsx`, new `GuidedWorkoutOverlay.tsx`.

### 2. Coach quick-actions on the user detail header
**Why:** When Adele opens Sarah's profile she'll usually want to do one of three things: send a message, mark a plan day complete on the client's behalf, or assign a new plan. Right now those are scattered across multiple tabs. A row of 3-4 prominent buttons at the top of `/admin/users/[id]` would cut clicks dramatically.
**Effort:** 2-3 hours. Pure UI rearrangement.
**Files:** `src/app/admin/users/[id]/UserDetailClient.tsx`.

### 3. Replace "Mark Complete" button on `/hub/my-plan` with set-by-set inferred completion
**Why:** Currently we have BOTH a manual "Mark Complete" button AND per-set checkboxes that auto-set workoutCompleted when all sets are ticked. That's two ways to do the same thing — confusing. Drop the button; ticking sets IS the completion gesture.
**Effort:** 30 minutes.
**Files:** `src/app/hub/my-plan/page.tsx`.

### 4. Marketing/landing page (`/`)
**Why:** Currently `/` is `redirect("/login")`. For a coaching SaaS this is a missed conversion surface. Even a one-screen "Login or Sign up with a coach invite code" page would be better, with the invite-code field that auto-resolves to `/checkout?coach=<code>`.
**Effort:** 2-3 hours.
**Files:** `src/app/(marketing)/page.tsx`, new components.

### 5. Sticky header for /hub/my-plan day navigator
**Why:** As the client scrolls through their workout cards, the date selector + week navigator scrolls away. They have to scroll back to switch days. Pin the day chip row to top with `sticky top-0 z-10`.
**Effort:** 30 minutes.
**Files:** `src/app/hub/my-plan/page.tsx`.

---

## High impact / medium effort

### 6. Push notifications via service worker
**Why:** The hub-side service worker is already registered and currently does only offline fallback. Adding `pushManager.subscribe()` and a small `/api/push/subscribe` endpoint would let Adele send "you've got a new plan" or "don't forget your workout" pings to clients without email. Hugely valuable for retention.
**Effort:** 1-2 days. Needs VAPID keys, push subscription persistence table, send endpoint.
**Files:** `public/sw.js`, new `PushSubscription` model, new `/api/push/subscribe` + `/api/push/send` routes.

### 7. Client-side weight chart with target line
**Why:** `/hub/progress` already plots the last 90 days of weight measurements, but doesn't draw the user's target weight as a reference line. Adding a horizontal line at `User.targetWeightKg` (and a label "Target") would make progress feel real instead of just "number is moving."
**Effort:** ~1 hour.
**Files:** `src/components/ui/BarChart.tsx` already supports `targetValue` — just thread it through on the progress page.

### 8. Coach dashboard widgets that flag at-risk clients
**Why:** The current `/admin` dashboard is mostly counts. Adele's real job is intervention — she needs to see, at a glance, "James hasn't logged a meal in 4 days" or "Sarah's adherence dropped below 50% this week." A "Needs attention" panel with 1-3 prioritized clients would be transformative.
**Effort:** ~1 day for the panel + supporting query.
**Files:** `src/app/admin/page.tsx`, new query joining DailyProgress + recent activity.

### 9. Coach can adjust per-day weights from the client view
**Why:** Already partially implemented in the EditPlanDayModal (commit `2f8d255`). Next step: add a "progressive overload" template — Adele clicks a day, hits "+ 2.5 kg to all exercises", saves. Bulk progression in one click is a huge time-saver for coaches managing 20+ clients.
**Effort:** 2-3 hours. Add a one-click bulk-modify action to the modal.
**Files:** `src/app/admin/users/[id]/UserDetailClient.tsx` (EditPlanDayModal).

---

## Medium impact / low effort

### 10. Better empty states
**Why:** When a new user has no plan, `/hub/my-plan` shows a generic empty state. Same for `/hub/progress` (no measurements), `/hub/steps` (no logs). Each should have a single big CTA: "Message your coach to get started" → links to `/hub/messages`.
**Effort:** 30 minutes per page.
**Files:** Various hub pages.

### 11. Notification grouping in the bell
**Why:** The notification bell shows raw chronological list. After 8 weeks of activity that gets noisy. Group by date ("Today" / "Yesterday" / "This week" / "Older") and merge repeated types (e.g. "5 step goals reached this week" instead of 5 separate rows).
**Effort:** 1 hour.
**Files:** `src/components/ui/NotificationBell.tsx`.

### 12. Hub mobile bottom nav
**Why:** The hub layout uses a left sidebar on desktop and a hamburger menu on mobile. For a fitness app, mobile-first means a bottom tab bar (Home / Plan / Log / Progress / More). One-thumb reach beats hidden hamburger every time.
**Effort:** ~4 hours. New `BottomNav.tsx`, drop hamburger on mobile.
**Files:** `src/app/hub/layout.tsx`.

---

## Low priority but worth noting

### 13. Recipe images
**Why:** Recipes currently render with `imageUrl` if set, but the seed doesn't include images. Result: every recipe card is text-only. Adding 50 stock food photos (or pulling from Unsplash) would make the recipes section feel as polished as the workouts.
**Effort:** 3-4 hours of curation + a script.

### 14. Branding theming per coach
**Why:** Each coach can set their site name, logo, favicon. But the accent color (`#E51A1A` red) is hardcoded everywhere. If branding included a primary color, each coach's portal could feel like their own.
**Effort:** ~2 days. Requires CSS variable theming throughout the codebase.

### 15. Onboarding for new clients
**Why:** When a client signs up via `/checkout`, they land in `/hub` with no guidance. A 3-step onboarding (welcome → set step goal → introduce coach via auto-message) would convert "signed up" into "engaged user."
**Effort:** ~1 day.

---

## Summary table

| # | Item | Effort | Impact |
|---|---|---|---|
| 1 | Auto-advance workout w/ rest timer | 1 day | ⭐⭐⭐ |
| 2 | Coach quick-actions header | 2-3 hrs | ⭐⭐⭐ |
| 3 | Drop redundant Mark Complete button | 30 min | ⭐⭐ |
| 4 | Marketing/landing page | 2-3 hrs | ⭐⭐⭐ |
| 5 | Sticky day navigator | 30 min | ⭐⭐ |
| 6 | Web push notifications | 1-2 days | ⭐⭐⭐ |
| 7 | Target line on weight chart | 1 hr | ⭐⭐ |
| 8 | At-risk client panel on dashboard | 1 day | ⭐⭐⭐ |
| 9 | "+2.5 kg to all" bulk progression | 2-3 hrs | ⭐⭐ |
| 10 | Empty states with CTA | 1 hr | ⭐ |
| 11 | Notification grouping | 1 hr | ⭐ |
| 12 | Mobile bottom nav | 4 hrs | ⭐⭐ |
| 13 | Recipe images | 3-4 hrs | ⭐ |
| 14 | Per-coach theme color | 2 days | ⭐ |
| 15 | New-client onboarding | 1 day | ⭐⭐ |

**Demo-ready picks:** 1, 2, 5, 7, 8 — the most visible wins for under 3 days of work total.

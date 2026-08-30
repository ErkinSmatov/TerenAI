---
phase: 69-onboarding-gamification
plan: 05
subsystem: ui+gamification
tags: [reanimated, portal, badges, settings, achievements]

requires:
  - phase: 69-onboarding-gamification (plan 04)
    provides: "api.badges.getUnseenBadge/markBadgeSeen/listBadges Convex functions"
  - phase: 69-onboarding-gamification (plan 01)
    provides: "lib/badges/badgeDefinitions.ts (BADGE_DEFINITIONS, findBadgeDefinition)"
provides:
  - "components/badges/BadgeCelebrationModal.tsx — self-contained, props-less celebration modal driven by a reactive query"
  - "components/badges/BadgeTile.tsx — first badge tile component, earned/locked visual states"
  - "app/app/(settings)/badges.tsx — achievements showcase screen (all six definitions, earned+locked)"
  - "\"Достижения\" entry in the top settings group"
affects: []

tech-stack:
  added: []
  patterns:
    - "Reactive-query-driven modal (no props, no onPress trigger) using @rn-primitives/portal's `Portal`/`PortalHost` directly, instead of a wrapping `*Primitive.Root` component like AlertDialog"
    - "Definitions-joined-with-server-rows pattern: full BADGE_DEFINITIONS list mapped client-side, matched against server's earned-only rows by (type, threshold) pair to derive locked/earned UI state"

key-files:
  created:
    - components/badges/BadgeCelebrationModal.tsx
    - components/badges/BadgeTile.tsx
    - app/app/(settings)/badges.tsx
  modified:
    - app/app/(tabs)/index.tsx
    - app/app/(tabs)/settings.tsx

key-decisions:
  - "BadgeCelebrationModal uses @rn-primitives/portal's Portal/PortalHost directly (not AlertDialogPrimitive) since there is no trigger element — the modal's visibility is derived entirely from the getUnseenBadge query, not from user-initiated open state"
  - "Icon pop-in uses a standalone Reanimated useSharedValue+withSpring, layered on top of the shared Keyframe ZoomIn/ZoomOut card animation, per plan's request for a distinct 'light spring scale' on the trophy icon"
  - "Empty-state condition changed from `earned !== undefined && earned.length === 0` to `earned?.length === 0` to satisfy @typescript-eslint/prefer-optional-chain — identical runtime behavior (loading state still suppresses the empty-state copy)"

patterns-established:
  - "Pattern: badge tile join-by-composite-key (type+threshold) — reusable if any future screen needs to render the full BADGE_DEFINITIONS catalog against a partial server-side earned list"

requirements-completed: [BADGE-02, BADGE-03]

duration: ~20min
completed: 2026-08-30
---

# Phase 69 Plan 05: Badge Celebration Modal + Achievements Showcase Summary

**Reactive-query-driven celebration modal (fires even after background badge awarding) plus a two-column achievements showcase reachable from Settings, both built entirely on already-installed Reanimated/`@rn-primitives/portal` primitives — no new npm dependencies.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2/2
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- `BadgeCelebrationModal` — no props, mounted once on the home screen, sourced entirely from `useQuery(api.badges.getUnseenBadge.default)`. Fires whether the badge was awarded synchronously or by the background `internalAction` pipeline, since it doesn't depend on any mutation callback (69-RESEARCH.md Pitfall 3)
- Modal built on the project's proven `Keyframe` `ZoomIn`/`ZoomOut` (200ms, copied from `AlertDialog.tsx`) plus a standalone Reanimated spring pop on the trophy icon; closing (overlay tap or "Круто") calls `markBadgeSeen` exactly once, so the reactive query naturally advances to the next unseen badge or `null`
- If a badge's threshold definition can no longer be resolved (code changed after award), the modal silently calls `markBadgeSeen` without rendering, rather than crashing
- `BadgeTile` — first tile component in the codebase, two visual states (earned: orange accent + formatted `date-fns` `ru`-locale date; locked: muted, no date) driven purely by presence of `earnedAt`
- `app/app/(settings)/badges.tsx` — renders all six `BADGE_DEFINITIONS` in a 2-column grid, joining against `listBadges`'s earned-only rows by `(type, threshold)`; empty-state copy shown above the (still-visible) locked grid only once `listBadges` has resolved
- "Достижения" entry added to the top settings group (after "Уведомления", before "Импорт анализа")

## Task Commits

Each task was committed atomically:

1. **Task 1: Модалка празднования нового бейджа и её монтирование** - `18fa99d` (feat)
2. **Task 2: Витрина достижений и точка входа в Настройках** - `6098fc0` (feat)

## Files Created/Modified
- `components/badges/BadgeCelebrationModal.tsx` - self-contained celebration modal, `Portal`/`Keyframe`-based
- `components/badges/BadgeTile.tsx` - earned/locked badge tile, joined by `(type, threshold)`
- `app/app/(settings)/badges.tsx` - achievements showcase screen
- `app/app/(tabs)/index.tsx` - mounted `<BadgeCelebrationModal />` as last child of the root `SafeArea`
- `app/app/(tabs)/settings.tsx` - added "Достижения" entry (`TrophyIcon`) to the top settings group

## Decisions Made
- Used `@rn-primitives/portal`'s bare `Portal`/`PortalHost` (already mounted globally in `RootLayoutProvider`) instead of wrapping in an `AlertDialogPrimitive.Root`-style component, since this modal has no trigger element to control open state — visibility is derived state, not interaction state
- Kept the icon-pop spring animation separate from the card's `Keyframe` ZoomIn/ZoomOut per the plan's explicit request for a "light spring scale" distinct from the card entrance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/Lint] Rewrote empty-state condition in `badges.tsx` to satisfy `@typescript-eslint/prefer-optional-chain`**
- **Found during:** Task 2 (`npx eslint`)
- **Issue:** `earned !== undefined && earned.length === 0` triggered `@typescript-eslint/prefer-optional-chain` (project ESLint config)
- **Fix:** Rewrote to `earned?.length === 0` — identical runtime semantics (still `false` while `earned` is `undefined`, i.e. loading), just more concise per lint rule
- **Files modified:** `app/app/(settings)/badges.tsx`
- **Verification:** `npx eslint` clean; `npx tsc --noEmit` clean
- **Committed in:** `6098fc0` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (lint compliance, no behavior change)
**Impact on plan:** None — cosmetic condition rewrite, identical behavior to what the plan specified.

## Issues Encountered
- `.expo/types/router.d.ts` (gitignored Expo Router codegen artifact) was stale relative to the new `/app/(settings)/badges` route, causing `tsc --noEmit` to report `TS2322` on the new `Link href="/app/(settings)/badges"` usage in `settings.tsx` until regenerated. Resolved with a one-shot `npx expo start --web` (started, confirmed bundle completion and route regeneration, then killed the dev server) — no source files changed, generated artifact not tracked by git. Not a code defect, matches the pattern documented in 69-03-SUMMARY.md.
- Pre-existing 8 `eslint .` errors in `confirm-meal.tsx`/`confirm-phone.tsx`/`ConfirmMealItems.tsx` (documented out-of-scope since 69-01-SUMMARY.md) remain present and untouched — none of these files are in this plan's `files_modified`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both D-18 (achievements showcase) and D-19 (instant celebration) from CONTEXT.md are implemented; D-20 (separate badge push channel) intentionally not implemented, per plan
- No new npm dependencies added (`git diff --stat package.json` confirmed empty) — `react-native-fast-confetti` was not installed, per the confirmed peer-dependency conflict in 69-RESEARCH.md
- `BadgeCelebrationModal` is mounted on the home screen only (not `RootLayoutProvider`), leaving `RootLayoutProvider` free for plan 69-06's changes in the same wave
- Manual verification of celebration animation and showcase visuals is deferred to plan 69-08, per this plan's `<verification>` section

---
*Phase: 69-onboarding-gamification*
*Completed: 2026-08-30*

## Self-Check: PASSED

All created/modified files verified present on disk (`components/badges/BadgeCelebrationModal.tsx`, `components/badges/BadgeTile.tsx`, `app/app/(settings)/badges.tsx`, `app/app/(tabs)/index.tsx`, `app/app/(tabs)/settings.tsx`); both task commit hashes (`18fa99d`, `6098fc0`) verified present in `git log`.

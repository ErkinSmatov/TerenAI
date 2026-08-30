# Deferred Items — Phase 69

Out-of-scope discoveries found during execution, not fixed per Scope Boundary rule.

## From Plan 69-01

- **`components/home/HomeHeader.tsx:33`** — `npx tsc --noEmit` reports `TS2345: Argument of type '"/app/(home)/streak"' is not assignable to parameter of type ...` (expo-router typed route mismatch). Pre-existing, introduced in commit `811a23f feat(69-02): repurpose home header buttons — streak entry + observed list`, unrelated to any file touched by plan 69-01 (`lib/notifications/reminderSchedule.ts`, `lib/badges/badgeDefinitions.ts`, `scripts/verify*.ts`, `convex/tables/*`, `convex/schema.ts`). Left unfixed; flagged for whichever plan next touches `HomeHeader.tsx` or `app/(home)/streak`.
- **`npx eslint .` (repo-wide) reports 8 pre-existing errors** in `app/app/(meal)/confirm-meal.tsx`, `app/auth/confirm-phone.tsx`, `components/meal/ConfirmMealItems.tsx` (`@typescript-eslint/no-confusing-void-expression`, `@typescript-eslint/no-floating-promises`). All three files predate plan 69-01 (commits `3531027`, `895bda1`, `a22861f` — none touched by this plan). Scoped `eslint` runs on plan 69-01's own files (`lib/notifications/reminderSchedule.ts`, `lib/badges/badgeDefinitions.ts`, `scripts/verify*.ts`, `convex/tables/pushTokens.ts`, `convex/tables/badges.ts`, `convex/tables/profiles.ts`, `convex/schema.ts`) are clean.

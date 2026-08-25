---
phase: 68-apple-health
plan: 02
subsystem: infra
tags: [convex, date-math, dst, validation, ts-node]

# Dependency graph
requires: []
provides:
  - "Client-side calculator for arbitrary local-month boundaries (getLocalMonthBounds), DST-safe"
  - "Server-side validators for month bounds/dates (assertLocalMonthBounds, assertLocalMonthDates, getLocalMonthDayIndex)"
  - "Automated verification script (scripts/verifyMonthBucketing.ts) covering DST, Feb 28/29, indexing, and validator rejection"
affects: [68-03, 68-04, 68-05, 68-06, 68-07, 68-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client computes local calendar math (new Date(y,m,d) constructor, never Date.UTC/getTimezoneOffset); server only validates shape/spacing of client-supplied bounds"
    - "Variable-length month bucketing (28-31 days) via computed dayCount, never a hardcoded week-style constant (7/8)"

key-files:
  created:
    - lib/utils/getLocalMonthBounds.ts
    - convex/utils/localMonthBounds.ts
    - scripts/verifyMonthBucketing.ts
  modified:
    - package.json

key-decisions:
  - "Month validators mirror week validators' structure exactly (assertLocalMonthBounds/assertLocalMonthDates/getLocalMonthDayIndex) but every fixed length/span constant is replaced with one derived from dayStartsUtc.length, per RESEARCH.md Pitfall 4"
  - "toLocalDateString duplicated a third time (not extracted to a shared helper) — extraction deferred, would touch 3 files across 3 different plans"

patterns-established:
  - "Month-bounds pair (lib/utils/getLocalMonthBounds.ts + convex/utils/localMonthBounds.ts) establishes the exact shape convex/meals/getMonthMeals.ts, convex/glucose/getMonthReadings.ts, and convex/movement/getMonthMovement.ts (later plans) will import"

requirements-completed: [HIST-01]

# Metrics
duration: ~15min
completed: 2026-08-25
---

# Phase 68 Plan 02: Local Month Bounds Foundation Summary

**Client-side month-boundary calculator + server-side validator pair, generalizing the existing DST-safe week bucketing to variable month length (28-31 days), plus an automated ts-node verification script covering DST, both Februaries, indexing, and validator rejection.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-08-25
- **Tasks:** 3/3 completed
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- `lib/utils/getLocalMonthBounds.ts` computes `dayStartsUtc`/`monthDates` for any local month using DST-safe `new Date(year, month, day)` constructor math, with day count computed via `new Date(y, m+1, 0).getDate()` rather than hardcoded
- `convex/utils/localMonthBounds.ts` validates client-supplied month bounds server-side (length in `[29,32]`/`[28,31]`, per-step DST tolerance, span derived from actual array length — caps accepted window to ~31 days, mitigating T-68-04/T-68-05 DoS/tampering)
- `scripts/verifyMonthBucketing.ts` (`npm run script:verifyMonthBucketing`) proves DST correctness (October 2026 fall-back), both February lengths (2027 non-leap, 2028 leap), day-index lookup across the DST boundary, and 7 validator-rejection cases — all green, and the pre-existing `verifyWeekBucketing` script still passes unmodified

## Task Commits

Each task was committed atomically:

1. **Task 1: Клиентский расчёт границ месяца** - `3d18110` (feat)
2. **Task 2: Серверная валидация границ месяца** - `7c57497` (feat)
   - **Fix (found while writing Task 3's tests):** `4b2f642` (fix) — off-by-one in span check
3. **Task 3: Автоматическая проверка месячной раскладки** - `83a28b1` (test)
   - **Deferred-items log:** `ff22926` (docs)

_Note: Task 2's bug was only surfaced by Task 3's `assert.doesNotThrow` — fixed and committed separately per Rule 1 before Task 3's own commit._

## Files Created/Modified
- `lib/utils/getLocalMonthBounds.ts` - Default export `getLocalMonthBounds(now)`, DST-safe, variable month length
- `convex/utils/localMonthBounds.ts` - `assertLocalMonthBounds`, `assertLocalMonthDates`, `getLocalMonthDayIndex`, import-free of `convex/values`/generated types
- `scripts/verifyMonthBucketing.ts` - `node:assert/strict` battery, run via `TZ=Europe/Berlin ts-node -r tsconfig-paths/register`
- `package.json` - added `script:verifyMonthBucketing`, no other fields touched

## Decisions Made
- Kept `toLocalDateString` as a third private, non-exported duplicate (already exists in `getLocalWeekBounds.ts` and `lib/health/healthKit.ts`) rather than extracting a shared helper — per plan's explicit instruction, extraction would touch 3 files across 3 different plans and is out of this plan's scope.
- Used `new Date(...).endsWith("-01")` plus lexicographic-order + UTC-day-span checks for `assertLocalMonthDates`, mirroring `assertLocalWeekDates`'s `parseWeekDateUtc` pattern exactly (renamed `parseMonthDateUtc`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Off-by-one in `assertLocalMonthBounds` span check**
- **Found during:** Task 3 (writing `scripts/verifyMonthBucketing.ts`) — `assert.doesNotThrow` on a correct, freshly-computed October-2026 `dayStartsUtc` array threw `"Invalid month bounds"`
- **Issue:** Span tolerance was computed as `(dayCount - 1) * 24h ± 2h` instead of `dayCount * 24h ± 2h`. For a 31-day month this expected ~718-722h but the real span (30 full 24h days + 1 DST-lengthened 25h day = 745h) fell outside that window — every valid month would have been rejected.
- **Fix:** Changed `minSpan`/`maxSpan` to `dayCount * 24 * HOUR_MS ± 2 * HOUR_MS` (matching the week analog's `7 * 24h ± 2h` pattern, where `7` is the week's full day count, not `day count - 1`).
- **Files modified:** `convex/utils/localMonthBounds.ts`
- **Verification:** `npm run script:verifyMonthBucketing` — all assertions (including `assert.doesNotThrow` on the correct bounds array) pass; `npm run script:verifyWeekBucketing` unaffected (different file).
- **Committed in:** `4b2f642`

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Necessary for correctness — without the fix, the server validator would reject every legitimately-computed month, making the whole feature non-functional. No scope creep; fix confined to the single incorrect calculation in the file this plan already owns.

## Issues Encountered

`npx eslint .` (full-repo run, part of the plan's overall `<verification>` block) surfaces 8 pre-existing errors in 3 files this plan never touches (`app/app/(meal)/confirm-meal.tsx`, `app/auth/confirm-phone.tsx`, `components/meal/ConfirmMealItems.tsx`). Confirmed pre-existing lint debt, out of this plan's scope — logged to `.planning/phases/68-apple-health/deferred-items.md` (commit `ff22926`) rather than fixed. `npx eslint` restricted to this plan's own files (`lib/utils/getLocalMonthBounds.ts`, `convex/utils/localMonthBounds.ts`, `scripts/verifyMonthBucketing.ts`) is clean.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`getLocalMonthBounds`/`localMonthBounds` are ready to be imported by the month-scoped Convex queries planned for later waves (`convex/meals/getMonthMeals.ts`, `convex/glucose/getMonthReadings.ts`, `convex/movement/getMonthMovement.ts`, per 68-PATTERNS.md) — their exact export names/shapes match what those plans' pattern map already expects (`assertLocalMonthBounds`, `getLocalMonthDayIndex`, `assertLocalMonthDates`). No blockers.

---
*Phase: 68-apple-health*
*Completed: 2026-08-25*

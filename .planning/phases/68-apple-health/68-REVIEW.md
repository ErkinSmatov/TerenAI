---
phase: 68-apple-health
reviewed: 2026-08-29T18:59:39Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - app/app/(home)/calendar.tsx
  - app/app/(home)/day/[date].tsx
  - app/app/(tabs)/index.tsx
  - components/home/HomeGlucoseSummary.tsx
  - components/home/HomeHeader.tsx
  - components/observer/ObservedPatientCard.tsx
  - components/ui/WarningBadge.tsx
  - convex/_generated/api.d.ts
  - convex/bloodPressure/getMonthReadings.ts
  - convex/glucose/getMonthReadings.ts
  - convex/meals/getMonthMeals.ts
  - convex/movement/getMonthMovement.ts
  - convex/utils/localMonthBounds.ts
  - lib/health/healthKit.ts
  - lib/health/logHealthKitSync.ts
  - lib/hooks/useHealthKitSync.ts
  - lib/nutrition/estimateGlucoseFromMeals.ts
  - lib/utils/getLocalMonthBounds.ts
  - scripts/verifyGlucoseEstimate.ts
  - scripts/verifyMonthBucketing.ts
findings:
  critical: 2
  warning: 2
  info: 3
  total: 7
status: issues_found
---

# Phase 68: Code Review Report

**Reviewed:** 2026-08-29T18:59:39Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed the Apple Health integration surface: month-bucketing utilities and their Convex queries (meals/glucose/blood pressure/movement), the calendar and single-day history screens, the HealthKit sync hook and native bridge, the glucose-from-meals estimation model, and the two verification scripts. The DST-aware month-bucketing math (`lib/utils/getLocalMonthBounds.ts`, `convex/utils/localMonthBounds.ts`) is careful and demonstrably correct against `scripts/verifyMonthBucketing.ts`; the glucose-estimate curve (`lib/nutrition/estimateGlucoseFromMeals.ts`) is likewise correct against `scripts/verifyGlucoseEstimate.ts`. The manually-patched `convex/_generated/api.d.ts` was cross-checked against the actual files under `convex/glucose`, `convex/movement`, `convex/bloodPressure`, `convex/meals`, and `convex/utils` (including files outside the explicit review list, e.g. `convex/glucose/importHealthKitReadings.ts` and `convex/movement/syncDays.ts`, which are referenced by the same import graph) — the module map and export names are internally consistent with the real files, so the manual patch itself is not the source of the defects found below.

Two defects found during call-chain tracing are serious enough to block: (1) the home screen feeds the glucose-estimate function a data window that is far narrower than the function's own documented lookback design, silently producing wrong units/baseline for the "≈" estimate shown to users; (2) the HealthKit glucose import mutation deduplicates readings by an index that is not scoped to the current user, so a real reading can be silently dropped (or its presence in the system inferred) across accounts sharing the same physical HealthKit store.

## Critical Issues

### CR-01: Glucose estimate is computed from a single day of readings, defeating its own 14/30-day lookback design

**File:** `app/app/(tabs)/index.tsx:50, 79-82`
**Issue:** `estimateGlucoseFromMeals` is documented and implemented (`lib/nutrition/estimateGlucoseFromMeals.ts:75-110`, `GLUCOSE_ESTIMATE_CONSTANTS.BASELINE_LOOKBACK_MS = 14 days`, `UNIT_LOOKBACK_MS = 30 days`) to derive the user's preferred glucose unit and personal fasting baseline from a window of recent readings, explicitly so it doesn't fall back to the hardcoded default unit (`mmol/L`) or default baseline (`5.5 mmol/L`) when the user has real data nearby in time. `scripts/verifyGlucoseEstimate.ts` test 9 proves this by passing readings recorded 2 and 5 days in the past.

However, the only caller of this function passes `dayReadings`, which is the array of readings recorded **on the single currently-selected day** (`app/(tabs)/index.tsx:50`: `const dayReadings = weekReadings.at(selectedDay) ?? [];`), not the multi-day window the estimator expects:

```ts
const glucoseEstimate = isGlucometerTrack
  ? estimateGlucoseFromMeals(dayMeals, dayReadings, Date.now())
  : null;
```

Concretely: a glucometer-track user who logged a `mg/dL` fasting reading yesterday and no readings today will see the estimate silently rendered in `mmol/L` with baseline `5.5`, because `resolveTargetUnit`/`resolveBaselineMmol` never see yesterday's reading — it isn't in `dayReadings`. This is not an edge case; it happens on any day where the user hasn't logged a real reading yet, which is the exact scenario the estimate feature exists to cover. The result is a wrong-unit, wrong-baseline "≈" value shown as if it were personalized, which is actively misleading for a diabetes-adjacent health metric.

**Fix:**
```ts
// app/app/(tabs)/index.tsx
const allWeekReadings = weekReadings.flat();
const glucoseEstimate = isGlucometerTrack
  ? estimateGlucoseFromMeals(dayMeals, allWeekReadings, Date.now())
  : null;
```
Note `weekReadings` only covers 7 days, which still under-shoots the function's 14/30-day windows — if full lookback fidelity is required, fetch a dedicated longer-range readings query (or pass a broader range from `getMonthReadings`) instead of the single selected day.

### CR-02: HealthKit glucose import dedupes by `healthKitUuid` without scoping to the current user

**File:** `convex/glucose/importHealthKitReadings.ts:22-28` (invoked from `lib/hooks/useHealthKitSync.ts:72`)
**Issue:** The dedup check queries the `byHealthKitUuid` index, which is defined on `["healthKitUuid"]` only (`convex/tables/glucoseReadings.ts`), with no `userId` filter:

```ts
const existing = await ctx.db
  .query("glucoseReadings")
  .withIndex("byHealthKitUuid", (idx) =>
    idx.eq("healthKitUuid", reading.healthKitUuid)
  )
  .first();
if (existing) continue;
```

If any other account has ever imported a reading with that same `healthKitUuid` (realistic when the same physical device/HealthKit store is used by more than one app account — shared family device, QA/test accounts, account switching without revoking HealthKit permission), the current user's legitimate reading is silently skipped and never stored for them. This is a genuine data-loss bug, not merely theoretical: contrast with the sibling mutation `convex/movement/syncDays.ts:16-19`, which correctly scopes its existence check with `idx.eq("userId", userId).eq("date", day.date)` — the glucose importer is the outlier relative to the established pattern in the same phase. As a secondary effect, the returned `importedCount` also leaks a boolean signal about whether a given `healthKitUuid` already exists for *any* user in the system, a minor cross-tenant enumeration channel.

**Fix:** Scope the dedup check to the current user, e.g. add a compound index and use it:
```ts
// convex/tables/glucoseReadings.ts
.index("byUserIdAndHealthKitUuid", ["userId", "healthKitUuid"])
```
```ts
// convex/glucose/importHealthKitReadings.ts
const existing = await ctx.db
  .query("glucoseReadings")
  .withIndex("byUserIdAndHealthKitUuid", (idx) =>
    idx.eq("userId", userId).eq("healthKitUuid", reading.healthKitUuid)
  )
  .first();
if (existing) continue;
```

## Warnings

### WR-01: Cold-start throttle can suppress the very first HealthKit glucose sync

**File:** `lib/hooks/useHealthKitSync.ts:28-94`
**Issue:** `lastSyncedAtRef` is a single shared throttle gate for both movement and glucose sync, and the effect depends on `includeGlucose` (`[includeGlucose, syncMovementDays, importGlucoseReadings]`). On cold start, `profile` (and therefore `isGlucometerTrack`) is typically `undefined` on the first render, so the hook is first invoked with `includeGlucose = false`; `runSync` runs immediately and sets `lastSyncedAtRef.current = now` after only syncing movement. Once the profile query resolves and `includeGlucose` flips to `true`, the effect re-fires — but `msSinceLast` is only a few milliseconds/seconds, well under `SYNC_THROTTLE_MS` (5 minutes), so this second invocation is skipped entirely, including the glucose branch. The user's real HealthKit glucose readings won't import until the next app foreground transition or a 5-minute wait, even though this was the very first opportunity to do so for a glucometer-track user.
**Fix:** Track the throttle per capability (e.g. separate `lastMovementSyncRef`/`lastGlucoseSyncRef`), or don't update `lastSyncedAtRef` until after determining which branches actually ran, so a newly-enabled capability isn't penalized by a prior narrower run:
```ts
if (includeGlucose && lastGlucoseSyncRef.current === 0) {
  // always allow the first glucose-capable run through regardless of movement throttle
}
```

### WR-02: Day-detail screen shows premature "empty" state for glucose/BP/movement while those queries are still loading

**File:** `app/app/(home)/day/[date].tsx:143-171`
**Issue:** The loading guard only checks `rawMonthMeals === undefined` before rendering content. `rawMonthReadings`, `rawMonthBloodPressure`, and `rawMonthMovement` can still be `undefined` (in flight) at that point — they are immediately defaulted to empty arrays/`null` (`lines 161-166`) and rendered as "no data for this section" before the real data arrives, causing a visible flash from empty to populated once those queries resolve.
**Fix:** Extend the loading condition to also wait on the glucometer-gated queries when they are actually being requested:
```ts
const stillLoading =
  rawMonthMeals === undefined ||
  (isGlucometerTrack && (rawMonthReadings === undefined || rawMonthBloodPressure === undefined)) ||
  (Platform.OS === "ios" && rawMonthMovement === undefined);
```

## Info

### IN-01: `toLocalDateString` duplicated across three files

**File:** `lib/utils/getLocalMonthBounds.ts:10-15`, `lib/health/healthKit.ts:13-18`, and (per in-file comment) `lib/utils/getLocalWeekBounds.ts`
**Issue:** The same local-midnight-safe date formatter is copy-pasted three times. The in-file comment acknowledges this is deliberate to avoid touching three separate plans in this phase, but it's still a real duplication risk — a future fix to one copy (e.g., locale-specific formatting) can silently diverge from the others.
**Fix:** Track a follow-up to extract a single shared `toLocalDateString` helper (e.g. `lib/utils/dateFormat.ts`) once all three call sites can be touched in one change.

### IN-02: Calendar arrow buttons have no accessibility label

**File:** `app/app/(home)/calendar.tsx:145-151`
**Issue:** `renderArrow` returns bare `ChevronLeftIcon`/`ChevronRightIcon` elements with no `accessibilityLabel`/`accessibilityRole`, unlike the rest of the codebase's icon-only buttons (e.g. `components/home/HomeHeader.tsx:31,43` both set `accessibilityLabel`). VoiceOver users get an unlabeled control for month navigation.
**Fix:** Wrap the icons or pass through `react-native-calendars`' arrow accessibility props, e.g. render inside a `View accessibilityLabel={direction === "left" ? "Предыдущий месяц" : "Следующий месяц"}`.

### IN-03: DST/estimate correctness scripts are not wired into any automated check

**File:** `scripts/verifyMonthBucketing.ts`, `scripts/verifyGlucoseEstimate.ts` (see also `package.json` scripts `script:verifyMonthBucketing`, `script:verifyGlucoseEstimate`)
**Issue:** These scripts are the only proof of correctness for the DST-sensitive month-bucketing math and the glucose-estimate curve, but they exist only as manually-invoked `ts-node` scripts — there is no `test` script, CI workflow, or pre-commit hook that runs them. A future change could silently break either the DST edge-case handling or the estimate curve without any automated signal (this mirrors the pre-existing convention for `verifyWeekBucketing.ts`, so it is not unique to this phase, but the risk compounds with each new script added this way).
**Fix:** Add a `"test": "npm run script:verifyMonthBucketing && npm run script:verifyGlucoseEstimate && ..."` aggregate script, or migrate these into a real test runner, and reference it from CI if one exists.

---

_Reviewed: 2026-08-29T18:59:39Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

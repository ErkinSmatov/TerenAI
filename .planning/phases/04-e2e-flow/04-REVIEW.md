---
phase: 04-e2e-flow
reviewed: 2026-08-21T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - lib/utils/getFoodName.ts
  - convex/meals/getMeal.ts
  - convex/mealItems/getMealItem.ts
  - convex/meals/analyze/correctMeal.ts
  - app/app/(meal)/meal.tsx
  - app/app/(mealItem)/mealItem.tsx
  - app/app/(mealItem)/mealItemNutrients.tsx
  - app/app/(meal)/fix-meal.tsx
  - lib/utils/getLocalWeekBounds.ts
  - convex/utils/localWeekBounds.ts
  - scripts/verifyWeekBucketing.ts
  - convex/meals/getWeekMeals.ts
  - convex/glucose/getWeekReadings.ts
  - convex/bloodPressure/getWeekReadings.ts
  - convex/movement/getWeekMovement.ts
  - app/app/(tabs)/index.tsx
  - app/app/(home)/nutrients.tsx
  - app/app/(home)/movementLog.tsx
  - docs/PRODUCTION-DEBUGGING.md
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
resolution: "CR-01 fixed (commit 1fd0a73, 2026-08-21). WR-01..06 and IN-01..04 deferred to backlog by user decision — not blocking Phase 4 closure."
---

# Phase 04: Code Review Report

**Reviewed:** 2026-08-21T00:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed the meal detail/correction flow (`getMeal`, `getMealItem`, `correctMeal`, `meal.tsx`, `mealItem*.tsx`, `fix-meal.tsx`) and the local-week bucketing subsystem (`getLocalWeekBounds`, `localWeekBounds.ts`, `verifyWeekBucketing.ts`, the three `getWeek*` queries, and the home/nutrients/movement-log screens that consume them), plus `docs/PRODUCTION-DEBUGGING.md` for context.

The week-bucketing subsystem is solid: the client computes local-calendar day boundaries via the `new Date(y, m, d)` constructor (correctly resolving DST), the server only validates shape/width of the client-supplied bounds (documented, reasonable given a per-user-scoped query), and `scripts/verifyWeekBucketing.ts` is wired into `package.json` and asserts the exact DST-transition edge case the design targets. No defects found there.

The meal-correction flow has one clear blocker: `correctMeal.ts` sets a meal's status to `"processing"` and then has no error handling — unlike its sibling action `analyzeMealPhoto.ts`, which explicitly catches failures and reverts status to `"error"`. Any failure after the status flip (image URL fetch, FDC lookup, translation, health-score, or the final mutation) leaves the meal permanently stuck at `"processing"`, and because `getMeal.ts` only filters out `"error"`/`"deleted"` (not `"processing"`), the meal screen will show an infinite loading spinner with no recovery path. Several warnings around authorization-check ordering, missing concurrency guards, and a few screen-level robustness gaps round out the findings below.

## Critical Issues

### CR-01: `correctMeal` leaves the meal stuck in `"processing"` forever on any failure — ✓ FIXED (commit `1fd0a73`, 2026-08-21)

**File:** `convex/meals/analyze/correctMeal.ts:35-60`
**Issue:** The action flips the meal to `status: "processing"` (line 35-38) and then calls `correctMealItems` and `processDetectedItems`, both of which can throw (network failure calling the image URL, LLM/API failure inside `correctMealItems`, or any of the several `ctx.runQuery`/`ctx.runMutation` calls inside `processDetectedItems`, which only sets `status: "done"` as its very last statement). There is no `try/catch` here, unlike the sibling action `analyzeMealPhoto.ts`, which wraps its equivalent logic in a `try/catch` and explicitly reverts the meal to `status: "error"` on any failure (see `convex/meals/analyze/analyzeMealPhoto.ts:54-67`).

Because `getMeal.ts` only treats `"error"` and `"deleted"` as "hide this meal" statuses (`convex/meals/getMeal.ts:14`), a meal stuck at `"processing"` is still returned to the client. In `app/app/(meal)/meal.tsx`, `isDone` requires `meal.status === "done"` (line 176), so `isLoading` stays `true` forever (line 190) — the user sees an infinite spinner with no way to retry, dismiss, or otherwise recover the meal.

**Fix:**
```typescript
export const correctMeal = action({
  args: { mealId: v.id("meals"), correction: v.string() },
  handler: async (ctx, { mealId, correction }) => {
    // ...existing validation...

    await ctx.runMutation(api.meals.updateMeal.default, {
      id: mealId,
      meal: { status: "processing" },
    });

    try {
      const imageUrl = await ctx.storage.getUrl(meal.photoStorageId);
      if (!imageUrl) throw new Error("Image not found");

      const { mealName, items: newDetectedItems } = await correctMealItems({
        imageUrl,
        previousItems,
        correction,
      });

      await processDetectedItems({ ctx, mealId, detectedItems: newDetectedItems, imageUrl, mealName });
    } catch (error) {
      logError("correctMeal error", error);
      await ctx.runMutation(api.meals.updateMeal.default, {
        id: mealId,
        meal: { status: "error" },
      });
      throw error;
    }
  },
});
```

## Warnings

### WR-01: `getMeal` checks meal status before ownership, leaking status of other users' meals

**File:** `convex/meals/getMeal.ts:13-17`
**Issue:**
```typescript
const meal = await ctx.db.get(mealId);
if (!meal || meal.status === "error" || meal.status === "deleted") {
  return null;
}
if (meal.userId !== userId) throw new Error("Forbidden");
```
The status check runs *before* the ownership check. For a `mealId` that belongs to another user, the caller gets a different, observable outcome depending on that meal's status: `null` if it's `"error"`/`"deleted"` (indistinguishable from "doesn't exist"), but a thrown `"Forbidden"` error if it's `"processing"`/`"done"`. This lets a caller who has (or guesses/leaks) another user's `mealId` learn something about that meal's current status without owning it — an authorization-check-ordering bug, even though the practical blast radius is limited by Convex IDs being unguessable.
**Fix:** Check ownership first, then status:
```typescript
const meal = await ctx.db.get(mealId);
if (!meal) return null;
if (meal.userId !== userId) throw new Error("Forbidden");
if (meal.status === "error" || meal.status === "deleted") return null;
```

### WR-02: No guard against concurrent/duplicate `correctMeal` invocations

**File:** `convex/meals/analyze/correctMeal.ts:29-38`
**Issue:** `correctMeal` never checks the meal's current status before proceeding. If invoked twice in quick succession (retry after a slow network response, double-tap racing past the client-side `isCorrecting` guard in `fix-meal.tsx`, or a second device), two concurrent runs will both read the same `mealItems`, both call `processDetectedItems`, and both call `api.meals.replaceMealItems` — the loser's writes can race with or clobber the winner's, corrupting the meal's item list.
**Fix:** Reject (or dedupe) when the meal isn't in a terminal state, e.g. `if (meal.status === "processing") throw new Error("Meal is already being processed");` before setting status to `"processing"`.

### WR-03: AI rate-limit quota is consumed before validating the request can succeed

**File:** `convex/meals/analyze/correctMeal.ts:27-33`
**Issue:** `rateLimiter.limit(ctx, "aiFeatures", ...)` (line 27) runs before the meal is even fetched or validated to have a photo (lines 29-33). A request with an invalid `mealId`, a meal with no photo, or a not-found meal still burns one of the user's limited daily `aiFeatures` calls for a request that was guaranteed to fail.
**Fix:** Move the rate-limit check after `meal`/`photoStorageId` validation, or refund the limiter on early-exit failures.

### WR-04: `mealItemNutrients.tsx` calls `useQuery` without a `"skip"` guard, unlike sibling screens

**File:** `app/app/(mealItem)/mealItemNutrients.tsx:13-14`
**Issue:**
```typescript
const mealItem =
  useQuery(api.mealItems.getMealItem.default, { mealItemId }) ?? undefined;
```
`mealItemId` is typed as possibly-undefined (from `useLocalSearchParams`), yet this call passes `{ mealItemId }` unconditionally. Both sibling screens (`app/app/(mealItem)/mealItem.tsx:12-15` and `app/app/(meal)/meal.tsx:50-53`) correctly guard with `mealItemId ? { mealItemId } : "skip"`. If this screen ever mounts before the route param is hydrated (e.g. deep link, fast navigation transition), the query is called with a missing required `v.id("mealItems")` argument, which Convex will reject as an argument-validation error.
**Fix:**
```typescript
const mealItem =
  useQuery(
    api.mealItems.getMealItem.default,
    mealItemId ? { mealItemId } : "skip"
  ) ?? undefined;
```

### WR-05: Unauthorized access to a meal/mealItem throws an unhandled error instead of a graceful redirect

**File:** `app/app/(meal)/meal.tsx:167-169`, `app/app/(mealItem)/mealItem.tsx:12-27`
**Issue:** `meal.tsx` only redirects to `/app` when `data === null` (deleted/error/not-found meal, see `getMeal.ts:14`). If the query instead throws `"Forbidden"` (meal exists, belongs to another user, and isn't `error`/`deleted` — see WR-01), that exception propagates up through `useQuery` during render with no error boundary or try/catch anywhere in this component, crashing the screen instead of redirecting like the null case does. `mealItem.tsx` has no redirect handling at all for either case.
**Fix:** Wrap the screen in an error boundary, or catch the Convex error state (e.g. via `useQuery`'s error path / a wrapping helper) and redirect the same way the `null` case does.

### WR-06: Week-day title in `nutrients.tsx` is computed independently of the actual data bucketing

**File:** `app/app/(home)/nutrients.tsx:13-28`
**Issue:** The screen fetches `dayMeals` using `weekBounds.weekDates`/`weekBounds.dayStartsUtc` produced by `getLocalWeekBounds()` (the project's custom, DST-aware week algorithm), but then computes the *displayed title* for the same `index` via a completely separate calculation:
```typescript
const today = new Date();
const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
const targetDate = addDays(startOfCurrentWeek, index);
```
using `date-fns`. Both should always agree in the common case, but this duplicates "start of week" logic in two different implementations, and the `weekDates` array already contains the exact string needed (`weekBounds.weekDates[index]`). Any future divergence between the two algorithms (or `today` being evaluated at a different instant than `weekBounds`, e.g. exactly at a day boundary) would show a title that doesn't match the data actually displayed.
**Fix:** Derive the title from `weekBounds.weekDates[index]` directly:
```typescript
const targetDate = new Date(`${weekBounds.weekDates[index]}T00:00:00`);
const title = format(targetDate, "EEEE, d MMMM", { locale: ru });
```

## Info

### IN-01: Day-bucketing/sorting logic duplicated across three `getWeek*` queries

**File:** `convex/meals/getWeekMeals.ts:40-50`, `convex/glucose/getWeekReadings.ts:33-43`, `convex/bloodPressure/getWeekReadings.ts:33-46`
**Issue:** All three queries repeat the same pattern almost verbatim: build a 7-slot array, loop records through `getLocalWeekDayIndex`, push into the matching slot, then sort each slot descending by timestamp. Only the collection name and timestamp field differ.
**Fix:** Extract a shared helper, e.g. `bucketByLocalWeekDay(records, dayStartsUtc, getTimestamp)`, reused by all three queries.

### IN-02: `correction` isn't validated as non-empty server-side

**File:** `convex/meals/analyze/correctMeal.ts:16-19`
**Issue:** Only a max-length check exists (`correction.length > analyzeMealConfig.maxUserInputLength`). The client (`fix-meal.tsx`) trims and requires non-empty text before allowing submission, but any direct API caller can send `correction: ""` (or whitespace), which still consumes an `aiFeatures` rate-limit slot and triggers a no-op AI call.
**Fix:** `if (!correction.trim()) throw new Error("Correction is required");`

### IN-03: `fix-meal.tsx` silently no-ops when `mealId` is missing

**File:** `app/app/(meal)/fix-meal.tsx:35-36, 88-92`
**Issue:** `handleCorrect`'s early return includes `!mealId` but the button's `disabled` expression does not, so a user could tap "Исправить" while `mealId` is falsy and get no feedback at all (no toast, no state change).
**Fix:** Include `!mealId` in the `disabled` condition, or show a toast in the early-return branch.

### IN-04: `getMealItem` doesn't check the parent meal's status

**File:** `convex/mealItems/getMealItem.ts:16-18`
**Issue:** Unlike `getMeal.ts`, which hides meals with `status === "error" | "deleted"`, `getMealItem.ts` fetches the parent `meal` only to check ownership — it never checks whether that meal is `"error"` or `"deleted"`. A mealItem belonging to a deleted meal would still be served to the `mealItem.tsx`/`mealItemNutrients.tsx` screens even though the parent `meal.tsx` screen would redirect away.
**Fix:** Mirror `getMeal.ts`'s status check: `if (meal.status === "error" || meal.status === "deleted") return null;`

---

_Reviewed: 2026-08-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

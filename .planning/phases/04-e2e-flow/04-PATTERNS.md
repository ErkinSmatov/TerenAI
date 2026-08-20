# Phase 4: Сквозной сценарий тестера - Pattern Map

**Mapped:** 2026-08-20
**Files analyzed:** 12 (2 Convex queries, 1 Convex action, 3 client read-sites, 1 client screen, 4 DST query files, 1 client call-site file with 4 query invocations, 1 optional new shared helper)
**Analogs found:** 12 / 12 (all files being modified are themselves existing files with either a direct sibling analog or an established in-file precedent one screen away; one file has a near-perfect existing helper precedent for a new shared utility)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `convex/meals/getMeal.ts` | query | CRUD (read, degrade-not-throw) | `convex/mealItems/getMealItem.ts` (sibling, same bug pattern) | exact — same bug, same fix shape |
| `convex/mealItems/getMealItem.ts` | query | CRUD (read, degrade-not-throw) | `convex/meals/getMeal.ts` (sibling, same bug pattern) | exact |
| `convex/meals/analyze/correctMeal.ts` | service (Convex action) | request-response (AI call) | itself — internal `previousItems` mapping needs null-guard | exact (self-consistent fix, no external analog needed) |
| `app/app/(meal)/meal.tsx` | component/screen (read-site) | transform (query result → view items) | itself; naming fallback pattern already exists at line 183 (`?? item.food.name.en`) | exact — extend existing `??` pattern to also guard `item.food` itself |
| `app/app/(mealItem)/mealItem.tsx` | component/screen (read-site) | transform | same file, line 21 | exact |
| `app/app/(mealItem)/mealItemNutrients.tsx` | component/screen (read-site) | transform | same file, line 20 | exact |
| `app/app/(meal)/fix-meal.tsx` | screen (form + async action) | request-response | `app/auth/phone-sign-in.tsx` | exact — same `tryCatch` + `isSending` + `Toast.show` + `ScreenFooterButton disabled` shape |
| `convex/meals/getWeekMeals.ts` | query | batch (weekly bucketing) | `convex/utils/localDayBoundaries.ts` (existing helper, same math, different scope) + 3 sibling `getWeek*` files | role-match — helper exists for *daily* boundaries; weekly per-day array is a new extraction but reuses the same math/idiom |
| `convex/glucose/getWeekReadings.ts` | query | batch | `convex/meals/getWeekMeals.ts` (byte-identical algorithm) | exact — literal duplicate |
| `convex/bloodPressure/getWeekReadings.ts` | query | batch | `convex/meals/getWeekMeals.ts` (byte-identical algorithm) | exact — literal duplicate |
| `convex/movement/getWeekMovement.ts` | query | batch | `convex/meals/getWeekMeals.ts` (week-boundary calc identical; per-item bucketing differs, pre-tagged by date string) | role-match — boundary calc identical, per-item logic differs |
| `app/app/(tabs)/index.tsx` (client call sites, 4x `useQuery`) | screen (query invocation) | request-response | itself — 4 near-identical `useQuery(..., { timezoneOffsetMinutes: new Date().getTimezoneOffset() })` call sites in the same file | exact — same file, same pattern repeated 4x |
| `convex/utils/getLocalWeekBounds.ts` (optional new shared helper, if planner chooses to extract) | utility | batch (pure function) | `convex/utils/localDayBoundaries.ts` (existing helper, same directory, same doc-comment convention) | exact — same file, same author intent, same `convex/utils/` location convention |

## Pattern Assignments

### `convex/meals/getMeal.ts` (query, CRUD)

**Analog:** `convex/mealItems/getMealItem.ts` (identical bug, same file shape — cross-reference each other)

**Full current file** (`convex/meals/getMeal.ts`, all 42 lines — small file, already read in full):
```typescript
import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const getMeal = query({
  args: { mealId: v.id("meals") },
  handler: async (ctx, { mealId }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const meal = await ctx.db.get(mealId);
      if (!meal || meal.status === "error" || meal.status === "deleted") {
        return null;
      }
      if (meal.userId !== userId) throw new Error("Forbidden");

      const mealItems = await ctx.db
        .query("mealItems")
        .withIndex("byMealId", (q) => q.eq("mealId", mealId))
        .collect();

      const mealItemsWithFood = await Promise.all(
        mealItems.map(async (mealItem) => {
          const food = await ctx.db.get(mealItem.foodId);
          if (!food) throw new Error("Food not found");   // ← D-01: replace throw with `food: null`

          return { ...mealItem, food };
        })
      );

      return { meal, mealItems: mealItemsWithFood };
    } catch (error) {
      logError("getMeal error", error);
      throw error;
    }
  },
});

export default getMeal;
```

**Fix shape (line 26-30):** change `if (!food) throw new Error("Food not found");` to leave `food` nullable and return `{ ...mealItem, food: food ?? null }` (or `food ?? null`) instead of throwing. Keep the outer `try/catch` + `logError` untouched — that pattern still applies to genuinely unexpected errors (auth, forbidden, meal not found), only the FK-missing case changes from throw to degrade. This matches RESEARCH.md's recommendation: keep `food: Doc<"foods"> | null`, do not synthesize a fake `Doc<"foods">`.

**Auth/authorization pattern** (lines 10-17) — unchanged, reuse verbatim:
```typescript
const userId = await getAuthUserId(ctx);
if (userId === null) throw new Error("Unauthorized");
// ...
if (meal.userId !== userId) throw new Error("Forbidden");
```

**Error handling pattern** (lines 34-37) — unchanged, reuse verbatim:
```typescript
} catch (error) {
  logError("getMeal error", error);
  throw error;
}
```

---

### `convex/mealItems/getMealItem.ts` (query, CRUD)

**Analog:** `convex/meals/getMeal.ts` (apply the identical fix to the identical bug)

**Full current file** (34 lines, already read in full):
```typescript
import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import logError from "../../lib/utils/logError";

const getMealItem = query({
  args: { mealItemId: v.id("mealItems") },
  handler: async (ctx, { mealItemId }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const mealItem = await ctx.db.get(mealItemId);
      if (!mealItem) return null;

      const meal = await ctx.db.get(mealItem.mealId);
      if (!meal) throw new Error("Meal not found");
      if (meal.userId !== userId) throw new Error("Forbidden");

      const food = await ctx.db.get(mealItem.foodId);
      if (!food) throw new Error("Food not found");   // ← same bug pattern as getMeal.ts:27

      const mealItemWithFood = { ...mealItem, food };

      return mealItemWithFood;
    } catch (error) {
      logError("getMeal error", error);
      throw error;
    }
  },
});

export default getMealItem;
```

**Fix shape (line 20-21):** same as `getMeal.ts` — return `food: food ?? null` instead of throwing. Note: this file's `logError` message string says `"getMeal error"` even though the function is `getMealItem` (pre-existing inconsistency, not in scope to fix unless trivial).

**Why both files must be fixed together (Pitfall 1 from RESEARCH.md):** `components/meal/MealItems.tsx` renders every ingredient row as a `<Link href="/app/(mealItem)/mealItem" params={{mealItemId}}>` (not disabled for placeholder rows) — tapping the placeholder "Продукт недоступен" row navigates to a screen backed by `getMealItem.ts`. If only `getMeal.ts` is fixed, the meal-detail screen stops crashing but tapping the degraded row crashes on `getMealItem.ts`'s untouched line 21.

---

### `convex/meals/analyze/correctMeal.ts` (Convex action, request-response)

**No external analog — self-consistent fix based on D-01's own data-shape change.**

**Relevant excerpt** (lines 29-46):
```typescript
const result = await ctx.runQuery(api.meals.getMeal.default, { mealId });
if (!result) throw new Error("Meal not found");
const { meal, mealItems } = result;

if (!meal.photoStorageId) throw new Error("Meal has no photo");

await ctx.runMutation(api.meals.updateMeal.default, {
  id: mealId,
  meal: { status: "processing" },
});

const imageUrl = await ctx.storage.getUrl(meal.photoStorageId);
if (!imageUrl) throw new Error("Image not found");

const previousItems = mealItems.map((item) => ({
  name: item.food.name.en,   // ← D-05: crashes once getMeal.ts allows food: null
  grams: item.grams,
}));
```

**Fix shape (line 44):** guard `item.food` before accessing `.name.en`, e.g. `name: item.food ? item.food.name.en : "неизвестный продукт"` (or skip degraded items entirely — planner's call within CONTEXT.md D-05's scope). This is a direct, provable consequence of the `getMeal.ts` fix (RESEARCH.md Pitfall 2) — must ship in the same task as D-01, not as a separate follow-up, or `correctMeal` guarantee-fails for any meal with a degraded item (undermining D-02's "user can retry").

**Recommended shared idiom** (RESEARCH.md, applies at all 5 read sites including this one):
```typescript
const foodName = item.food
  ? (item.food.name.ru ?? item.food.name.en)
  : "Продукт недоступен";
```

---

### `app/app/(meal)/meal.tsx` (screen, transform) — read-site 1 of 3

**Analog:** itself — the file already has a `??` fallback pattern one property away (line 183) that should be extended to also guard `item.food` itself.

**Current excerpt** (lines 180-187):
```typescript
const items = isDone
  ? mealItems.map((item) => ({
      id: item._id,
      name: item.food.name.ru ?? item.food.name.en,   // ← crashes if item.food is null
      calories: macrosToKcal(item.macrosPer100g) * (item.grams / 100),
      grams: item.grams,
    }))
  : undefined;
```

**Fix shape:** `name: item.food ? (item.food.name.ru ?? item.food.name.en) : "Продукт недоступен"`. Note `macrosToKcal(item.macrosPer100g)` already reads from `mealItems` table fields independent of `food` (per RESEARCH.md — `macrosPer100g`/`nutrientsPer100g` live on `mealItems`, not `foods`), so calorie/gram display is unaffected by a null `food`, only the name string needs the guard.

---

### `app/app/(mealItem)/mealItem.tsx` (screen, transform) — read-site 2 of 3

**Analog:** same fix idiom as above.

**Current excerpt** (lines 18-25):
```typescript
export default function MealItemScreen() {
  const { mealItemId } = useLocalSearchParams<{ mealItemId: Id<"mealItems"> }>();
  const mealItem = useQuery(api.mealItems.getMealItem.default, mealItemId ? { mealItemId } : "skip");
  const isLoading = mealItem === undefined;

  return (
    <MealItem
      mealItemId={mealItemId}
      name={mealItem?.food.name.ru ?? mealItem?.food.name.en}   // ← crashes if mealItem.food is null (not undefined — optional chaining on mealItem itself doesn't cover the nested .food)
      mealItem={mealItem ?? undefined}
      loading={isLoading}
    />
  );
}
```

**Fix shape:** `name={mealItem?.food ? (mealItem.food.name.ru ?? mealItem.food.name.en) : "Продукт недоступен"}`.

---

### `app/app/(mealItem)/mealItemNutrients.tsx` (screen, transform) — read-site 3 of 3

**Current excerpt** (line 20):
```typescript
const name = mealItem?.food.name.ru ?? mealItem?.food.name.en ?? "";
```

**Fix shape:** `const name = mealItem?.food ? (mealItem.food.name.ru ?? mealItem.food.name.en) : "Продукт недоступен";`

---

### `app/app/(meal)/fix-meal.tsx` (screen, request-response) — D-02

**Analog:** `app/auth/phone-sign-in.tsx` (exact precedent, already committed and working)

**Analog's full async-handler pattern** (`app/auth/phone-sign-in.tsx` lines 1-19 imports, 30-31 state, 39-61 handler, 92-98 button):
```typescript
// Imports (lines 18-19)
import tryCatch from "@/lib/utils/tryCatch";
import { Toast } from "@/components/ui/Toast";

// State (line 31)
const [isSending, setIsSending] = useState(false);

// Handler (lines 39-61)
const handleSubmit = async (provider: PhoneOtpProvider) => {
  if (isSending) return;

  const result = PhoneForm.safeParse({ phone });
  if (!result.success) {
    inputRef.current?.flashError();
    return;
  }

  setIsSending(true);
  const { error } = await tryCatch(signIn(provider, { phone }));
  setIsSending(false);

  if (error) {
    Toast.show({ text: sendCodeErrorText, variant: "error" });
    return;
  }

  router.push({ pathname: "/auth/confirm-phone", params: { phone, provider } });
};

// Button (lines 92-98)
<ScreenFooterButton
  disabled={isSending}
  onPress={() => void handleSubmit("whatsapp-otp")}
>
  WhatsApp
</ScreenFooterButton>
```

**`tryCatch` utility** (`lib/utils/tryCatch.ts`, full file, 23 lines — import as `import tryCatch from "@/lib/utils/tryCatch";`):
```typescript
type Success<T> = { data: T; error: null };
type Failure<E> = { data: null; error: E };
type Result<T, E = Error> = Success<T> | Failure<E>;

export default async function tryCatch<T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}
```

**`Toast.show` API** (`components/ui/Toast.tsx` lines 24-27, 54-58):
```typescript
export type ToastOptions = {
  text: string;
  variant?: "default" | "success" | "error";
};
export const Toast = {
  show(options: ToastOptions) {
    emitter.emit(options);
  },
};
// usage: Toast.show({ text: "...", variant: "error" });
```

**Current buggy code in `fix-meal.tsx`** (lines 33-51, the file being fixed):
```typescript
const handleCorrect = () => {
  if (!mealId || !correction.trim()) return;

  if (status && !status.ok) {
    Toast.show({ text: "Вы достигли дневного лимита функций ИИ.", variant: "error" });
    return;
  }

  try {
    void correctMeal({ mealId, correction });   // ← bug: no await, catch never sees the rejection
    router.dismiss();                            // ← dismisses before the call even resolves
  } catch (error) {
    console.error(error);
    alert("Ошибка при исправлении блюда");       // ← bug: alert() instead of Toast, per D-02
  }
};
```

**Recommended fix shape** (per RESEARCH.md, applying the phone-sign-in.tsx pattern verbatim):
```typescript
const [isCorrecting, setIsCorrecting] = useState(false);

const handleCorrect = async () => {
  if (!mealId || !correction.trim() || isCorrecting) return;

  if (status && !status.ok) {
    Toast.show({ text: "Вы достигли дневного лимита функций ИИ.", variant: "error" });
    return;
  }

  setIsCorrecting(true);
  const { error } = await tryCatch(correctMeal({ mealId, correction }));
  setIsCorrecting(false);

  if (error) {
    Toast.show({ text: "Ошибка при исправлении блюда", variant: "error" });
    return; // stay on screen — D-02 requirement, no router.dismiss() on error
  }
  router.dismiss(); // only dismiss on confirmed success
};
```

**Loading-indicator precedent — text-swap, not spinner** (same file, existing conditional one line away, lines 87-89 — no `ActivityIndicator` exists anywhere in `app/` or `components/` per RESEARCH.md grep):
```typescript
<ScreenFooterButton
  onPress={handleCorrect}
  disabled={!correction.trim() || (status !== undefined && !status.ok) || isCorrecting}
>
  {status !== undefined && !status.ok
    ? "Лимит исчерпан"
    : isCorrecting
      ? "Исправляем..."
      : "Исправить"}
</ScreenFooterButton>
```

**Required imports to add** (already used pattern in `phone-sign-in.tsx`):
```typescript
import tryCatch from "@/lib/utils/tryCatch";
```
(`Toast` is already imported in `fix-meal.tsx`; `useState` is already imported.)

---

### DST fix: `convex/meals/getWeekMeals.ts` + 3 sibling files (`convex/glucose/getWeekReadings.ts`, `convex/bloodPressure/getWeekReadings.ts`, `convex/movement/getWeekMovement.ts`) — per D-04, all four in scope

**Analog for the bug pattern itself:** each of the 4 files IS the analog for the other 3 — the buggy algorithm is byte-identical across `getWeekMeals.ts`, `getWeekReadings.ts` (glucose), `getWeekReadings.ts` (bloodPressure); `getWeekMovement.ts` shares the identical week-boundary calculation but buckets per-item differently (pre-tagged `date` string, not raw timestamp re-derivation).

**Analog for the fix shape/convention:** `convex/utils/localDayBoundaries.ts` — an **already-existing helper in this exact codebase** solving the same class of problem (local-day-boundary math from a `timezoneOffsetMinutes` input) for a different caller (observer queries, Phase 03+). This is the strongest possible precedent for where/how to place a new shared helper: same directory (`convex/utils/`), same doc-comment convention (Russian, explains *why* the helper exists and explicitly what it does NOT yet cover), same pure-function shape (no `ctx` dependency, easily unit-testable).

**Full existing helper** (`convex/utils/localDayBoundaries.ts`, 23 lines, already read in full — copy this file's structure/convention for any new `getLocalWeekBounds.ts`):
```typescript
const dayMs = 24 * 60 * 60 * 1000;

/**
 * Границы локальных суток по смещению часового пояса.
 *
 * Воспроизводит математику, уже проверенную в convex/glucose/getWeekReadings.ts,
 * обобщённую для новых observer-запросов (планы 03+), чтобы не появлялась
 * ещё одна копия той же математики. Существующие недельные запросы
 * (getWeekMeals, getWeekReadings, getWeekMovement) этот helper НЕ используют —
 * они не рефакторятся в рамках этой фазы.
 */
export function localDayBoundaries(
  nowMs: number,
  timezoneOffsetMinutes: number
): { startUtc: number; endUtc: number; dateString: string } {
  const offsetMs = timezoneOffsetMinutes * 60_000;
  const localNowMs = nowMs - offsetMs;
  const localMidnightMs = Math.floor(localNowMs / dayMs) * dayMs;
  const startUtc = localMidnightMs + offsetMs;
  const endUtc = startUtc + dayMs;
  const dateString = new Date(localMidnightMs).toISOString().slice(0, 10);

  return { startUtc, endUtc, dateString };
}
```
Note the doc comment's own text explicitly flags that the 4 week-query files were NOT migrated to use it — this phase is the first natural point to either extract a sibling `getLocalWeekBounds.ts` (per-day-offset-array version) using the identical convention, or inline the per-day-offset fix directly in all 4 files without a shared helper. Either is consistent with codebase precedent; a shared helper is one file's worth of extra work and directly matches the existing `localDayBoundaries.ts` pattern next to it.

**Current buggy algorithm** (identical across `getWeekMeals.ts` lines 17-27, `glucose/getWeekReadings.ts` lines 17-27, `bloodPressure/getWeekReadings.ts` lines 17-27):
```typescript
const now = Date.now();
const offsetMs = timezoneOffsetMinutes * 60_000;       // ← single offset for entire week

const localNowMs = now - offsetMs;
const localMidnightMs = Math.floor(localNowMs / dayMs) * dayMs;
const localDayOfWeek = new Date(localNowMs).getUTCDay();
const daysFromMonday = (localDayOfWeek + 6) % 7;
const localMondayStartMs = localMidnightMs - daysFromMonday * dayMs;

const weekStartUtc = localMondayStartMs + offsetMs;
const weekEndUtc = weekStartUtc + 7 * dayMs;
// ... later, per item:
const localMealMs = meal._creationTime - offsetMs;      // ← same fixed offset reused per-item
const dayIndex = Math.floor((localMealMs - localMondayStartMs) / dayMs);
```

**Client call site** (`app/app/(tabs)/index.tsx` lines 35-65, all 4 `useQuery` invocations in the same file, same single-offset bug on the client side):
```typescript
const rawWeekMeals = useQuery(api.meals.getWeekMeals.default, {
  timezoneOffsetMinutes: new Date().getTimezoneOffset(), // computed ONCE for "now"
});
// ...
const rawWeekReadings = useQuery(
  api.glucose.getWeekReadings.default,
  isGlucometerTrack ? { timezoneOffsetMinutes: new Date().getTimezoneOffset() } : "skip"
);
// ...
const rawWeekBloodPressure = useQuery(
  api.bloodPressure.getWeekReadings.default,
  isGlucometerTrack ? { timezoneOffsetMinutes: new Date().getTimezoneOffset() } : "skip"
);
// ...
const rawWeekMovement = useQuery(
  api.movement.getWeekMovement.default,
  Platform.OS === "ios" ? { timezoneOffsetMinutes: new Date().getTimezoneOffset() } : "skip"
);
```

**Recommended fix shape** (RESEARCH.md, zero new dependencies): client computes a **per-day offset array** (7 numbers, one `Date.prototype.getTimezoneOffset()` call per day of the target week) instead of a single number; each of the 4 query files' `args` changes from `timezoneOffsetMinutes: v.number()` to an array/tuple of 7, and the per-item bucketing step uses `offsets[dayIndex]` instead of the single `offsetMs`. `getWeekMovement.ts` only needs the week-boundary portion fixed (lines 24-28) since its per-item bucketing already uses pre-tagged date strings, not per-item offset re-derivation.

**Note also in `app/app/(meal)/nutrients.tsx`:13** — RESEARCH.md flags a further call site using the same single-offset pattern; verify during implementation whether it calls one of these 4 query files.

---

## Shared Patterns

### Async error handling in client screens (D-02)
**Source:** `app/auth/phone-sign-in.tsx` (also `app/auth/confirm-phone.tsx`, `app/app/(tabs)/settings.tsx`)
**Apply to:** `app/app/(meal)/fix-meal.tsx`
```typescript
setIsX(true);
const { error } = await tryCatch(someAsyncCall());
setIsX(false);
if (error) {
  Toast.show({ text: "...", variant: "error" });
  return;
}
```
`fix-meal.tsx` is presently the only screen in the codebase still using `alert()` — this phase brings it in line with the established pattern.

### Convex query error handling (D-01)
**Source:** every file in `convex/meals/*.ts`, `convex/mealItems/*.ts` (e.g. `getMeal.ts` lines 9, 34-37)
**Apply to:** `getMeal.ts`, `getMealItem.ts`, `getWeekMeals.ts` + 3 siblings (unchanged by this phase — only the FK-missing / DST math inside the `try` changes, not the outer `try/catch` + `logError` wrapper)
```typescript
try {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Unauthorized");
  // ... query logic ...
} catch (error) {
  logError("<queryName> error", error);
  throw error;
}
```

### Null-safe food name across all 5 read sites (D-01, D-05)
**Source:** RESEARCH.md's recommended idiom, no single existing analog but consistent with the `?? item.food.name.en` fallback already present in 3 of the 5 sites
**Apply to:** `getMeal.ts` return shape, `correctMeal.ts:44`, `meal.tsx:183`, `mealItem.tsx:21`, `mealItemNutrients.tsx:20`
```typescript
const foodName = item.food
  ? (item.food.name.ru ?? item.food.name.en)
  : "Продукт недоступен";
```

### Shared week/day-boundary math convention (DST fix)
**Source:** `convex/utils/localDayBoundaries.ts` (existing helper, same directory convention, same doc-comment style)
**Apply to:** any new `convex/utils/getLocalWeekBounds.ts` extraction, or inline per-day-offset-array fix in all 4 `getWeek*` files
- Location convention: `convex/utils/`, not `convex/lib/` (no `convex/lib/` directory exists in this codebase)
- Doc-comment convention: Russian, explains rationale and explicitly what is/isn't covered
- Pure function, no `ctx` dependency — testable via the existing ad-hoc `ts-node -r tsconfig-paths/register` script convention (e.g. `scripts/importFdcData.ts`) if the planner chooses to add `scripts/verifyWeekBucketing.ts` per RESEARCH.md's Wave 0 Gap note

## No Analog Found

None. Every file in scope for this phase already exists in the codebase (this is a bug-fix phase, not new-feature phase) — each has either a direct sibling with the identical bug (D-01's two query files, DST's four query files) or an established in-file/in-codebase precedent one file away (D-02's `phone-sign-in.tsx`, DST's `localDayBoundaries.ts`). The only genuinely "new" file under discussion (`convex/utils/getLocalWeekBounds.ts`) has a near-perfect structural analog already sitting in the same directory.

## Metadata

**Analog search scope:** `convex/meals/`, `convex/mealItems/`, `convex/glucose/`, `convex/bloodPressure/`, `convex/movement/`, `convex/utils/`, `app/app/(meal)/`, `app/app/(mealItem)/`, `app/app/(tabs)/`, `app/auth/`, `components/meal/`, `components/ui/`, `lib/utils/`
**Files scanned:** 20 (all read in full via direct `Read` calls — no file in this phase exceeded 2,000 lines, so no `Grep`-first targeting was required)
**Pattern extraction date:** 2026-08-20

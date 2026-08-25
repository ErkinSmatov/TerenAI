# Phase 68: Apple Health, оценка глюкозы, месячная история - Pattern Map

**Mapped:** 2026-08-25
**Files analyzed:** 16
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/hooks/useHealthKitSync.ts` (MODIFY) | hook | event-driven | itself (existing file, bug fix) | exact |
| `lib/health/healthKit.ts` | utility | request-response | itself (no fetch-function changes needed) | exact |
| `lib/utils/getLocalMonthBounds.ts` (NEW) | utility | transform | `lib/utils/getLocalWeekBounds.ts` | exact |
| `convex/utils/localMonthBounds.ts` (NEW) | utility | transform | `convex/utils/localWeekBounds.ts` | exact |
| `convex/meals/getMonthMeals.ts` (NEW) | route (Convex query) | CRUD (read) | `convex/meals/getWeekMeals.ts` | exact |
| `convex/glucose/getMonthReadings.ts` (NEW) | route (Convex query) | CRUD (read) | `convex/glucose/getWeekReadings.ts` | exact |
| `convex/movement/getMonthMovement.ts` (NEW) | route (Convex query) | CRUD (read) | `convex/movement/getWeekMovement.ts` | exact |
| `convex/bloodPressure/getMonthReadings.ts` (NEW, optional) | route (Convex query) | CRUD (read) | `convex/bloodPressure/getWeekReadings.ts` | exact |
| `scripts/verifyMonthBucketing.ts` (NEW) | test | batch | `scripts/verifyWeekBucketing.ts` | exact |
| `lib/nutrition/estimateGlucoseFromMeals.ts` (NEW) | utility | transform | `lib/nutrition/calculateDayTotals.ts` (shape/style) + `convex/observers/utils/thresholds.ts` (pure-function style) | role-match |
| `scripts/verifyGlucoseEstimate.ts` (NEW) | test | batch | `scripts/verifyWeekBucketing.ts` | role-match |
| `app/app/(home)/calendar.tsx` (NEW) | route/component | request-response | `app/app/(home)/glucoseLog.tsx` | exact |
| `app/app/(home)/day/[date].tsx` (NEW) | route/component | request-response | `app/app/(settings)/observedPatient/[patientId].tsx` | exact |
| `components/home/HomeHeader.tsx` (MODIFY) | component | request-response | itself (existing streak-button pattern) | exact |
| `components/home/HomeGlucoseSummary.tsx` (MODIFY) | component | request-response | itself (add `EstimateRow` sibling to `ReadingRow`) | exact |
| `components/ui/WarningBadge.tsx` (NEW, extracted) | component | transform | `components/observer/ObservedPatientCard.tsx` (`WarningBadge` inline function, lines 63-82) | exact |
| `app/app/(tabs)/index.tsx` (MODIFY) | route/component | request-response | itself (existing screen) | exact |

## Pattern Assignments

### `lib/utils/getLocalMonthBounds.ts` (utility, transform)

**Analog:** `lib/utils/getLocalWeekBounds.ts` (full file, 35 lines — read directly, reproduced below)

**Full pattern to mirror:**
```typescript
// Source: lib/utils/getLocalWeekBounds.ts
export type LocalWeekBounds = {
  dayStartsUtc: number[];
  weekDates: string[];
};

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function getLocalWeekBounds(
  now: Date = new Date()
): LocalWeekBounds {
  const daysFromMonday = (now.getDay() + 6) % 7;

  const dayStartsUtc: number[] = [];
  const weekDates: string[] = [];

  for (let i = 0; i <= 7; i++) {
    const localDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysFromMonday + i
    );
    dayStartsUtc.push(localDate.getTime());
    if (i < 7) {
      weekDates.push(toLocalDateString(localDate));
    }
  }

  return { dayStartsUtc, weekDates };
}
```

**Month adaptation notes:**
- Anchor on `new Date(now.getFullYear(), now.getMonth(), 1)` instead of Monday-of-week.
- Day count = `new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()` (28-31), NOT a hardcoded 7.
- Loop `for (let i = 0; i <= dayCount; i++)` (variable length +1 boundary), same `new Date(year, month, day)` constructor-math DST-safe approach — do not use `Date.UTC` or a fixed offset.
- Export `LocalMonthBounds = { dayStartsUtc: number[]; monthDates: string[] }`.
- Reuse `toLocalDateString` verbatim (copy or extract to a shared helper — currently duplicated as a private, non-exported function in both `getLocalWeekBounds.ts` and `lib/health/healthKit.ts`; do not create a third silent duplicate without checking if extraction is warranted).

---

### `convex/utils/localMonthBounds.ts` (utility, transform — server validation)

**Analog:** `convex/utils/localWeekBounds.ts` (full file, 88 lines — read directly, reproduced below)

**Full pattern to mirror:**
```typescript
// Source: convex/utils/localWeekBounds.ts
const HOUR_MS = 60 * 60 * 1000;
const MIN_STEP_MS = 22 * HOUR_MS;
const MAX_STEP_MS = 26 * HOUR_MS;
const WEEK_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertLocalWeekBounds(dayStartsUtc: number[]): void {
  if (dayStartsUtc.length !== 8) {
    throw new Error("Invalid week bounds");
  }
  for (const ms of dayStartsUtc) {
    if (!Number.isFinite(ms) || !Number.isInteger(ms)) {
      throw new Error("Invalid week bounds");
    }
  }
  for (let i = 0; i < dayStartsUtc.length - 1; i++) {
    const step = dayStartsUtc[i + 1] - dayStartsUtc[i];
    if (step <= 0 || step < MIN_STEP_MS || step > MAX_STEP_MS) {
      throw new Error("Invalid week bounds");
    }
  }
  const span = dayStartsUtc[7] - dayStartsUtc[0];
  if (span < MIN_SPAN_MS || span > MAX_SPAN_MS) {
    throw new Error("Invalid week bounds");
  }
}

export function getLocalWeekDayIndex(
  dayStartsUtc: number[],
  timestampUtc: number
): number {
  for (let i = 0; i < 7; i++) {
    if (timestampUtc >= dayStartsUtc[i] && timestampUtc < dayStartsUtc[i + 1]) {
      return i;
    }
  }
  return -1;
}
```

**Month adaptation notes (see RESEARCH.md Pitfall 4 — do NOT copy the fixed-length checks verbatim):**
- `assertLocalMonthBounds(dayStartsUtc)`: validate `length` is in range `[29, 32]` (28-31 days + 1 boundary), not `!== 8`. Per-step tolerance (`MIN_STEP_MS`/`MAX_STEP_MS` = 22h/26h) stays the same — DST tolerance is independent of period length.
- Span check must be computed from actual month length, not a fixed constant: `expectedDays = new Date(year, month + 1, 0).getDate()`, tolerance ±2h same as week.
- `getLocalMonthDayIndex(dayStartsUtc, timestampUtc)`: same loop shape as `getLocalWeekDayIndex` but loop bound is `dayStartsUtc.length - 1`, not a hardcoded `7`.
- `assertLocalMonthDates(monthDates)`: validate length `[28, 31]`, same `WEEK_DATE_PATTERN`-style regex, monotonic order, span computed via month length not a hardcoded `SIX_DAYS_MS`.
- File must stay import-free of `convex/values`/generated server types — it's imported both from Convex queries and from the ad-hoc `ts-node` verify script (see file header comment in the analog, lines 1-15, explaining this constraint verbatim — copy the same doc-comment convention).

---

### `convex/meals/getMonthMeals.ts` (route/Convex query, CRUD read)

**Analog:** `convex/meals/getWeekMeals.ts` (full file, 56 lines — read directly, reproduced below)

```typescript
// Source: convex/meals/getWeekMeals.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import {
  assertLocalWeekBounds,
  getLocalWeekDayIndex,
} from "../utils/localWeekBounds";

const getWeekMeals = query({
  args: {
    dayStartsUtc: v.array(v.number()),
  },
  handler: async (ctx, { dayStartsUtc }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      assertLocalWeekBounds(dayStartsUtc);
      const weekStartUtc = dayStartsUtc[0];
      const weekEndUtc = dayStartsUtc[7];

      const mealsQuery = ctx.db
        .query("meals")
        .withIndex("byUserId", (idx) =>
          idx
            .eq("userId", userId)
            .gte("_creationTime", weekStartUtc)
            .lt("_creationTime", weekEndUtc)
        )
        .filter((q) => q.neq(q.field("status"), "deleted"));

      const meals = await mealsQuery.collect();

      const week = Array.from({ length: 7 }, () => [] as typeof meals);
      for (const meal of meals) {
        const dayIndex = getLocalWeekDayIndex(dayStartsUtc, meal._creationTime);
        if (dayIndex >= 0 && dayIndex < 7) {
          week[dayIndex].push(meal);
        }
      }

      for (const dayMeals of week) {
        dayMeals.sort((a, b) => b._creationTime - a._creationTime);
      }

      return week;
    } catch (error) {
      logError("getWeekMeals error", error);
      throw error;
    }
  },
});

export default getWeekMeals;
```

**Month adaptation:** rename to `getMonthMeals`, import from `../utils/localMonthBounds` (`assertLocalMonthBounds`, `getLocalMonthDayIndex`), replace `Array.from({ length: 7 }, ...)` with `Array.from({ length: dayStartsUtc.length - 1 }, ...)`, replace `week[dayIndex] < 7` bound with `< dayStartsUtc.length - 1`. Auth check, index name (`byUserId`), soft-delete filter, sort direction, and try/catch/`logError` wrapper all copy verbatim — **do not change the auth pattern.**

---

### `convex/glucose/getMonthReadings.ts` (route/Convex query, CRUD read)

**Analog:** `convex/glucose/getWeekReadings.ts` (full file, 54 lines — read directly)

```typescript
// Source: convex/glucose/getWeekReadings.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import {
  assertLocalWeekBounds,
  getLocalWeekDayIndex,
} from "../utils/localWeekBounds";

const getWeekReadings = query({
  args: { dayStartsUtc: v.array(v.number()) },
  handler: async (ctx, { dayStartsUtc }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      assertLocalWeekBounds(dayStartsUtc);
      const weekStartUtc = dayStartsUtc[0];
      const weekEndUtc = dayStartsUtc[7];

      const readings = await ctx.db
        .query("glucoseReadings")
        .withIndex("byUserIdAndRecordedAt", (idx) =>
          idx
            .eq("userId", userId)
            .gte("recordedAt", weekStartUtc)
            .lt("recordedAt", weekEndUtc)
        )
        .collect();

      const week = Array.from({ length: 7 }, () => [] as typeof readings);
      for (const reading of readings) {
        const dayIndex = getLocalWeekDayIndex(dayStartsUtc, reading.recordedAt);
        if (dayIndex >= 0 && dayIndex < 7) {
          week[dayIndex].push(reading);
        }
      }
      for (const dayReadings of week) {
        dayReadings.sort((a, b) => b.recordedAt - a.recordedAt);
      }
      return week;
    } catch (error) {
      logError("getWeekReadings error", error);
      throw error;
    }
  },
});

export default getWeekReadings;
```

**Month adaptation:** same shape as `getMonthMeals` above, index `byUserIdAndRecordedAt` on `glucoseReadings` unchanged, variable-length array instead of fixed 7. `convex/bloodPressure/getMonthReadings.ts` (optional, if the day screen shows BP) follows the exact same shape against the `bloodPressure` table's equivalent index — read `convex/bloodPressure/getWeekReadings.ts` directly before writing (same structural pattern, confirmed identical to glucose's by symmetry with the codebase's own convention).

---

### `convex/movement/getMonthMovement.ts` (route/Convex query, CRUD read)

**Analog:** `convex/movement/getWeekMovement.ts` (full file, 38 lines — read directly)

```typescript
// Source: convex/movement/getWeekMovement.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import { assertLocalWeekDates } from "../utils/localWeekBounds";

const getWeekMovement = query({
  args: { weekDates: v.array(v.string()) },
  handler: async (ctx, { weekDates }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      assertLocalWeekDates(weekDates);

      const rows = await ctx.db
        .query("movementData")
        .withIndex("byUserIdAndDate", (idx) =>
          idx
            .eq("userId", userId)
            .gte("date", weekDates[0])
            .lte("date", weekDates[6])
        )
        .collect();

      const rowsByDate = new Map(rows.map((row) => [row.date, row]));
      return weekDates.map((date) => rowsByDate.get(date) ?? null);
    } catch (error) {
      logError("getWeekMovement error", error);
      throw error;
    }
  },
});

export default getWeekMovement;
```

**Month adaptation:** rename to `getMonthMovement`, args `{ monthDates: v.array(v.string()) }`, use `assertLocalMonthDates`, `weekDates[6]` → `monthDates[monthDates.length - 1]`. This query uses the **date-string index directly** (no bucketing needed) — simplest of the three to adapt, note this shape difference from the meals/glucose pattern (which bucket by timestamp range) when writing.

---

### `scripts/verifyMonthBucketing.ts` (test, batch)

**Analog:** `scripts/verifyWeekBucketing.ts` (full file, 92 lines — read directly)

Key structure to mirror (imports, DST test-case construction, `assert.deepStrictEqual`/`assert.throws`/`assert.doesNotThrow` battery):
```typescript
// Source: scripts/verifyWeekBucketing.ts
import assert from "node:assert/strict";
import getLocalWeekBounds from "@/lib/utils/getLocalWeekBounds";
import {
  assertLocalWeekBounds,
  assertLocalWeekDates,
  getLocalWeekDayIndex,
} from "@/convex/utils/localWeekBounds";

const HOUR_MS = 60 * 60 * 1000;

// Неделя 19-25 октября 2026 в зоне Europe/Berlin: DST transition night.
const { dayStartsUtc, weekDates } = getLocalWeekBounds(
  new Date(2026, 9, 21, 12, 0, 0)
);

assert.deepStrictEqual(weekDates, [/* ... */]);
assert.strictEqual(dayStartsUtc.length, 8);
assert.strictEqual(dayStartsUtc[7] - dayStartsUtc[6], 25 * HOUR_MS); // DST step
assert.strictEqual(dayStartsUtc[6] - dayStartsUtc[5], 24 * HOUR_MS);

assert.throws(() => assertLocalWeekBounds(dayStartsUtc.slice(0, 7)));
assert.throws(() => assertLocalWeekBounds([...dayStartsUtc].reverse()));
assert.doesNotThrow(() => assertLocalWeekBounds(dayStartsUtc));

console.log("verifyWeekBucketing: OK");
```
**Run command convention (copy exactly):** `TZ=Europe/Berlin ts-node -r tsconfig-paths/register scripts/verifyMonthBucketing.ts` — the `TZ=Europe/Berlin` prefix is load-bearing (DST edge-case test), do not drop it.

**Month adaptation:** pick a test month that spans a DST transition (October 2026 works — same month as the existing week test), assert `dayStartsUtc.length` is in `[29, 32]` not `=== 8`, assert first/last `monthDates` entries match `YYYY-MM-01` / `YYYY-MM-{lastDay}`, and add a February non-leap-year + February leap-year case pair specifically to cover Pitfall 4 from RESEARCH.md (hardcoded month-length bugs).

---

### `lib/nutrition/estimateGlucoseFromMeals.ts` (utility, transform — pure function, NEW pattern for this domain)

**Analogs:** `lib/nutrition/calculateDayTotals.ts` (pure-reducer style, full file 39 lines) for file location/style conventions; `convex/observers/utils/thresholds.ts` (full file, 53 lines) for "small pure exported functions, no side effects, importable from both client and server" convention.

```typescript
// Source: convex/observers/utils/thresholds.ts — style precedent for pure,
// documented, importable-from-both-tiers helper functions:
export function isGlucoseOutOfRange(
  value: number,
  unit: GlucoseUnit,
  context: GlucoseContext | undefined
): boolean {
  const resolvedContext = context ?? "random";
  const [low, high] = GLUCOSE_RANGES[resolvedContext][unit];
  return value < low || value > high;
}
```

```typescript
// Source: lib/nutrition/calculateDayTotals.ts — reducer/aggregation style
// precedent (reads meal.totalNutrients.carbs.{total,fiber,sugar}):
export function calculateDayTotals(meals: Doc<"meals">[]) {
  const totals = meals.reduce(
    (acc, meal) => ({
      /* ... */
      nutrients: meal.totalNutrients
        ? addNutrients(acc.nutrients, meal.totalNutrients)
        : acc.nutrients,
    }),
    { /* ... */ nutrients: getEmptyNutrients() }
  );
  return totals;
}
```

**New function shape (per RESEARCH.md "GI Proxy Heuristic" + "Time-Since-Meal Decay Model" — no existing exact analog, build from these two style precedents):**
- Input: array of `Doc<"meals">` (or a subset with `_creationTime` + `totalNutrients.carbs`), `now: Date`.
- Reads `meal.totalNutrients.carbs.{total, fiber, sugar}` — same field path `calculateDayTotals.ts` already reads (line 21-23), confirmed present via `convex/tables/mealItems.ts` `nutrientsFields.carbs` schema (lines 20-25: `{ total, net, fiber, sugar }`).
- Pure function, no Convex/React imports — must be callable from `scripts/verifyGlucoseEstimate.ts` under plain `ts-node`, exactly like `convex/utils/localWeekBounds.ts`'s no-import-of-generated-types constraint.
- Reuse `isGlucoseOutOfRange` from `convex/observers/utils/thresholds.ts` for the D-08 fallback-warning check — do not reimplement range logic.

---

### `app/app/(home)/calendar.tsx` (route, request-response)

**Analog:** `app/app/(home)/glucoseLog.tsx` (full file, 135 lines — read directly, reproduced below, this is the exact "full-screen route with back button + list" shape)

```typescript
// Source: app/app/(home)/glucoseLog.tsx
import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
} from "@/components/ui/screen/ScreenMain";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import getColor from "@/lib/ui/getColor";

export default function GlucoseLogScreen() {
  const { scrollY, onScroll } = useScrollY();
  const readings = useQuery(api.glucose.getAllReadings.default);

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Уровень сахара" />
      </ScreenHeader>
      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        {/* content */}
      </ScreenMainScrollView>
    </ScreenMain>
  );
}
```

**Adaptation for calendar screen:** title "Календарь" (per UI-SPEC), body renders `react-native-calendars`' `Calendar` component instead of a readings list, `theme` prop mapped via `getColor()` tokens per UI-SPEC's Component Inventory row. `firstDay: 1` to match `HomeDaySelector`'s `startOfWeek(now, { weekStartsOn: 1 })` (line 103 of that file) and `ru` locale already used throughout (`date-fns/locale`'s `ru`, e.g. `HomeDaySelector.tsx:125-126`). On date select, `router.push({ pathname: "/app/(home)/day/[date]", params: { date } })`.

---

### `app/app/(home)/day/[date].tsx` (route, request-response)

**Analog:** `app/app/(settings)/observedPatient/[patientId].tsx` (full file, 132 lines — read directly, reproduced below in full — this is the single strongest analog in the whole phase: dynamic-param route that fetches day data and renders the exact same `Home*Summary` component set with `readOnly`)

```typescript
// Source: app/app/(settings)/observedPatient/[patientId].tsx (full pattern)
import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
  ScreenMainTitle,
} from "@/components/ui/screen/ScreenMain";
import Carousel from "@/components/ui/Carousel";
import HomeMacroSummary from "@/components/home/HomeMacroSummary";
import HomeMicroSummary from "@/components/home/HomeMicroSummary";
import HomeRecentlyLogged from "@/components/home/HomeRecentlyLogged";
import HomeMovementSummary from "@/components/home/HomeMovementSummary";
import HomeGlucoseSummary from "@/components/home/HomeGlucoseSummary";
import HomeBloodPressureSummary from "@/components/home/HomeBloodPressureSummary";
import { calculateDayTotals } from "@/lib/nutrition/calculateDayTotals";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import { useQuery } from "convex/react";
import { useLocalSearchParams, type ErrorBoundaryProps } from "expo-router";
import { Platform } from "react-native";

export default function ObservedPatientScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: Id<"users"> }>();
  const { scrollY, onScroll } = useScrollY();
  const data = useQuery(api.observers.getPatientToday.default, { patientId, /* ... */ });

  if (data === undefined) {
    return (
      <ScreenMain edges={[]}>
        <ScreenHeader scrollY={scrollY}>
          <ScreenHeaderBackButton />
          <ScreenHeaderTitle title="Загрузка…" />
        </ScreenHeader>
        <ScreenMainScrollView scrollViewProps={{ onScroll }} safeAreaProps={{ edges: ["left", "right", "bottom"] }}>
          <ScreenMainTitle loading />
        </ScreenMainScrollView>
      </ScreenMain>
    );
  }

  const dayTotals = calculateDayTotals(data.meals);

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title={data.displayName} />
      </ScreenHeader>
      <ScreenMainScrollView scrollViewProps={{ onScroll }} safeAreaProps={{ edges: ["left", "right", "bottom"] }}>
        <ScreenMainTitle title={data.displayName} description="..." />
        <Carousel showIndicators>
          <HomeMacroSummary totalMacros={dayTotals.macros} targets={data.targets ?? undefined} readOnly />
          <HomeMicroSummary totalMicros={dayTotals.micros} dayIndex={dayIndex} readOnly />
        </Carousel>
        <HomeRecentlyLogged meals={data.meals} readOnly />
        {Platform.OS === "ios" && <HomeMovementSummary movement={data.movement} readOnly />}
        {data.isGlucometerTrack && <HomeGlucoseSummary readings={data.glucoseReadings} readOnly />}
        {data.isGlucometerTrack && <HomeBloodPressureSummary readings={data.bloodPressureReadings} readOnly />}
      </ScreenMainScrollView>
    </ScreenMain>
  );
}
```

**Adaptation for `day/[date].tsx`:**
- `const { date } = useLocalSearchParams<{ date: string }>();` — parse `YYYY-MM-DD`.
- Fetch data via the new month-scoped queries (`getMonthMeals`/`getMonthReadings`/`getMonthMovement`), sliced client-side to the single matching day — OR a dedicated single-day query; RESEARCH.md Pattern 3 leaves this as an implementation choice, but the query-call shape (auth + index + range) must still copy the week/month query pattern above regardless of which is chosen.
- Title: `format(date, "d MMMM", { locale: ru })` per UI-SPEC Copywriting Contract — same `date-fns`/`ru` import already used in `HomeDaySelector.tsx`/`nutrients.tsx`.
- Empty state (no data for the date): copy `HomeGlucoseSummary.tsx`'s empty-state visual pattern verbatim (see below) — muted-foreground 0.5 opacity, centered, 14px body — per UI-SPEC "Day-screen empty state" row.
- **Pitfall 5 (RESEARCH.md):** `HomeMicroSummary`'s `dayIndex` prop only supports linking to `nutrients.tsx?dayIndex=N` (current week). For this arbitrary-date screen, either (a) extend `nutrients.tsx` to accept `?date=YYYY-MM-DD` taking priority over `dayIndex`, or (b) render micronutrients inline on the day screen instead of linking out. Decide explicitly in the plan — don't let the existing `dayIndex`-only link silently point at the wrong week.
- No `ErrorBoundary` export needed here (that pattern in the analog is specific to "observer access revoked mid-session" — not applicable to a self-owned day screen), unless month-query errors need equivalent handling; per UI-SPEC error-state row, prefer the existing `Toast.show({ text, variant: "error" })` pattern instead.

---

### `components/home/HomeHeader.tsx` (component, MODIFY)

**Analog:** itself (existing streak-button pattern, full file 75 lines — read directly)

```typescript
// Source: components/home/HomeHeader.tsx (existing structure to extend)
<SafeArea edges={["left", "right"]} style={styles.safeArea}>
  <View style={styles.logoContainer}>{/* logo + title */}</View>
  <Button
    variant="base"
    size="base"
    accessibilityLabel="Кого я наблюдаю"
    onPress={() => router.push("/app/(settings)/observedList")}
  >
    <Card style={styles.streakContainer}>
      <FlameIcon size={20} color={getColor("orange")} fill={getColor("orange")} />
      <Text weight="600">{streak ?? 0}</Text>
    </Card>
  </Button>
</SafeArea>

const styles = StyleSheet.create({
  safeArea: {
    flex: 0,
    flexDirection: "row",
    justifyContent: "space-between", // exactly 2 children today: logo, streak button
    alignItems: "center",
    marginBottom: 16,
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: getColor("background"),
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
    borderRadius: 999,
    minWidth: 56,
  },
});
```

**Adaptation per UI-SPEC Component Inventory:** wrap the existing streak `Button` and a new calendar-entry `Button` (`CalendarDaysIcon` from `lucide-react-native`, `accessibilityLabel="Открыть календарь"`, 44×44 touch target per Spacing Scale exception) in a new `View style={{ flexDirection: "row", gap: 8 }}` so the top-level `justifyContent: "space-between"` (still exactly 2 children: logo, icon-group) is preserved unchanged. `onPress: () => router.push("/app/(home)/calendar")`.

---

### `components/home/HomeGlucoseSummary.tsx` (component, MODIFY)

**Analog:** itself (existing `ReadingRow`, full file 133 lines — read directly, reproduced below)

```typescript
// Source: components/home/HomeGlucoseSummary.tsx — existing ReadingRow to
// pattern the new EstimateRow after:
function ReadingRow({ reading }: ReadingRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <DropletIcon size={16} color={getColor("blue")} />
      </View>
      <View style={styles.rowTextContainer}>
        <Text size="16" weight="600">
          {reading.value} {reading.unit}
        </Text>
        {reading.context && (
          <Text size="12" color={getColor("mutedForeground")}>
            {glucoseContextLabels[reading.context]}
          </Text>
        )}
      </View>
      <Text size="14" color={getColor("mutedForeground")}>
        {format(reading.recordedAt, "HH:mm")}
      </Text>
    </View>
  );
}
// styles.rowIcon: 32x32, borderRadius 999, backgroundColor getColor("muted")
// styles.row: flexDirection row, alignItems center, gap 12
```

**Adaptation per UI-SPEC "Glucose-estimate row" (Component Inventory + Copywriting Contract):**
- New `EstimateRow` sibling function, same `styles.row`/`styles.rowTextContainer` layout.
- Icon circle: `borderStyle: "dashed", borderWidth: 1, borderColor: getColor("blue")` instead of solid `muted` fill (visually distinct from real readings).
- Value text: `"≈ {value} {unit}"` at 16/600, `getColor("blue")`.
- Secondary label: "Оценка по сахару в еде" at 12/400 `mutedForeground` (Caption role) — reuses the same `Text size="12" color={getColor("mutedForeground")}` pattern already used for `reading.context` in `ReadingRow`.
- Render `EstimateRow` **after** real `ReadingRow`s in the `cardContent` block (additive per D-06/D-08), only when a non-zero estimate exists.
- Empty-state precedent to reuse verbatim elsewhere (day-screen empty state per UI-SPEC): lines 58-64 — `<Text size="14" color={getColor("mutedForeground", 0.5)} style={styles.empty}>` centered.

---

### `components/ui/WarningBadge.tsx` (component, NEW — extraction)

**Analog:** `components/observer/ObservedPatientCard.tsx` lines 63-82 (inline `WarningBadge` function, to be extracted per UI-SPEC's explicit instruction: *"If this warning needs to surface outside `ObservedPatientCard`'s current render tree, extract `WarningBadge` into `components/ui/` as a shared component rather than duplicating its JSX"*)

```typescript
// Source: components/observer/ObservedPatientCard.tsx:63-82 (extract verbatim)
type BadgeProps = {
  text: string;
  color: "amber" | "red";
};

function WarningBadge({ text, color }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: getColor(color, 0.12) }]}>
      <TriangleAlertIcon size={14} color={getColor(color)} />
      <Text size="12" weight="400" color={getColor(color)}>
        {text}
      </Text>
    </View>
  );
}
// styles.badge: flexDirection row, alignItems center, alignSelf flex-start,
// gap 4, padding 8, borderRadius 8
```

**Adaptation:** move to `components/ui/WarningBadge.tsx` unchanged (same props/styles), update `ObservedPatientCard.tsx` to import it instead of defining it inline, then reuse it in `HomeGlucoseSummary.tsx` (or wherever D-08's fallback warning renders) with `color="red"` text "Глюкоза вне нормы" — same copy already used in `ObservedPatientCard.tsx:157`.

---

### `lib/hooks/useHealthKitSync.ts` (hook, event-driven — MODIFY, HEALTH-01 fix)

**Analog:** itself (existing file, full 45 lines — read directly, reproduced below — the bug and the fix both live in this same file)

```typescript
// Source: lib/hooks/useHealthKitSync.ts (current, buggy)
export default function useHealthKitSync(includeGlucose: boolean): void {
  const syncMovementDays = useMutation(api.movement.syncDays.default);
  const importGlucoseReadings = useMutation(api.glucose.importHealthKitReadings.default);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (hasSyncedRef.current) return;   // BUG: permanent lock, see Verified code bug
    hasSyncedRef.current = true;
    void (async () => {
      try {
        const connected = await isHealthKitConnected();
        if (!connected) return;
        const days = await fetchRecentMovement(8);
        if (days.length > 0) await syncMovementDays({ days });
        if (includeGlucose) {           // often false on first render — profile not loaded yet
          const since = new Date();
          since.setDate(since.getDate() - 30);
          const readings = await fetchRecentGlucoseSamples(since);
          if (readings.length > 0) await importGlucoseReadings({ readings });
        }
      } catch (error) {
        logError("useHealthKitSync error", error);
      }
    })();
  }, [includeGlucose, syncMovementDays, importGlucoseReadings]);
}
```

**Fix pattern (per RESEARCH.md Pattern 4 — no existing `AppState` usage anywhere in this codebase, `grep -rn "AppState" .` returns zero matches, this is a new-to-project pattern, not a refactor of an existing one):**
```typescript
// New pattern — not sourced from existing code, standard RN core API
import { AppState } from "react-native";

useEffect(() => {
  const sync = () => { /* existing fetch+mutate logic, unindented from the ref-gate */ };
  sync(); // run on mount
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") sync();
  });
  return () => sub.remove();
}, [includeGlucose, syncMovementDays, importGlucoseReadings]);
```
Remove `hasSyncedRef` permanent lock entirely; replace with either no ref at all (rely on `AppState` + mount) or a `useRef<number>` last-sync-timestamp throttle (in-memory only, not `SecureStore` — do not persist across app restarts per RESEARCH.md Pattern 4 note). `logError` import/usage (from `lib/utils/logError.ts`) stays unchanged — copy verbatim, this is the project's established error-logging call site convention throughout hooks and Convex functions alike.

---

### `app/app/(tabs)/index.tsx` (route/component, MODIFY — HEALTH-01 fix + estimate wiring)

**Analog:** itself (existing file, full 125 lines — read directly)

Key existing line to fix (verified bug, RESEARCH.md "Verified code bug"):
```typescript
// Source: app/app/(tabs)/index.tsx:31-34 (current)
const profile = useQuery(api.profiles.getProfile.default);
const isGlucometerTrack = profile?.data?.goalTrack === "glucometer"; // false (not undefined) while loading
useHealthKitSync(isGlucometerTrack);
```
Per the hook fix above, once `hasSyncedRef`'s permanent lock is removed and replaced with `AppState`-driven re-sync, this call site does not itself need structural change — the hook now naturally re-evaluates `includeGlucose` on every foreground transition, which self-heals the race described in RESEARCH.md's Verified code bug section. Confirm no other call site of `useHealthKitSync` exists (`grep -rn "useHealthKitSync"` — currently only this one call site).

**Estimate wiring:** existing pattern already fetches `dayReadings`/`weekReadings` for `HomeGlucoseSummary` (lines 44-49); add a client-side call to `estimateGlucoseFromMeals(dayMeals, new Date())` alongside `dayTotals = calculateDayTotals(dayMeals)` (line 78), pass the result as a new prop into `<HomeGlucoseSummary readings={dayReadings} estimate={estimate} />` (line 108) — same "compute pure client-side value, pass as prop" convention `dayTotals` already demonstrates for macros/micros.

## Shared Patterns

### Auth check (Convex queries/mutations)
**Source:** `convex/meals/getWeekMeals.ts` lines 16-17 (and identically in `getWeekReadings.ts`, `getWeekMovement.ts`, `convex/observers/getObservedPatients.ts`)
**Apply to:** All new Convex functions (`getMonthMeals`, `getMonthReadings`, `getMonthMovement`, `getMonthReadings` for bloodPressure)
```typescript
const userId = await getAuthUserId(ctx);
if (userId === null) throw new Error("Unauthorized");
```
Copy verbatim — do not invent a new auth-check style. This is also the ASVS V4 control called out in RESEARCH.md's Security Domain section.

### Error handling (Convex queries)
**Source:** `convex/meals/getWeekMeals.ts` lines 48-51 (identical shape across all week queries)
**Apply to:** All new month-scoped Convex queries
```typescript
try {
  // ...
} catch (error) {
  logError("getWeekMeals error", error); // rename per function
  throw error;
}
```

### Client-side bounds computation + server-side validation split
**Source:** `lib/utils/getLocalWeekBounds.ts` (client) + `convex/utils/localWeekBounds.ts` (server)
**Apply to:** `getLocalMonthBounds.ts` / `localMonthBounds.ts` pair
Server never recomputes calendar math from a timezone it doesn't know — it only validates shape/spacing of client-supplied bounds. This is also the ASVS V5 control (reject malformed/oversized client-supplied ranges) and the DoS mitigation noted in RESEARCH.md's Security Domain section — cap accepted span (~32 days for month), do not accept unbounded client input.

### Full-screen route shell (`ScreenMain`/`ScreenHeader`/`ScreenMainScrollView`)
**Source:** `app/app/(home)/glucoseLog.tsx` (list-style) and `app/app/(settings)/observedPatient/[patientId].tsx` (dynamic-param, data-fetching-wrapper style)
**Apply to:** `app/app/(home)/calendar.tsx`, `app/app/(home)/day/[date].tsx`
```typescript
<ScreenMain edges={[]}>
  <ScreenHeader scrollY={scrollY}>
    <ScreenHeaderBackButton />
    <ScreenHeaderTitle title="..." />
  </ScreenHeader>
  <ScreenMainScrollView
    scrollViewProps={{ onScroll }}
    safeAreaProps={{ edges: ["left", "right", "bottom"] }}
  >
    {/* content */}
  </ScreenMainScrollView>
</ScreenMain>
```
`useScrollY` (from `lib/hooks/reanimated/useScrollY`) drives the header's scroll-shadow animation — import and wire identically in both new routes.

### `Home*Summary` components consumed with `readOnly` for non-editable/arbitrary-date contexts
**Source:** `app/app/(settings)/observedPatient/[patientId].tsx` lines 104-127
**Apply to:** `app/app/(home)/day/[date].tsx`
All of `HomeMacroSummary`, `HomeMicroSummary`, `HomeGlucoseSummary`, `HomeBloodPressureSummary`, `HomeMovementSummary`, `HomeRecentlyLogged` already accept `readOnly` (removes "Add"/"See all" CTA links) — pass `readOnly` on every one for the day-detail screen, exactly as the observer screen does. No new card UI needed anywhere in this phase.

### Pure, cross-tier-importable helper functions (no framework imports)
**Source:** `convex/observers/utils/thresholds.ts` (full file) and `convex/utils/localWeekBounds.ts` (full file) — both avoid importing Convex-generated server types or React so they're callable from ts-node scripts too
**Apply to:** `lib/nutrition/estimateGlucoseFromMeals.ts`, `convex/utils/localMonthBounds.ts`
Keep these files free of `convex/values`, `convex/react`, and generated-server-type imports so `scripts/verifyGlucoseEstimate.ts`/`scripts/verifyMonthBucketing.ts` can import and run them directly under plain `ts-node -r tsconfig-paths/register`.

## No Analog Found

None — every file in the phase's expected change set has at least a role-match analog. The weakest match is `lib/nutrition/estimateGlucoseFromMeals.ts` (no existing "estimate from meal macros" function exists anywhere in the codebase — it's a genuinely new computation), but its *file-location and code-style* conventions are well-established by `calculateDayTotals.ts` and `thresholds.ts`, so it is listed as role-match rather than no-analog.

## Metadata

**Analog search scope:** `lib/utils/`, `lib/hooks/`, `lib/nutrition/`, `lib/health/`, `convex/meals/`, `convex/glucose/`, `convex/movement/`, `convex/bloodPressure/`, `convex/utils/`, `convex/observers/`, `components/home/`, `components/observer/`, `components/ui/`, `components/ui/screen/`, `app/app/(home)/`, `app/app/(tabs)/`, `app/app/(settings)/observedPatient/`, `scripts/`
**Files scanned:** 24 (all read in full; no file in this phase exceeded 2,000 lines, so no offset/limit targeted reads were needed)
**Pattern extraction date:** 2026-08-25

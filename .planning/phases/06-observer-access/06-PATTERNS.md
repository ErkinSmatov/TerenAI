# Phase 6: Наблюдатель за пользователем - Pattern Map

**Mapped:** 2026-08-15
**Files analyzed:** 15 (new) + 3 (modified)
**Analogs found:** 18 / 18

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `convex/tables/observerLinks.ts` | model (table) | CRUD | `convex/tables/mealItems.ts` (parent-id index) + `convex/tables/bloodPressureReadings.ts` (minimal shape) | role-match |
| `convex/tables/profiles.ts` (modify: add `observerCode`) | model (table) | CRUD | itself (existing file, patch) | exact |
| `convex/schema.ts` (modify: register table) | config | CRUD | itself (existing file, patch) | exact |
| `convex/utils/observerAuth.ts` | utility (auth helper) | request-response | **no direct analog** — new cross-user auth pattern; closest structural precedent is the ownership-check block inside `convex/mealItems/getMealItem.ts` | no-analog (novel pattern) |
| `convex/observers/generateCode.ts` | mutation (service) | CRUD | `convex/utils/otp.ts` (`generateNumericToken`) + collision-loop pattern described in RESEARCH Pattern 5 | role-match |
| `convex/observers/regenerateCode.ts` | mutation (service) | CRUD | `convex/profiles/updateProfile.ts` | role-match |
| `convex/observers/redeemCode.ts` | mutation (service) | CRUD | `convex/glucose/createReading.ts` (auth + insert shape) | role-match |
| `convex/observers/getMyObservers.ts` | query (service) | CRUD | `convex/glucose/getAllReadings.ts` / `convex/mealItems/getMealItem.ts` (own-id index query) | role-match |
| `convex/observers/getObservedPatients.ts` | query (service) | CRUD | `convex/glucose/getWeekReadings.ts` (day-boundary math) — but keyed by `observerId` first, then per-patient | role-match |
| `convex/observers/getPatientToday.ts` | query (service) | CRUD | `convex/glucose/getWeekReadings.ts` + `convex/meals/getWeekMeals.ts` + `convex/movement/getWeekMovement.ts` (day-boundary math, adapted to single day + `targetUserId` arg) | role-match |
| `convex/observers/revokeLink.ts` | mutation (service) | CRUD | `convex/glucose/deleteReading.ts` (ownership-check-then-delete) | role-match |
| `convex/observers/utils/thresholds.ts` | utility (pure fn) | transform | **no analog** — first threshold/pure-logic module in the codebase | no-analog (novel pattern) |
| `convex/users/deleteUser.ts` (modify: cascade `observerLinks`) | mutation (service) | CRUD | itself (existing cascade blocks for `meals`/`glucoseReadings`/etc.) | exact |
| `components/home/HomeHeader.tsx` (modify: add `onPress`) | component | event-driven | itself (existing file, patch) | exact |
| `app/app/(settings)/observerCode.tsx` | screen/route | request-response | `app/app/(settings)/health.tsx` | exact |
| `app/app/(settings)/observedList.tsx` | screen/route | request-response | `app/app/(settings)/health.tsx` (screen shell) + `app/auth/confirm-phone.tsx` (OTP entry flow) | role-match |
| `app/app/(settings)/observedPatient/[patientId].tsx` | screen/route | request-response | `app/app/(tabs)/index.tsx` (composes Home summary components from queried data) | role-match |
| `components/settings/ObserverSection.tsx` | component | request-response | `components/settings/DiagnosticsSection.tsx` | exact |
| `components/observer/ObservedPatientCard.tsx` | component | transform (render) | `components/home/HomeGlucoseSummary.tsx` (card + row + Link pattern) | role-match |
| `components/observer/ObserverListItem.tsx` | component | transform (render) | `components/settings/SettingsItem.tsx` | role-match |

## Pattern Assignments

### `convex/tables/observerLinks.ts` (model, CRUD)

**Analog:** `convex/tables/mealItems.ts` (parent-reference index) + `convex/tables/bloodPressureReadings.ts` (minimal fields shape)

**Table module pattern** (`convex/tables/bloodPressureReadings.ts:1-13`):
```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const bloodPressureReadingsFields = {
  userId: v.id("users"),
  systolic: v.number(),
  diastolic: v.number(),
  pulse: v.optional(v.number()),
};

export const bloodPressureReadings = defineTable(
  bloodPressureReadingsFields
).index("byUserId", ["userId"]);
```

**Parent-id index pattern** (`convex/tables/mealItems.ts:74-76`):
```typescript
export const mealItems = defineTable(mealItemsFields).index("byMealId", [
  "mealId",
]);
```

**Apply as (per RESEARCH.md Pattern 2, verified against actual `defineTable` usage above):**
```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const observerLinksFields = {
  observerId: v.id("users"),
  patientId: v.id("users"),
};

export const observerLinks = defineTable(observerLinksFields)
  .index("byObserverId", ["observerId"])
  .index("byPatientId", ["patientId"])
  .index("byObserverAndPatient", ["observerId", "patientId"]);
```

---

### `convex/tables/profiles.ts` (modify — add `observerCode`)

**Analog:** itself, `convex/tables/profiles.ts:1-76`

Existing fields block to extend (`convex/tables/profiles.ts:5-13`):
```typescript
export const profilesFields = {
  userId: v.id("users"),
  targets: v.object({
    calories: v.number(),
    carbs: v.number(),
    protein: v.number(),
    fat: v.number(),
  }),
  isPro: v.optional(v.boolean()),
  hasCompletedOnboarding: v.boolean(),
  data: v.optional(v.object({ /* ... */ })),
};
```
Add `observerCode: v.optional(v.string())` to this object, then extend the table definition (`convex/tables/profiles.ts:73-75`):
```typescript
export const profiles = defineTable(profilesFields).index("byUserId", [
  "userId",
]);
```
to add `.index("byObserverCode", ["observerCode"])`. Note: `profiles.targets.calories` already exists — no new field needed for OBSV calorie threshold (confirms RESEARCH.md/CONTEXT.md D-06 discretion note).

---

### `convex/schema.ts` (modify — register `observerLinks`)

**Analog:** itself, `convex/schema.ts:1-20` (full file, small enough to quote whole)
```typescript
import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { bloodPressureReadings } from "./tables/bloodPressureReadings";
import { foods } from "./tables/foods";
import { glucoseReadings } from "./tables/glucoseReadings";
import { meals } from "./tables/meals";
import { mealItems } from "./tables/mealItems";
import { movementData } from "./tables/movementData";
import { profiles } from "./tables/profiles";

export default defineSchema({
  ...authTables,
  bloodPressureReadings,
  foods,
  glucoseReadings,
  meals,
  mealItems,
  movementData,
  profiles,
});
```
Add `import { observerLinks } from "./tables/observerLinks";` and `observerLinks,` to the `defineSchema({...})` object, following the exact same import-then-register order as the other 7 tables.

---

### `convex/utils/observerAuth.ts` (utility, request-response) — NOVEL PATTERN, NO ANALOG

No file in the codebase currently checks "does user A have permission to read user B's data" — every existing query/mutation derives the target row's owner exclusively from `getAuthUserId(ctx)`. The closest structural precedent for the *shape* of an ownership check (not the cross-user logic itself) is the guard clause in `convex/mealItems/getMealItem.ts:16-18`:
```typescript
const meal = await ctx.db.get(mealItem.mealId);
if (!meal) throw new Error("Meal not found");
if (meal.userId !== userId) throw new Error("Forbidden");
```
Error vocabulary to reuse: `"Unauthorized"` for no session (`convex/glucose/deleteReading.ts:11`), `"Forbidden"` for session-but-no-permission (`convex/glucose/deleteReading.ts:15`, `convex/mealItems/getMealItem.ts:18`).

Write per RESEARCH.md Pattern 3 (already vetted against real index/table shapes above):
```typescript
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function assertObserverAccess(
  ctx: QueryCtx | MutationCtx,
  targetUserId: Id<"users">
): Promise<Id<"users">> {
  const observerId = await getAuthUserId(ctx);
  if (observerId === null) throw new Error("Unauthorized");

  const link = await ctx.db
    .query("observerLinks")
    .withIndex("byObserverAndPatient", (q) =>
      q.eq("observerId", observerId).eq("patientId", targetUserId)
    )
    .first();

  if (!link) throw new Error("Forbidden");
  return observerId;
}
```
Every new observer-facing query/mutation must call this before touching `ctx.db` for patient data (see Shared Patterns below).

---

### `convex/observers/generateCode.ts` / `regenerateCode.ts` (mutation, CRUD)

**Analog:** `convex/utils/otp.ts` (RNG) + `convex/profiles/updateProfile.ts` (patch shape)

RNG to reuse as-is, no modification (`convex/utils/otp.ts:1-11`, full file):
```typescript
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export default function generateNumericToken(length = 4): string {
  const random: RandomReader = {
    read(bytes) {
      crypto.getRandomValues(bytes);
    },
  };
  return generateRandomString(random, "0123456789", length);
}
```

Patch-mutation shape to follow (`convex/profiles/updateProfile.ts:8-28`):
```typescript
const updateProfile = mutation({
  args: { profile: v.object(partial(profilesFields)) },
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const profile = await ctx.db
        .query("profiles")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
      if (!profile) throw new Error("Profile not found");

      await ctx.db.patch(profile._id, args.profile);
      return null;
    } catch (error) {
      logError("updateProfile error", error);
      throw error;
    }
  },
});
```
`generateCode`/`regenerateCode` handlers should: resolve own profile the same way, then loop `generateNumericToken(6)` + uniqueness check against `byObserverCode` (Pitfall 4 in RESEARCH.md) before `ctx.db.patch(profile._id, { observerCode: code })`.

---

### `convex/observers/redeemCode.ts` (mutation, CRUD)

**Analog:** `convex/glucose/createReading.ts` (full auth-then-insert shape)
```typescript
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const createReading = mutation({
  args: { /* ... */ },
  handler: async (ctx, args): Promise<Id<"glucoseReadings">> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      return await ctx.db.insert("glucoseReadings", {
        userId,
        ...args,
        recordedAt: Date.now(),
        source: "manual",
      });
    } catch (error) {
      logError("createReading error", error);
      throw error;
    }
  },
});
```
Full target implementation already drafted and verified against real index shapes in RESEARCH.md "Code Examples → Мутация погашения кода" — reuse verbatim (it correctly uses `logError` from `@/lib/utils/logError`, matching the import path convention seen in `convex/glucose/deleteReading.ts:4` and `convex/glucose/createReading.ts:5`).

---

### `convex/observers/getMyObservers.ts` / `getObservedPatients.ts` (query, CRUD)

**Analog:** `convex/mealItems/getMealItem.ts` (own-index query + auth) for `getMyObservers` (simple `byPatientId`/`byObserverId` lookup, no cross-user check needed since caller queries their own link rows); `convex/glucose/getWeekReadings.ts` for day-boundary aggregation shape used inside `getObservedPatients`.

```typescript
// getMyObservers / getObservedPatients — own-side lookup, no assertObserverAccess needed
// (caller is always querying links where they themselves are one of the two ids)
const userId = await getAuthUserId(ctx);
if (userId === null) throw new Error("Unauthorized");

const links = await ctx.db
  .query("observerLinks")
  .withIndex("byObserverId", (q) => q.eq("observerId", userId)) // or byPatientId for getMyObservers
  .collect();
```
(Verified index names against `convex/tables/observerLinks.ts` pattern above — same file this agent is defining.)

---

### `convex/observers/getPatientToday.ts` (query, CRUD)

**Analog:** `convex/glucose/getWeekReadings.ts` (day-boundary math), adapted to a single day and an explicit `targetUserId` argument instead of `getAuthUserId`.

Day-boundary math to copy (`convex/glucose/getWeekReadings.ts:6,17-21`):
```typescript
const dayMs = 24 * 60 * 60 * 1000;
// ...
const now = Date.now();
const offsetMs = timezoneOffsetMinutes * 60_000;
const localNowMs = now - offsetMs;
const localMidnightMs = Math.floor(localNowMs / dayMs) * dayMs;
```
This exact block is duplicated 3 times already (`convex/glucose/getWeekReadings.ts`, `convex/meals/getWeekMeals.ts`, `convex/movement/getWeekMovement.ts`) — RESEARCH.md flags this as a candidate for a shared `localDayBoundaries()` helper; not mandatory, but do not add a 4th/5th inline copy without at least noting the option to the planner.

Full observer-scoped query must start with:
```typescript
const observerId = await assertObserverAccess(ctx, args.targetUserId);
```
then use `targetUserId` (not `userId`) in every `.withIndex(...)` call, mirroring `.withIndex("byUserIdAndRecordedAt", (idx) => idx.eq("userId", targetUserId)...)` from `convex/glucose/getWeekReadings.ts:31-36`.

---

### `convex/observers/revokeLink.ts` (mutation, CRUD)

**Analog:** `convex/glucose/deleteReading.ts` (full file, ownership-check-then-delete)
```typescript
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const deleteReading = mutation({
  args: { readingId: v.id("glucoseReadings") },
  handler: async (ctx, { readingId }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const reading = await ctx.db.get(readingId);
      if (!reading) return;
      if (reading.userId !== userId) throw new Error("Forbidden");

      await ctx.db.delete(readingId);
    } catch (error) {
      logError("deleteReading error", error);
      throw error;
    }
  },
});
```
Adapt: fetch `observerLinks` doc by `linkId`, then per Pitfall 5 in RESEARCH.md check `link.observerId !== callerId && link.patientId !== callerId` (both sides, not one) before delete.

---

### `convex/observers/utils/thresholds.ts` (pure function, transform) — NOVEL PATTERN, NO ANALOG

No threshold/pure-business-logic module exists anywhere in `convex/` or `lib/` today (confirmed by RESEARCH.md grep). Full implementation already specified in RESEARCH.md "Code Examples → Оценка порогов" — use verbatim, it is the reference implementation:
```typescript
type GlucoseContext = "fasting" | "beforeMeal" | "afterMeal" | "random";
type GlucoseUnit = "mmol/L" | "mg/dL";

const GLUCOSE_RANGES: Record<GlucoseContext, Record<GlucoseUnit, [number, number]>> = {
  fasting:    { "mg/dL": [80, 130], "mmol/L": [4.4, 7.2] },
  beforeMeal: { "mg/dL": [80, 130], "mmol/L": [4.4, 7.2] },
  afterMeal:  { "mg/dL": [70, 180], "mmol/L": [3.9, 10.0] },
  random:     { "mg/dL": [70, 140], "mmol/L": [3.9, 7.8] },
};

export function isGlucoseOutOfRange(
  value: number,
  unit: GlucoseUnit,
  context: GlucoseContext | undefined
): boolean {
  const ctx = context ?? "random";
  const [low, high] = GLUCOSE_RANGES[ctx][unit];
  return value < low || value > high;
}

export function isCaloriesExceeded(totalCalories: number, targetCalories: number): boolean {
  return totalCalories > targetCalories;
}
```
Place in `convex/observers/utils/thresholds.ts` (not `lib/`) since `convex/` already imports from `@/lib/utils/logError` cross-directory but never the reverse — keeping it convex-side avoids a new cross-import direction, and both server (badge computation) and client (`ObservedPatientCard` rendering) can import it, matching the existing `@/lib/utils/logError` cross-import precedent cited in RESEARCH.md.

---

### `convex/users/deleteUser.ts` (modify — cascade `observerLinks`)

**Analog:** itself — existing cascade blocks, full file already read (`convex/users/deleteUser.ts:1-86`). Pattern per table (repeat for both `byObserverId` and `byPatientId`, e.g. bloodPressure block at lines 49-55):
```typescript
const bloodPressureReadings = await ctx.db
  .query("bloodPressureReadings")
  .withIndex("byUserId", (q) => q.eq("userId", userId))
  .collect();
for (const reading of bloodPressureReadings) {
  await ctx.db.delete(reading._id);
}
```
Add two equivalent blocks querying `observerLinks` by `byObserverId` and by `byPatientId` (both indexed on `userId`'s role), deleting every matched row, before the final `await ctx.db.delete(userId);` at line 81. This is mandatory per RESEARCH.md Pitfall 3 — grep this file post-implementation for `observerLinks` to confirm.

---

### `components/home/HomeHeader.tsx` (modify — wire `onPress`)

**Analog:** itself, full file already read (`components/home/HomeHeader.tsx:1-65`). Target button currently has no `onPress` (lines 25-34):
```typescript
<Button variant="base" size="base">
  <Card style={styles.streakContainer}>
    <FlameIcon size={20} color={getColor("orange")} fill={getColor("orange")} />
    <Text weight="600">{streak ?? 0}</Text>
  </Card>
</Button>
```
Add `router.push("/app/(settings)/observedList")` (needs `useRouter` from `expo-router`, not currently imported in this file) as `onPress`. No other change to this file.

---

### `app/app/(settings)/observerCode.tsx` and `observedList.tsx` (screen/route, request-response)

**Analog:** `app/app/(settings)/health.tsx` (full file already read, 164 lines — screen shell/scroll/mutation pattern)

Screen shell to copy (`app/app/(settings)/health.tsx:98-108`):
```typescript
return (
  <ScreenMain edges={[]}>
    <ScreenHeader scrollY={scrollY}>
      <ScreenHeaderBackButton />
      <ScreenHeaderTitle title="Здоровье" />
    </ScreenHeader>

    <ScreenMainScrollView
      scrollViewProps={{ onScroll }}
      safeAreaProps={{ edges: ["left", "right", "bottom"] }}
    >
      <ScreenMainTitle title="Apple Health" description="..." />
      {/* content */}
    </ScreenMainScrollView>
  </ScreenMain>
);
```
Mutation-call-with-Toast-feedback pattern (`app/app/(settings)/health.tsx:46-77`):
```typescript
const handleConnect = async () => {
  setIsSyncing(true);
  try {
    const granted = await connectHealthKit(isGlucometerTrack);
    if (!granted) {
      Toast.show({ text: "Не удалось получить доступ к Apple Health.", variant: "error" });
      return;
    }
    // ...
    Toast.show({ text: "Apple Health подключён." });
  } finally {
    setIsSyncing(false);
  }
};
```

For `observedList.tsx`'s "enter code" flow specifically, use the OTP-entry pattern from `app/auth/confirm-phone.tsx:59-80` (full file already read) as the closest analog for wiring `OTPInput` + `useMutation` + error flash + Toast:
```typescript
const handleSubmit = async (code: string) => {
  if (code.length !== 4) {
    inputRef.current?.flashError();
    return;
  }
  const { error } = await tryCatch(signIn(provider, { phone, code }));
  if (error) {
    inputRef.current?.flashError();
  } else {
    // ... success path, navigate
  }
};
// ...
<OTPInput ref={inputRef} onFilled={(code) => void handleSubmit(code)} autoFocus />
```
Adapt: `handleSubmit` calls `redeemCode({ code })` instead of `signIn`; on `"Code not found"` error call `inputRef.current?.flashError()` + `Toast.show({ text: "Код не найден. Проверьте и попробуйте снова.", variant: "error" })` per UI-SPEC copy contract; on `"Cannot observe yourself"` show the specific toast text from UI-SPEC instead of the generic one.

---

### `app/app/(settings)/observedPatient/[patientId].tsx` (screen/route, request-response)

**Analog:** `app/app/(tabs)/index.tsx` (full file already read, 129 lines) — composes Home summary components from queried data, exactly the reuse pattern OBSV-06 requires.

Composition pattern to mirror (`app/app/(tabs)/index.tsx:100-114`):
```typescript
<Carousel showIndicators>
  <HomeMacroSummary totalMacros={dayTotals.macros} />
  <HomeMicroSummary totalMicros={dayTotals.micros} dayIndex={selectedDay} />
</Carousel>
<HomeRecentlyLogged meals={dayMeals} />
{Platform.OS === "ios" && <HomeMovementSummary movement={dayMovement} />}
{isGlucometerTrack && <HomeGlucoseSummary readings={dayReadings} />}
{isGlucometerTrack && <HomeBloodPressureSummary readings={dayBloodPressure} />}
```
Confirmed: `HomeMacroSummary`, `HomeGlucoseSummary`, etc. already receive data as props (not internal `useQuery` for the list content) — `HomeMacroSummary` does call its own `useQuery(api.profiles.getProfile.default)` internally for `targets` only (`components/home/HomeMacroSummary.tsx:30-32`), which will resolve to the **observer's own** profile, not the patient's — this needs an explicit prop override or a parallel targets fetch for the patient in the new detail screen (flag for planner: `HomeMacroSummary` needs a `targets` prop or a patient-scoped profile query, it cannot be reused 100% as-is for cross-user targets).

Per UI-SPEC.md, this screen must also strip/disable any mutation entry points inherited from these Home components (photo/manual-entry buttons, links to `glucoseLog`/`bloodPressureLog`/`movementLog`/`nutrients` full-history routes) — those `Link`/`Button` wrappers exist inside `HomeGlucoseSummary` (`components/home/HomeGlucoseSummary.tsx:53-57, 60-77`) and equivalent siblings; the observer detail screen must not reuse those Link-wrapped variants as-is or must pass a read-only variant/prop.

---

### `components/settings/ObserverSection.tsx` (component, request-response)

**Analog:** `components/settings/DiagnosticsSection.tsx` (full file already read, 123 lines) — closest precedent for a self-contained settings subsection with its own state/queries.

Structural pattern to mirror (`components/settings/DiagnosticsSection.tsx:77-123`):
```typescript
return (
  <>
    <SettingsGroup>
      <SettingsItem text={...} Icon={...} onPress={...} />
    </SettingsGroup>
    {condition && (
      <SettingsGroup>
        <SettingsItem text={...} Icon={...} onPress={...} />
        <AlertDialog
          trigger={<SettingsItem destructive text={...} Icon={...} />}
          destructive
          title={...}
          description={...}
          onConfirm={() => {...}}
        />
      </SettingsGroup>
    )}
  </>
);
```

---

### `components/observer/ObservedPatientCard.tsx` (component, transform/render)

**Analog:** `components/home/HomeGlucoseSummary.tsx` (full file already read, 120 lines) — card + row + `Link`-wrapped `Button` pattern, plus icon-in-circle row style.

Row-icon-circle style to copy (`components/home/HomeGlucoseSummary.tsx:107-113`):
```typescript
rowIcon: {
  height: 32,
  width: 32,
  borderRadius: 999,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: getColor("muted"),
},
```
Card + Link-to-detail wrapper (`components/home/HomeGlucoseSummary.tsx:60-78`):
```typescript
<Link href="/app/(home)/glucoseLog" asChild>
  <Button variant="base" size="base">
    <Card style={styles.card}>{/* rows */}</Card>
  </Button>
</Link>
```
Adapt `href` to `` `/app/(settings)/observedPatient/${patientId}` ``. For the warning badge (amber/red per UI-SPEC Color table), use `getColor("amber", 0.12)` / `getColor("red", 0.12)` as background per the existing `getColor(name, opacity)` API (`lib/ui/getColor.ts:42-50`, full function already read) — this two-arg call is already used elsewhere in the codebase (e.g. `components/home/HomeGlucoseSummary.tsx:70`: `getColor("mutedForeground", 0.5)`), so no new color-utility code is needed.

---

### `components/observer/ObserverListItem.tsx` (component, transform/render)

**Analog:** `components/settings/SettingsItem.tsx` (full file already read, 52 lines)
```typescript
export default function SettingsItem({ text, Icon, onPress, isLast, destructive = false }: Props) {
  const color = destructive ? getColor("destructive") : getColor("foreground");
  return (
    <View style={[styles.container, !isLast && { borderBottomWidth: 1 }]}>
      <Button variant="base" size="base" style={styles.button} onPress={onPress}>
        <Icon size={18} color={color} />
        <Text size="16" weight="500" color={color}>{text}</Text>
      </Button>
    </View>
  );
}
```
`ObserverListItem` needs a second trailing element (the 44×44 "Отозвать"/"Убрать" icon button per UI-SPEC spacing contract) that `SettingsItem` doesn't have — either extend `SettingsItem` with an optional trailing-slot prop, or compose `SettingsItem`-style row markup directly inside `ObserverListItem` with an added `AlertDialog`-wrapped icon button (same `AlertDialog` component as `DiagnosticsSection.tsx` and `settings.tsx` use for destructive confirmations).

---

## Shared Patterns

### Cross-user authorization gate
**Source:** `convex/utils/observerAuth.ts` (new file, Pattern 3 above — no existing precedent in codebase, first BOLA-relevant surface in the project)
**Apply to:** `getObservedPatients.ts`, `getPatientToday.ts`, and any future observer-facing query/mutation that accepts a `targetUserId`/`patientId` argument. Must be called before any `ctx.db` read of patient data. `getMyObservers.ts` and `getObservedPatients.ts`'s own-link listing do NOT need this gate (they query links where the caller is the owner side).

### Auth-check + try/catch + logError error handling
**Source:** every existing Convex function, e.g. `convex/glucose/deleteReading.ts:9-22`, `convex/glucose/createReading.ts:21-35`
```typescript
try {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Unauthorized");
  // ...
} catch (error) {
  logError("<functionName> error", error);
  throw error;
}
```
**Apply to:** every new file in `convex/observers/`.

### Convex file-per-function + `export default`
**Source:** every existing file under `convex/*/` (e.g. `convex/glucose/`, `convex/meals/`)
**Apply to:** all new files in `convex/observers/`, called client-side as `api.observers.<file>.default`.

### Settings subsection composition (`SettingsGroup` + `SettingsItem`)
**Source:** `components/settings/DiagnosticsSection.tsx`, `components/settings/SettingsGroup.tsx`, `components/settings/SettingsItem.tsx`
**Apply to:** `ObserverSection.tsx`, `ObserverListItem.tsx`, and the layout of `observerCode.tsx`/`observedList.tsx` bodies.

### Destructive confirmation via `AlertDialog`
**Source:** `components/ui/AlertDialog.tsx` (full file read), used in `app/app/(tabs)/settings.tsx:96-108` for "Удалить аккаунт" and `components/settings/DiagnosticsSection.tsx:104-118` for native-crash trigger
```typescript
<AlertDialog
  trigger={<SettingsItem destructive text="..." Icon={...} />}
  destructive
  title="..."
  description="..."
  onConfirm={() => void handleAction()}
/>
```
**Apply to:** "Отозвать доступ" (patient side) and "Убрать из списка наблюдаемых" (observer side) per OBSV-07, with copy exactly as specified in UI-SPEC.md's Copywriting Contract table.

### Day-boundary "today"/"week" math
**Source:** duplicated identically in `convex/glucose/getWeekReadings.ts:6,17-27`, `convex/meals/getWeekMeals.ts:6,17-27`, `convex/movement/getWeekMovement.ts:6,21-28`
**Apply to:** `getPatientToday.ts` (single-day slice, not full week) and any per-day aggregation inside `getObservedPatients.ts`. Note: this is the 4th/5th duplication site — RESEARCH.md flags extracting a shared `localDayBoundaries()` helper as an optional, non-blocking improvement.

### Toast feedback for mutation errors
**Source:** `app/app/(settings)/health.tsx:51-54,74`, `app/auth/confirm-phone.tsx:109`
```typescript
Toast.show({ text: "...", variant: "error" });
Toast.show({ text: "..." }); // success, no variant
```
**Apply to:** all mutation call sites in `observerCode.tsx`, `observedList.tsx`, matching exact copy strings from UI-SPEC.md's Copywriting Contract.

### `getColor(name, opacity?)` for accent/badge backgrounds
**Source:** `lib/ui/getColor.ts` (full function, lines 42-50), used with opacity at `components/home/HomeGlucoseSummary.tsx:70`
**Apply to:** `ObservedPatientCard.tsx` warning badges (`getColor("amber", 0.12)` / `getColor("red", 0.12)` backgrounds, opaque `getColor("amber")`/`getColor("red")` for icon/text) per UI-SPEC Color table.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `convex/utils/observerAuth.ts` | utility (auth) | request-response | First cross-user (BOLA-relevant) authorization check in the codebase — every existing query/mutation only ever compares against the caller's own `getAuthUserId(ctx)` result. Full draft implementation provided above and in RESEARCH.md Pattern 3; treat as reference code to adapt, not an existing file to copy from. |
| `convex/observers/utils/thresholds.ts` | utility (pure fn) | transform | No threshold/pure-business-logic module exists anywhere in `convex/` or `lib/` (confirmed by RESEARCH.md grep). Full draft implementation provided above and in RESEARCH.md "Code Examples". |

## Metadata

**Analog search scope:** `convex/tables/`, `convex/glucose/`, `convex/meals/`, `convex/movement/`, `convex/mealItems/`, `convex/profiles/`, `convex/users/`, `convex/utils/`, `convex/rateLimit.ts`, `convex/schema.ts`, `components/settings/`, `components/home/`, `components/ui/OTPInput.tsx`, `components/ui/AlertDialog.tsx`, `app/app/(settings)/`, `app/app/(tabs)/`, `app/auth/confirm-phone.tsx`, `lib/ui/getColor.ts`
**Files scanned:** 27 read directly (full or targeted), all ≤ 250 lines, single-pass reads, no re-reads
**Pattern extraction date:** 2026-08-15

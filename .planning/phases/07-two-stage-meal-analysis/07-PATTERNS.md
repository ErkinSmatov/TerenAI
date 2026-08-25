# Phase 7: Двухэтапное распознавание блюда - Pattern Map

**Mapped:** 2026-08-24
**Files analyzed:** 19 (new + modified)
**Analogs found:** 19 / 19

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `convex/meals/analyze/detectMealFromPhoto.ts` (NEW) | service (Convex `action`) | request-response | `convex/meals/analyze/analyzeMealPhoto.ts` | exact (same file, minus `createMeal`/`processDetectedItems`) |
| `convex/meals/analyze/detectMealFromText.ts` (NEW) | service (Convex `action`) | request-response | `convex/meals/analyze/analyzeMealDescription.ts` | exact |
| `convex/meals/analyze/processDetectedItems.ts` (MODIFIED) | service (plain async fn, called from action) | batch/transform | itself (current file) | exact — surgical edit only |
| `convex/meals/analyze/processDetectedItemsAction.ts` (NEW) | service (Convex `internalAction`) | event-driven (scheduler-invoked) | `convex/utils/backfillFoodEmbeddings.ts` (internalAction wrapping internal calls) + current `analyzeMealPhoto.ts` (try/catch → status error) | role-match |
| `convex/meals/confirmMeal.ts` (NEW) | controller (Convex `mutation`) | CRUD + event-driven (schedules background work) | `convex/meals/createMeal.ts` (insert pattern) + RESEARCH.md Pattern 1 (scheduler call, no in-repo scheduler precedent) | role-match (insert), no scheduler precedent exists in repo |
| `convex/meals/retryProcessDetectedItems.ts` (NEW) | controller (Convex `mutation`) | CRUD + event-driven | `convex/meals/updateMeal.ts` (ownership check + patch) | role-match |
| `convex/meals/updateMealInternal.ts` (NEW) | service (Convex `internalMutation`) | CRUD | `convex/meals/updateMeal.ts` (exact logic, swap auth for explicit `userId`) + `convex/foods/updateFoodTranslation.ts` (internalMutation shape) | exact (structure) |
| `convex/meals/replaceMealItemsInternal.ts` (NEW) | service (Convex `internalMutation`) | CRUD | `convex/meals/replaceMealItems.ts` (exact logic, swap auth for explicit `userId`) | exact (structure) |
| `convex/meals/getMeal.ts` (MODIFIED) | service (Convex `query`) | request-response | itself (current file) | exact — one-line filter change |
| `convex/meals/getWeekMeals.ts` (MODIFIED) | service (Convex `query`) | request-response | itself (current file) | exact — filter change |
| `convex/tables/meals.ts` (MODIFIED) | model (Convex table schema) | — | itself (current file) | exact — add fields |
| `convex/rateLimit.ts` (MODIFIED) | config | — | itself (current `aiFeatures`/`observerCodeRedeem` bucket definitions) | exact |
| `app/app/(meal)/confirm-meal.tsx` (NEW) | component/route (Expo Router screen) | request-response + local state | `app/app/(meal)/fix-meal.tsx` (screen scaffold: Screen* components, `useAction`, `useRateLimit`, `tryCatch`) | exact (structural precedent per D-01) |
| `app/app/(meal)/meal.tsx` (MODIFIED) | component/route | request-response | itself (current file) | exact — remove photo/description branches, add error state |
| `components/meal/Meal.tsx` (MODIFIED) | component | request-response | itself (current file) — add error branch sibling to `loading`/`done` | exact — extend existing component |
| `components/meal/ConfirmMealItems.tsx` (NEW) | component | CRUD (local list edit) | `components/meal/MealItems.tsx` (Card row list, `WithSkeleton`, add-row precedent already scaffolded/commented) | exact (structural precedent) |
| `components/meal/GramsStepper.tsx` (NEW) | component | — (pure UI, local state) | `components/ui/Toast.tsx` swipe-gesture pattern (for row) + `components/ui/Button.tsx` `variant="base"` (for +/- buttons) | role-match (composed from primitives, no single direct analog) |
| `app/app/(add)/camera.tsx` (MODIFIED) | component/route | request-response | itself — change `pathname: "/app/(meal)/meal"` → `"/app/(meal)/confirm-meal"` | exact — one-line change |
| `app/app/(add)/describe.tsx` (MODIFIED) | component/route | request-response | itself — same pathname change | exact — one-line change |

## Pattern Assignments

### `convex/meals/analyze/detectMealFromPhoto.ts` (service, request-response)

**Analog:** `convex/meals/analyze/analyzeMealPhoto.ts` (full file read, 72 lines)

**Imports pattern** (lines 1-10):
```typescript
import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api } from "../../_generated/api";
import detectMealItems from "./detectMealItems";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../../_generated/dataModel";
import logError from "@/lib/utils/logError";
import { rateLimiter } from "../../rateLimit";
import { subscriptionConfig } from "@/config/subscriptionConfig";
```

**Auth + pro-gate + rate-limit pattern** (lines 17-24, unchanged, stays at stage 1 per CONTEXT.md discretion note):
```typescript
const userId = await getAuthUserId(ctx);
if (userId === null) throw new Error("Unauthorized");

const profile = await ctx.runQuery(api.profiles.getProfile.default);
if (subscriptionConfig.isMonetizationEnabled && !profile?.isPro)
  throw new Error("Pro subscription required");

await rateLimiter.limit(ctx, "aiFeatures", { key: userId, throws: true });
```

**Core pattern — what changes vs. the analog:** DELETE the `mealId = await ctx.runMutation(api.meals.createMeal.default, ...)` call (lines 29-32 of analog) and the `processDetectedItems` call (lines 45-51) and the outer try/catch's `updateMeal` error-marking (there is no `mealId` yet to mark). Keep only: auth → pro-gate → rate-limit → `ctx.storage.getUrl(storageId)` → `detectMealItems({imageUrl})` → return `{mealName, items}` directly to the client. No DB write (D-05).

```typescript
// convex/meals/analyze/detectMealFromPhoto.ts — new shape
const detectMealFromPhoto = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const profile = await ctx.runQuery(api.profiles.getProfile.default);
    if (subscriptionConfig.isMonetizationEnabled && !profile?.isPro)
      throw new Error("Pro subscription required");

    await rateLimiter.limit(ctx, "aiFeatures", { key: userId, throws: true });

    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) throw new Error("Image not found");

    return await detectMealItems({ imageUrl }); // { mealName, items }
  },
});
export default detectMealFromPhoto;
```

**Error handling:** No try/catch needed at this stage — there's no `mealId` to mark as `error` yet (matches D-05: nothing exists in `meals` before confirm). Thrown errors propagate to the client `useAction` call, caught by the confirm-meal screen the same way `meal.tsx:146-150` currently catches `startMealAnalysis` errors.

---

### `convex/meals/analyze/detectMealFromText.ts` (service, request-response)

**Analog:** `convex/meals/analyze/analyzeMealDescription.ts` (full file read, 73 lines)

Same transformation as above: keep the `description.length > analyzeMealConfig.maxUserInputLength` guard (analog lines 16-18), auth/pro-gate/rate-limit block (lines 21-28), then call `detectMealItemsFromText({description})` (analog lines 34-36) and return `{mealName, items}` directly — no `createMeal`, no `processDetectedItems`.

```typescript
import { analyzeMealConfig } from "./analyzeMealConfig";
// ...
const detectMealFromText = action({
  args: { description: v.string() },
  handler: async (ctx, { description }) => {
    if (description.length > analyzeMealConfig.maxUserInputLength) {
      throw new Error("Description too long");
    }
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const profile = await ctx.runQuery(api.profiles.getProfile.default);
    if (subscriptionConfig.isMonetizationEnabled && !profile?.isPro)
      throw new Error("Pro subscription required");
    await rateLimiter.limit(ctx, "aiFeatures", { key: userId, throws: true });

    return await detectMealItemsFromText({ description }); // { mealName, items }
  },
});
```

**`DetectedItem`/`DetectedMeal` types to reuse unchanged:** `convex/meals/analyze/detectMealItems.ts:18-19` (`{name, grams}[]`) — this is the exact shape `confirmMeal`'s `items` arg and the new `confirmedItems` schema field must match, per RESEARCH.md Open Question 2.

---

### `convex/meals/confirmMeal.ts` (controller, CRUD + event-driven)

**Analog for the insert half:** `convex/meals/createMeal.ts` (full file, 32 lines) — auth check + `ctx.db.insert("meals", {...})` shape:
```typescript
const userId = await getAuthUserId(ctx);
if (userId === null) throw new Error("Unauthorized");

const mealId = await ctx.db.insert("meals", {
  userId,
  status: args.status ?? "pending",
  photoStorageId: args.photoStorageId,
});
```
Extend this insert to also set `status: "processing"`, `name: mealName`, `description`, `confirmedItems: cleanItems` (Pitfall 3: persist `name`/`description` at creation time, not only at the end of `processDetectedItems`).

**Analog for the scheduler half:** No in-repo precedent — `ctx.scheduler.*` is not used anywhere in this codebase (verified via repo-wide grep, zero hits). Use RESEARCH.md's Pattern 1 code example verbatim (sourced from official Convex docs, verified 2026-08-24):
```typescript
await ctx.scheduler.runAfter(
  0,
  internal.meals.analyze.processDetectedItemsAction.default,
  { mealId, userId, detectedItems: cleanItems, description }
);
return mealId;
```

**Validation pattern (D-12 + Security Domain V5, Assumption A2):**
```typescript
const cleanItems = items
  .filter((i) => i.name.trim().length > 0)          // D-12: silently drop blank names
  .map((i) => ({
    name: i.name.trim(),
    grams: Math.max(1, Math.min(1500, Math.round(i.grams))), // matches detectMealItems.ts:13 bound
  }))
  .slice(0, 30);                                      // defensive cap
if (cleanItems.length === 0) throw new Error("No items to confirm");
```

---

### `convex/meals/updateMealInternal.ts` / `convex/meals/replaceMealItemsInternal.ts` (service, CRUD, internalMutation)

**Analog for the public-mutation-to-internal-mutation transform:** `convex/meals/updateMeal.ts` (full file, 34 lines) and `convex/meals/replaceMealItems.ts` (full file, 112 lines) — copy the entire handler body unchanged, only swap the auth-derivation:

```typescript
// updateMeal.ts current (public) auth block — lines 17-22:
const userId = await getAuthUserId(ctx);
if (userId === null) throw new Error("Unauthorized");
const existingMeal = await ctx.db.get(id);
if (!existingMeal) throw new Error("Not found");
if (existingMeal.userId !== userId) throw new Error("Forbidden");
```
becomes, in `updateMealInternal.ts`:
```typescript
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { mealsFields } from "../tables/meals";
import { partial } from "convex-helpers/validators";

const { userId: _userId, totalMacros: _tm, totalNutrients: _tn, ...updatableFields } = mealsFields;

const updateMealInternal = internalMutation({
  args: {
    id: v.id("meals"),
    userId: v.id("users"),          // NEW: explicit, since ctx has no auth
    meal: v.object(partial(updatableFields)),
  },
  handler: async (ctx, { id, userId, meal }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Not found");
    if (existing.userId !== userId) throw new Error("Forbidden");
    await ctx.db.patch(id, meal);
    return null;
  },
});
export default updateMealInternal;
```
Same transform applies to `replaceMealItemsInternal.ts` — copy `replaceMealItems.ts`'s entire handler body (the macros/micros/nutrients aggregation loop, lines 36-105) unchanged, just add `userId: v.id("users")` to `args` and replace `const userId = await getAuthUserId(ctx)` with the passed-in param, keeping the `meal.userId !== userId → Forbidden` check.

**Structural precedent for the `internalMutation` builder itself (import + export shape):** `convex/foods/updateFoodTranslation.ts` (full file, 24 lines):
```typescript
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const updateFoodTranslation = internalMutation({
  args: { id: v.id("foods"), nameRu: v.string(), categoryRu: v.optional(v.string()) },
  handler: async (ctx, { id, nameRu, categoryRu }) => { /* ... */ },
});
export default updateFoodTranslation;
```
Note this file uses BOTH `export const X` and `export default X` — follow this dual-export convention (`internal.foods.updateFoodTranslation.default` is how it's called from `processDetectedItems.ts:52`).

---

### `convex/meals/analyze/processDetectedItemsAction.ts` (service, event-driven, internalAction)

**Analog for the internalAction wrapper shape:** `convex/utils/backfillFoodEmbeddings.ts` (full file, 100 lines) — the only existing `internalAction` + `internal.runMutation`/`internal.runQuery` composition in the repo:
```typescript
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
// handler calls ctx.runQuery(internal.X.Y, ...) / ctx.runMutation(internal.X.Y, ...) in a loop
```

**Analog for the try/catch → mark-error-on-failure pattern:** `convex/meals/analyze/analyzeMealPhoto.ts:54-67` (full file already read):
```typescript
} catch (error) {
  logError("analyzeMealPhoto error", error);
  try {
    if (mealId) {
      await ctx.runMutation(api.meals.updateMeal.default, {
        id: mealId,
        meal: { status: "error" },
      });
    }
  } catch (updateError) {
    logError("Failed to mark meal as error", updateError);
  }
  throw error;
}
```
Adapt for the internal path: replace `api.meals.updateMeal.default` with `internal.meals.updateMealInternal.default` and pass the explicit `userId` arg (Pitfall 1 — the public mutation will throw `Unauthorized` inside a scheduled action).

**Core pattern:** resolve `imageUrl` from `meal.photoStorageId` via `ctx.storage.getUrl` (mirrors `analyzeMealPhoto.ts:26`), then call the existing (unmodified-signature) `processDetectedItems({ctx, mealId, detectedItems, imageUrl, mealName, description})` function from `processDetectedItems.ts` — only that function's *internal* `ctx.runMutation` calls change (see next entry), not its exported signature.

---

### `convex/meals/analyze/processDetectedItems.ts` (MODIFIED — surgical edit)

**Analog:** itself, current file (full file read, 92 lines). Only two call sites change:
```typescript
// processDetectedItems.ts:82-90 — BEFORE
await ctx.runMutation(api.meals.replaceMealItems.default, { mealId, foods });
await ctx.runMutation(api.meals.updateMeal.default, {
  id: mealId,
  meal: { status: "done", name: mealName },
});
```
```typescript
// AFTER — add userId to Params, route through internal variants
await ctx.runMutation(internal.meals.replaceMealItemsInternal.default, { mealId, userId, foods });
await ctx.runMutation(internal.meals.updateMealInternal.default, {
  id: mealId,
  userId,
  meal: { status: "done", name: mealName },
});
```
`internal` is already imported at line 6 (`import { api, internal } from "../../_generated/api";`) — only `api` usages at lines 82/87 need to move to `internal`, and a `userId` field needs to be added to the `Params` type (line 12-19) and passed through by both callers (`processDetectedItemsAction.ts` and, if kept for barcode compatibility, unchanged for `analyzeMealBarcode.ts` if it still calls this — confirm at planning time whether `analyzeMealBarcode.ts` also needs the internal-mutation swap or keeps the old public-mutation inline path).

---

### `convex/meals/getMeal.ts` (MODIFIED — one-line filter change)

**Analog:** itself (full file, 41 lines). Current line 14:
```typescript
if (!meal || meal.status === "error" || meal.status === "deleted") {
  return null;
}
```
Per Pitfall 2 / D-15/D-16, remove the `meal.status === "error"` branch so errored meals are returned (still excluding `"deleted"`):
```typescript
if (!meal || meal.status === "deleted") {
  return null;
}
```

---

### `convex/meals/getWeekMeals.ts` (MODIFIED — filter change)

**Analog:** itself (full file, 61 lines). Current lines 31-36:
```typescript
.filter((q) =>
  q.and(
    q.neq(q.field("status"), "error"),
    q.neq(q.field("status"), "deleted")
  )
);
```
Remove the `error` neq clause so errored meals appear in history with their error state (Pitfall 2):
```typescript
.filter((q) => q.neq(q.field("status"), "deleted"));
```

---

### `convex/tables/meals.ts` (MODIFIED — add fields)

**Analog:** itself (full file, 22 lines). Add fields alongside existing `mealsFields`, matching `DetectedItem` shape (`detectMealItems.ts:19`) per RESEARCH.md Open Question 2:
```typescript
export const mealsFields = {
  userId: v.id("users"),
  status: v.union(/* unchanged */),
  name: v.optional(v.string()),
  photoStorageId: v.optional(v.id("_storage")),
  description: v.optional(v.string()),                                          // NEW
  confirmedItems: v.optional(
    v.array(v.object({ name: v.string(), grams: v.number() }))
  ),                                                                            // NEW
  totalMacros: v.optional(v.object(macrosFields)),
  totalMicros: v.optional(v.object(microsFields)),
  totalNutrients: v.optional(v.object(nutrientsFields)),
};
```
Note `updateMeal.ts:8` destructures `mealsFields` to build `updatableFields` (`const { userId, totalMacros, totalNutrients, ...updatableFields } = mealsFields;`) — new fields automatically become patchable through the existing public `updateMeal`/new `updateMealInternal` without further changes, since they fall into `...updatableFields`.

---

### `convex/rateLimit.ts` (MODIFIED — add retry bucket, D-18/A1)

**Analog:** itself, current `observerCodeRedeem`/`observerCodeGuess` fixed-window bucket definitions (full file, 36 lines):
```typescript
observerCodeRedeem: {
  kind: "fixed window",
  rate: 10,
  period: HOUR,
},
```
Add a sibling bucket for retry (D-18, keyed by `mealId` per RESEARCH.md Open Question 1 recommendation):
```typescript
mealRetry: {
  kind: "fixed window",
  rate: 10,
  period: HOUR,
},
```
`DAY = 24 * HOUR` is already derived at the top of the file (line 5) — reuse `HOUR` import already present (line 1).

---

### `app/app/(meal)/confirm-meal.tsx` (component/route, D-01)

**Analog:** `app/app/(meal)/fix-meal.tsx` (full file, 105 lines) — exact structural precedent per D-01. Reuse:

**Screen scaffold imports** (lines 1-22 of analog):
```typescript
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRateLimit } from "@convex-dev/rate-limiter/react";
import { ScreenMain, ScreenMainTitle } from "@/components/ui/screen/ScreenMain";
import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenFooter,
  ScreenFooterButton,
} from "@/components/ui/screen/ScreenFooter";
import { Toast } from "@/components/ui/Toast";
import SafeArea, { useSafeArea } from "@/components/ui/SafeArea";
import tryCatch from "@/lib/utils/tryCatch";
```

**Screen skeleton** (lines 58-104 of analog — `ScreenMain` → `ScreenHeader` → content → `ScreenFooter`):
```typescript
return (
  <ScreenMain edges={[]}>
    <ScreenHeader>
      <ScreenHeaderBackButton />
      <ScreenHeaderTitle title="Проверьте блюдо" />
    </ScreenHeader>
    <SafeArea edges={["left", "right"]}>
      {/* photo preview (D-07), ConfirmMealItems list */}
    </SafeArea>
    <ScreenFooter style={{ boxShadow: [] }}>
      <ScreenFooterButton onPress={handleConfirm} disabled={/* ... */}>
        {isConfirming ? "Подтверждаем…" : "Подтвердить"}
      </ScreenFooterButton>
    </ScreenFooter>
  </ScreenMain>
);
```

**Disabled/label-swap-while-in-flight pattern** (analog lines 88-99, exact copy per UI-SPEC.md's CTA-while-confirming spec):
```typescript
const [isCorrecting, setIsCorrecting] = useState(false); // → isConfirming
// ...
setIsCorrecting(true);
const { error } = await tryCatch(correctMeal({ mealId, correction })); // → confirmMeal({...})
setIsCorrecting(false);
if (error) {
  Toast.show({ text: "Ошибка при исправлении блюда", variant: "error" }); // adapt copy
  return;
}
router.dismiss(); // adapt: router.replace to meal.tsx with mealId
```

**Detect-on-mount pattern (new, no direct analog):** compose from `meal.tsx`'s upload-and-detect logic (lines 57-91 for photo upload to storage, lines 34-44 for `useAction` hook declarations) — this is the logic Pitfall 4 says must MOVE from `meal.tsx` into `confirm-meal.tsx`:
```typescript
// meal.tsx:36-45 — useAction hook declarations, adapt to new action names
const generateUploadUrl = useMutation(api.storage.generateUploadUrl.default);
const detectMealFromPhoto = useAction(api.meals.analyze.detectMealFromPhoto.default);
const detectMealFromText = useAction(api.meals.analyze.detectMealFromText.default);
// meal.tsx:57-89 — photo crop/upload-to-storage block, unchanged, reuse verbatim
```

**Leave-confirmation dialog (D-06):** use RESEARCH.md Pattern 3 verbatim (official React Navigation docs example, no in-repo full-dialog precedent — `generateMacroTargets.tsx:237-239` only shows the back-button-interception half without the `Alert.alert`):
```typescript
import { usePreventRemove } from "@react-navigation/native";
import { Alert } from "react-native";
import { useNavigation } from "expo-router";

const navigation = useNavigation();
usePreventRemove(!confirmed, ({ data }) => {
  Alert.alert(
    "Уйти без подтверждения?",
    "Список ингредиентов не будет сохранён.",
    [
      { text: "Остаться", style: "cancel" },
      { text: "Уйти", style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]
  );
});
```

**Rate-limit-hit toast pattern** (reused verbatim, `fix-meal.tsx:38-44` / `camera.tsx:52-61`):
```typescript
const { status } = useRateLimit(api.rateLimit.getAiFeaturesRateLimit, {
  getServerTimeMutation: api.rateLimit.getServerTime,
});
if (status && !status.ok) {
  Toast.show({ text: "Вы достигли дневного лимита функций ИИ.", variant: "error" });
  return;
}
```

---

### `components/meal/ConfirmMealItems.tsx` (component, CRUD local edit)

**Analog:** `components/meal/MealItems.tsx` (full file, 154 lines) — reuse the `Card` row shell, `WithSkeleton` usage, and the already-scaffolded-but-commented "add more" button.

**Row shell to extend for editability** (analog lines 67-110, `styles.card` at lines 133-139):
```typescript
<Card style={styles.card}>  {/* flexDirection:row, padding:16, gap:20 — per UI-SPEC "Ingredient Row" */}
  {/* inline-editable name TextInput instead of read-only <Text> */}
  {/* GramsStepper instead of read-only grams <Text> */}
</Card>
```
```typescript
const styles = StyleSheet.create({
  ingredientsContainer: { gap: 8 },   // MealItems.tsx:130-132, UI-SPEC "sm" token
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    gap: 20,
  },                                    // MealItems.tsx:133-139, exact match to UI-SPEC row spec
});
```

**Add-ingredient row — exact commented-out precedent to un-comment/adapt** (`MealItems.tsx:33-47`, per UI-SPEC.md's explicit instruction to reuse this exact style):
```typescript
<Button variant="base" size="base" style={styles.addMoreButton} hitSlop={10}>
  <PlusIcon size={14} strokeWidth={2.25} color={getColor("mutedForeground")} />
  <Text size="14" color={getColor("mutedForeground")}>Добавить ингредиент</Text>
</Button>
```

**Skeleton-while-detecting pattern (D-08)** — `WithSkeleton` usage, `components/ui/WithSkeleton.tsx` (full file, 41 lines):
```typescript
<WithSkeleton
  loading={loading}
  containerStyle={styles.cardLeftContent}
  skeletonStyle={{ height: 14, width: nameWidth, borderRadius: 4 }}
>
  {/* content */}
</WithSkeleton>
```
`placeholderRows = 4` / `nameSkeletonWidths` pattern (`MealItems.tsx:21-27`) — reuse for the 3-placeholder-row skeleton the UI-SPEC calls for.

---

### `components/meal/GramsStepper.tsx` (component, D-11, no direct single analog)

**Button primitive to compose from:** `components/ui/Button.tsx` (full file, 294 lines) — `variant="base"` strips default padding/border-radius for custom-shaped tap targets (used exactly this way for the stepper's 44×44pt icon buttons per UI-SPEC):
```typescript
<Button variant="base" size="base" onPress={() => setGrams((g) => Math.max(1, g - 10))}>
  <MinusIcon size={16} color={getColor("foreground")} />
</Button>
```

**Swipe/gesture composition precedent (for row swipe-to-delete, D-04):** `components/ui/Toast.tsx:105-120` (already read in full above) — `Gesture.Pan()` + `scheduleOnRN` + `withSpring` snap-back, exact pattern to adapt:
```typescript
const translateX = useSharedValue(0);
const panGesture = Gesture.Pan()
  .onUpdate((event) => { translateX.value = event.translationX; })
  .onEnd((event) => {
    if (event.translationX < -80) {
      scheduleOnRN(onRemove);
    } else {
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    }
  });
```

---

### `components/meal/Meal.tsx` (MODIFIED — add error branch, D-15/D-16)

**Analog:** itself, current file (full file, 150 lines). Currently only `loading`/`done` implicit states exist (driven by the single `loading: boolean` prop). Add a third rendering path modeled on the existing footer-button pattern (`Meal.tsx:126-147`, the `"Готово"`/`"Исправить"` `ScreenFooterButton`s):

```typescript
// New prop: status?: "error" (in addition to loading)
// Sibling branch inside ScreenMainScrollView, per UI-SPEC "Error State" spec:
<TriangleAlertIcon size={48} color={getColor("red")} />
<Text size="18" weight="600">Не удалось распознать блюдо</Text>
<Text size="14" color={getColor("mutedForeground")}>
  Что-то пошло не так при обработке. Попробуйте ещё раз.
</Text>
```
`TriangleAlertIcon` precedent: `components/observer/ObservedPatientCard.tsx` (per UI-SPEC, "already used for warnings" — icon-only color reservation convention, no full-row tinting).

**Retry button, disabled/label-swap in flight** — same pattern as `fix-meal.tsx`'s `isCorrecting` (already extracted above), applied to `Meal.tsx`'s footer:
```typescript
<ScreenFooterButton onPress={handleRetry} disabled={isRetrying}>
  <ScreenFooterButtonIcon Icon={RefreshCwIcon} color={getColor("background")} />
  {isRetrying ? "Повторяем…" : "Повторить"}
</ScreenFooterButton>
```
`RefreshCwIcon` precedent: `app/app/(tabs)/settings.tsx:23,149` (`Icon={RefreshCwIcon}` for the "Восстановить покупки" retry-style action — same icon, same semantic use).

**Toast-on-done pattern (D-13, MEAL-04):** place in `meal.tsx` (the route file, which owns `useQuery(getMeal)`), not inside `Meal.tsx` itself:
```typescript
// meal.tsx — new useEffect
const hasNotifiedRef = useRef(false);
useEffect(() => {
  if (meal?.status === "done" && !hasNotifiedRef.current) {
    hasNotifiedRef.current = true;
    Toast.show({ text: "Блюдо распознано и записано", variant: "success" });
  }
}, [meal?.status]);
```

---

### `app/app/(meal)/meal.tsx` (MODIFIED — Pitfall 4 surgical split)

**Analog:** itself, current file (full file, 202 lines). Per Pitfall 4:
- DELETE `createMealFromPhoto`/`createMealFromDescription` and their branches in `startMealAnalysis` (lines 57-98, 136-141) — this logic moves to `confirm-meal.tsx`.
- KEEP `createMealFromBarcode` and its branch (lines 100-123, 142-144) unchanged — barcode flow stays synchronous, out of scope.
- KEEP the `initialMealId` fast-path guard (lines 126-132) — `confirm-meal.tsx` will navigate here with `mealId` already set, hitting this exact existing skip-analysis path (`(!photoUri && !description && !barcode) || initialMealId || ...`  → returns early).
- KEEP `isLoading = !mealId || !data || !isDone` (line 190) for the `done` case; ADD the new error-state pass-through (`data?.meal?.status === "error"` → render `Meal`'s new error branch instead of loading skeleton) since `getMeal.ts` now returns non-null for errored meals (Pitfall 2).

---

### `app/app/(add)/camera.tsx` / `app/app/(add)/describe.tsx` (MODIFIED — one-line pathname change each)

**Analog:** themselves, current files (full files read, 217 and 98 lines respectively). Only change the `router.replace({ pathname: ... })` target:
```typescript
// camera.tsx:77-81, 110-113 — BEFORE
router.replace({ pathname: "/app/(meal)/meal", params: { photoUri: photo.uri, source: "camera" } });
// AFTER
router.replace({ pathname: "/app/(meal)/confirm-meal", params: { photoUri: photo.uri, source: "camera" } });
```
```typescript
// describe.tsx:41-44 — BEFORE
router.replace({ pathname: "/app/(meal)/meal", params: { description } });
// AFTER
router.replace({ pathname: "/app/(meal)/confirm-meal", params: { description } });
```
Barcode branch in `camera.tsx:126-129` stays pointed at `/app/(meal)/meal` unchanged (barcode flow untouched, Pitfall 4).

---

## Shared Patterns

### Auth check (every public Convex function)
**Source:** `convex/meals/updateMeal.ts:17-18`, `convex/meals/createMeal.ts:14-15`, repeated identically across every file in `convex/meals/*`
**Apply to:** `confirmMeal.ts`, `retryProcessDetectedItems.ts`, `detectMealFromPhoto.ts`, `detectMealFromText.ts`
```typescript
const userId = await getAuthUserId(ctx);
if (userId === null) throw new Error("Unauthorized");
```

### Ownership check (mutations touching an existing meal)
**Source:** `convex/meals/updateMeal.ts:20-22`, `convex/meals/replaceMealItems.ts:25-27`
**Apply to:** `retryProcessDetectedItems.ts`, `updateMealInternal.ts`, `replaceMealItemsInternal.ts` (with explicit `userId` param instead of derived)
```typescript
const existingMeal = await ctx.db.get(id);
if (!existingMeal) throw new Error("Not found");
if (existingMeal.userId !== userId) throw new Error("Forbidden");
```

### Error logging wrapper
**Source:** `lib/utils/logError` used consistently — `analyzeMealPhoto.ts:7,55`, `createMeal.ts:5,25`, `getMeal.ts:4,34`, `getWeekMeals.ts:4,54`
**Apply to:** All new Convex functions
```typescript
import logError from "@/lib/utils/logError";
try {
  // ...
} catch (error) {
  logError("<functionName> error", error);
  throw error;
}
```

### Rate-limit-reached toast (client)
**Source:** `app/app/(add)/camera.tsx:52-61`, `app/app/(add)/describe.tsx:33-39,79-84`, `components/meal/Meal.tsx:77-83`
**Apply to:** `confirm-meal.tsx` (stage-1 detect trigger)
```typescript
const { status } = useRateLimit(api.rateLimit.getAiFeaturesRateLimit, {
  getServerTimeMutation: api.rateLimit.getServerTime,
});
if (status && !status.ok) {
  Toast.show({ text: "Вы достигли дневного лимита функций ИИ.", variant: "error" });
  return;
}
```

### Disabled-button + label-swap while a mutation/action is in flight
**Source:** `app/app/(meal)/fix-meal.tsx:30,46-56,88-98` (`isCorrecting` state → `"Исправляем…"`)
**Apply to:** `confirm-meal.tsx` ("Подтверждаем…"), `Meal.tsx` retry button ("Повторяем…")
```typescript
const [isBusy, setIsBusy] = useState(false);
// ...
setIsBusy(true);
const { error } = await tryCatch(someMutationOrAction(args));
setIsBusy(false);
if (error) { Toast.show({ text: "...", variant: "error" }); return; }
```

### `tryCatch` wrapper instead of raw try/catch (client-side)
**Source:** `lib/utils/tryCatch.ts`, used in `fix-meal.tsx:47`
**Apply to:** `confirm-meal.tsx` (confirm mutation call), `Meal.tsx` (retry mutation call)

### `internalMutation`/`internalAction`/`internalQuery` file shape (dual export)
**Source:** `convex/foods/updateFoodTranslation.ts` (full file), `convex/utils/backfillFoodEmbeddings.ts` (full file)
**Apply to:** `updateMealInternal.ts`, `replaceMealItemsInternal.ts`, `processDetectedItemsAction.ts`
```typescript
import { internalMutation } from "../_generated/server";
export const someName = internalMutation({ args: {...}, handler: async (ctx, args) => {...} });
export default someName; // called via internal.module.someName.default
```

### Screen scaffold (`ScreenMain`/`ScreenHeader`/`ScreenFooter`)
**Source:** `app/app/(meal)/fix-meal.tsx` (full file, exact precedent per D-01), `app/app/(add)/describe.tsx` (full file)
**Apply to:** `confirm-meal.tsx`
```typescript
<ScreenMain edges={[]}>
  <ScreenHeader>
    <ScreenHeaderBackButton />
    <ScreenHeaderTitle title="..." />
  </ScreenHeader>
  <SafeArea edges={["left", "right"]}>{/* content */}</SafeArea>
  <ScreenFooter style={{ boxShadow: [] }}>
    <ScreenFooterButton onPress={...} disabled={...}>...</ScreenFooterButton>
  </ScreenFooter>
</ScreenMain>
```

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `ctx.scheduler.runAfter(...)` call itself (used inside `confirmMeal.ts` and `retryProcessDetectedItems.ts`) | — | event-driven | Zero uses of `ctx.scheduler.*` anywhere in the current repo (verified via `grep -rn "scheduler\."` across `convex/` — no hits). Must follow RESEARCH.md's Pattern 1 code example, sourced from official Convex docs, verbatim — no in-repo precedent to copy from instead. |
| `usePreventRemove(...)` showing an actual `Alert.alert` confirmation dialog | — | — | Both existing repo usages (`generateMacroTargets.tsx:237-239`, `Onboarding.tsx:36,362`) only intercept Android hardware back for in-wizard step-back — neither shows a confirmation `Alert`. Must follow RESEARCH.md Pattern 3 (official React Navigation docs example) verbatim for the dialog half; the hook-usage half (`usePreventRemove(condition, callback)`) does have a repo precedent. |
| `GramsStepper.tsx` tap-to-edit-number → keyboard transition | — | — | No existing "tap number to open numeric keyboard inline" component in the repo. Compose from `Button variant="base"` (stepper +/- buttons) and a bare `RNTextInput` (per UI-SPEC.md's explicit note: NOT the boxed `TextInput.tsx` component, to avoid double-nested Card chrome) — no single analog, UI-SPEC.md is the authoritative spec for this element. |

## Metadata

**Analog search scope:** `convex/meals/**`, `convex/tables/meals.ts`, `convex/rateLimit.ts`, `convex/foods/*` (internalMutation precedent), `convex/utils/backfillFoodEmbeddings.ts` (internalAction precedent), `app/app/(meal)/**`, `app/app/(add)/camera.tsx`, `app/app/(add)/describe.tsx`, `app/app/(settings)/generateMacroTargets.tsx` (usePreventRemove precedent), `components/meal/**`, `components/ui/Toast.tsx`, `components/ui/Button.tsx`, `components/ui/WithSkeleton.tsx`, `components/ui/screen/**`
**Files scanned:** 27 read in full or targeted sections; repo-wide grep for `scheduler.`, `internalMutation`, `internalAction`, `internalQuery`, `usePreventRemove`, `RefreshCwIcon`
**Pattern extraction date:** 2026-08-24

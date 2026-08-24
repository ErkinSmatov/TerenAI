# Phase 7: Двухэтапное распознавание блюда - Research

**Researched:** 2026-08-24
**Domain:** Convex (scheduler, auth propagation, mutation/action split) + Expo Router (file-based routing, navigation-guard) refactor of an existing AI pipeline. No new external libraries.
**Confidence:** HIGH — every claim below is either read directly from the current repo (file:line cited) or verified against official Convex/React Navigation docs.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Экран подтверждения ингредиентов**
- **D-01:** Отдельный экран (новый route), а не переиспользование `meal.tsx` — по прецеденту `fix-meal.tsx`. Между отправкой фото/описания и обычным экраном блюда появляется промежуточный шаг
- **D-02:** Редактирование названия и граммовки — инлайн прямо в списке, без перехода на отдельную форму/модалку
- **D-03:** Добавление ингредиента, которого AI не распознал — кнопка «+» внизу списка, тот же инлайн-ввод, что и у распознанных элементов
- **D-04:** Удаление распознанного ингредиента — свайп или кнопка «✕» на строке
- **D-05:** `createMeal` вызывается только ПОСЛЕ подтверждения списка — не сразу после фото/описания, как сейчас (`analyzeMealPhoto.ts:29-32`, `analyzeMealDescription.ts:30-32`). До подтверждения в истории блюд и на главном экране ничего не видно — ни заглушки, ни карточки
- **D-06:** Если пользователь уходит с экрана подтверждения (свайп/кнопка назад), не подтвердив список — показывается диалог «точно уйти?» перед выходом
- **D-07:** Фото блюда показывается превью сверху над списком ингредиентов (только для пути с фото — `imageUrl` уже доступен на момент вызова `detectMealItems`; для пути с текстовым описанием неактуально)
- **D-08:** Пока идёт быстрое AI-распознавание (`detectMealItems`/`detectMealItemsFromText`), пользователь уже находится на экране подтверждения — там показывается спиннер/скелетон внутри экрана, а не отдельный промежуточный загрузочный экран
- **D-09:** Если пользователь закрывает приложение целиком (не через кнопку «назад») до подтверждения — уже загруженное в storage фото остаётся без единой записи о нём в `meals`. Осознанно принято как есть; механизм очистки/восстановления НЕ входит в скоуп этой фазы

**Редактирование ингредиента**
- **D-10:** Правка названия ингредиента — простая правка текста в локальном состоянии экрана, без повторного AI-вызова. Даже если пользователь меняет ингредиент на принципиально другой продукт (курица → тофу), граммовку по новому названию AI не переоценивает
- **D-11:** Ввод граммовки — степпер с фиксированным шагом ±10г; тап по числу открывает клавиатуру для точного значения (нужно для больших правок, когда AI сильно ошибся)
- **D-12:** Ингредиент с пустым названием (добавлен через «+», имя не введено) при подтверждении молча удаляется из списка — не блокирует кнопку подтверждения валидацией

**Уведомление о готовности**
- **D-13:** Push-уведомления НЕ используются в этой фазе — push-инфраструктуры (device tokens, FCM/APNs, серверный триггер) в проекте нет вообще, это отдельный открытый research question ещё с Phase 6 (`.planning/research/questions.md`). Готовность показывается in-app toast/badge через существующий `components/ui/Toast.tsx`, только если приложение открыто в момент завершения фоновой обработки
- **D-14:** Если приложение было закрыто/в фоне на момент завершения фоновой обработки — отдельный индикатор при следующем открытии не нужен. Достаточно того, что блюдо уже готово в истории/на главном экране за счёт реактивности Convex (`useQuery` сам покажет актуальные данные при следующем рендере)

**Ошибка фоновой стадии**
- **D-15:** Если `processDetectedItems` падает уже после того, как пользователь подтвердил список и ушёл с экрана — блюдо остаётся в истории со статусом `error`, аналогично тому, как сейчас обрабатывается ошибка `detectMealItems`/`detectMealItemsFromText` (пустой список → `status: "error"`)
- **D-16:** На блюде в статусе `error` появляется кнопка «Повторить» — это НОВАЯ возможность, сейчас в проекте вообще нет retry-механизма для анализа блюда (только показ ошибки)
- **D-17:** «Повторить» перезапускает только `processDetectedItems` (поиск кандидатов + КБЖУ) с уже сохранённым подтверждённым списком ингредиентов — не весь AI-анализ фото/описания заново. Повтор НЕ списывается с лимита 50 AI-запросов/день (`convex/rateLimit.ts`, `rateLimiter.limit(ctx, "aiFeatures", ...)`), потому что это восстановление после технического сбоя, а не новый запрос пользователя

### Claude's Discretion
- Технический механизм доставки toast о готовности: клиентский `useQuery` наблюдает переход `meal.status` в `done` и триггерит `Toast.show(...)` — реактивность Convex уже это даёт, никакого нового канала строить не нужно
- Где персистить подтверждённый список ингредиентов для кнопки «Повторить» (D-16/D-17) — сейчас `detectedItems` существует только как параметр функции `processDetectedItems`, нигде не сохраняется. Нужно поле на `meals` (или отдельная структура) — конкретная схема на усмотрение планировщика/исполнителя, по существующим конвенциям `convex/tables/*.ts`
- Нужен ли новый статус в enum `meals.status` (`pending`/`processing`/`done`/`error`/`deleted`) для состояния «список показан, ждём подтверждения» — с учётом D-05 (`createMeal` не вызывается до подтверждения) вероятно отдельный статус не требуется вообще, раз до подтверждения записи в Convex ещё не существует. Подтвердить на этапе research/planning
- Точная UI-реализация степпера и перехода тап→клавиатура (D-11) — по существующим UI-паттернам проекта
- Как рейт-лимит применяется к разделённому пайплайну — по прецеденту сейчас лимит списывается один раз при исходной отправке фото/описания (это стадия 1, AI-распознавание); фаза не меняет точку списания, только явно не добавляет повторное списание на retry (D-17)

### Deferred Ideas (OUT OF SCOPE)
- **Реальные push-уведомления** о готовности блюда — сознательно вне этой фазы (D-13). Остаётся открытым research question с Phase 6 (`.planning/research/questions.md`)
- **Очистка осиротевших файлов в storage** (фото загружено, но `createMeal` не вызван, потому что пользователь закрыл приложение до подтверждения) — рассмотрено и осознанно оставлено как есть (D-09)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEAL-01 | Пользователь видит список распознанных ингредиентов за секунды, до тяжёлого поиска | New `detectMealFromPhoto`/`detectMealFromText` actions (no DB write) + new confirm-meal screen — see Architecture Patterns |
| MEAL-02 | Редактирование/добавление/удаление ингредиента до подтверждения | Local screen state pattern (D-02/D-03/D-04), inline edit + stepper — see Code Examples |
| MEAL-03 | Тяжёлая часть выполняется асинхронно после подтверждения, не блокирует пользователя | `ctx.scheduler.runAfter(0, ...)` fire-and-forget pattern from a `mutation` — see Architecture Patterns, Pitfall 1 |
| MEAL-04 | Уведомление по завершении фоновой обработки | Existing `Toast.tsx` + `useQuery` reactivity on `meal.status` — see Code Examples |
| MEAL-05 | Главный экран обновляется автоматически | Free consequence of Convex reactivity — `updateMealTotals`/`replaceMealItems` already patch `meals` doc that `getWeekMeals`/home screen already `useQuery` |

</phase_requirements>

## Summary

The current pipeline (`analyzeMealPhoto.ts` / `analyzeMealDescription.ts`) is a single synchronous `action` per meal-creation flow: `createMeal` → `detectMealItems`/`detectMealItemsFromText` (fast AI call, no DB) → `processDetectedItems` (slow: vector search, AI candidate selection, on-demand translation/health-score, `replaceMealItems`, `updateMeal→done`). It already has the right internal seam (detect vs. process), but the client only gets a single `useAction` call that resolves after **everything**, including the slow part, is done. Splitting this at the network boundary is straightforward. The single hardest technical question — verified against official Convex docs — is that **`ctx.scheduler.runAfter` does NOT propagate the caller's auth identity to the scheduled function**. `processDetectedItems` currently calls `api.meals.replaceMealItems.default` and `api.meals.updateMeal.default`, both of which are public mutations that call `getAuthUserId(ctx)` and throw `"Unauthorized"` if it's null. If `processDetectedItems` is invoked via the scheduler (required for MEAL-03's "don't block the client" requirement), those two calls **will throw** unless they are replaced with internal variants that take an explicit, already-validated `userId` argument instead of deriving it from request auth.

A second major finding, not anticipated by CONTEXT.md: **error-status meals are currently completely invisible to the user.** `getMeal.ts:14` returns `null` for `status === "error"`, which triggers `meal.tsx:167-169`'s `<Redirect href="/app" />`. `getWeekMeals.ts:33` filters `status !== "error"` out of history entirely. So D-15's premise ("остаётся в истории со статусом error, аналогично тому, как сейчас") does not hold — today an errored meal is silently deleted from the user's view, not shown with an error state. Implementing the Retry button (D-16/D-17) requires removing these filters and adding real error-state UI to `Meal.tsx`, which today has no error rendering path at all (only a permanent loading skeleton, since `isLoading = !mealId || !data || !isDone` never resolves to `false` for a `null` query result — it just gets redirected away first).

**Primary recommendation:** Introduce a `mutation` (not an `action`) as the confirm/stage-2 entry point. Mutations return to the client immediately after their transaction commits and can call `ctx.scheduler.runAfter(0, ...)` atomically as part of that same transaction — this is the idiomatic Convex pattern for "accept input fast, do the heavy lifting in the background," and it sidesteps the fact that `useAction` on the client always awaits full completion of whatever it calls. Add one new `internalAction` that wraps the existing `processDetectedItems` function, plus two new `internal` mutations (`updateMealInternal`, `replaceMealItemsInternal`) that accept an explicit `userId` for ownership checks instead of `getAuthUserId(ctx)`. Persist `confirmedItems` (the edited list) and `description` on the `meals` table row created at confirm time, and set `meal.name` immediately at creation (not only at the end of `processDetectedItems`) so retry has everything it needs without re-running AI detection.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fast ingredient detection (AI vision/text call) | API / Backend (Convex `action`) | — | Needs `fetch` to OpenRouter/Google — actions only, no DB write per D-05 |
| Ingredient list editing (name/grams/add/remove) | Browser / Client (Expo screen local state) | — | D-02/D-10: pure local state, no server round-trip until confirm |
| Confirm → create meal row + persist retry data | API / Backend (Convex `mutation`) | — | Must be synchronous/transactional and fast; also the point that schedules background work |
| Heavy analysis (FDC search, translate, health score, totals) | API / Backend (Convex `internalAction`, scheduled) | Database / Storage (Convex tables) | Existing `processDetectedItems` logic, now scheduler-invoked instead of inline |
| Ready notification | Browser / Client (`useQuery` + `Toast.show`) | — | D-13: in-app only; Convex reactivity already pushes the `done` transition to the client |
| Home screen daily summary refresh | Browser / Client (`useQuery` reactivity) | API / Backend (`updateMealTotals`) | MEAL-05 is a free consequence of existing reactive queries; no new wiring needed |
| Retry (re-run heavy step only) | API / Backend (Convex `mutation` → same scheduled `internalAction`) | — | Must not consume the 50/day AI limit (D-17); reuses the confirm mutation's scheduling pattern |

## Standard Stack

No new external packages are required for this phase — it is a refactor of existing Convex functions plus new Expo Router screens using components already in the codebase (`react-native-gesture-handler`, `react-native-reanimated`, `@react-navigation/native`'s `usePreventRemove`, all already dependencies). See Package Legitimacy Audit below.

### Core (existing, reused)
| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `convex` | ^1.27.3 | Scheduler (`ctx.scheduler.runAfter`), mutation/action/internalAction split | Already the app's backend; scheduler is the documented mechanism for background work |
| `expo-router` | ~6.0.14 | New confirm-meal route (file-based) | Existing routing convention, `(meal)` group already has `fix-meal.tsx` precedent |
| `@react-navigation/native` | (transitive, via expo-router) | `usePreventRemove` for D-06 leave-confirmation | Already used in `generateMacroTargets.tsx:24,237` and `Onboarding.tsx:36,362` (Android back-button gating); this phase needs the fuller Alert-dialog pattern, not yet used elsewhere in the repo |
| `react-native-gesture-handler` | ~2.28.0 | Swipe-to-delete on ingredient row (D-04) | Already used for the swipe-to-dismiss gesture in `components/ui/Toast.tsx:106-116` — same `Gesture.Pan()` pattern applies |
| `@convex-dev/rate-limiter` | ^0.3.0 | `rateLimiter.limit(ctx, "aiFeatures", ...)` at stage 1 only | Unchanged call site, just moved out of the (now split) analyze actions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ctx.scheduler.runAfter(0, ...)` from a `mutation` | Awaiting `processDetectedItems` inline inside a public `action` and just not `await`-ing the promise on the client | Rejected — `useAction` on the Convex React client always awaits the full server round-trip; there is no fire-and-forget client-side action call. The scheduler is the only server-side mechanism for "return now, keep working." |
| New `internal` mutations with explicit `userId` param | Reusing public `updateMeal`/`replaceMealItems` as-is | Rejected — confirmed via official docs that scheduled functions do not inherit caller auth; `getAuthUserId(ctx)` returns `null` inside a scheduled `internalAction`, so calling the existing public mutations from there throws `Unauthorized` |

**Installation:** None — no new dependencies.

## Package Legitimacy Audit

No external packages are being added by this phase. All libraries referenced above are pre-existing dependencies already declared in `package.json` and already used elsewhere in the codebase (see file:line citations above). `slopcheck`/registry verification is not applicable — nothing new is being installed.

**Packages removed due to slopcheck [SLOP] verdict:** none (n/a)
**Packages flagged as suspicious [SUS]:** none (n/a)

## Architecture Patterns

### System Architecture Diagram

```
[camera.tsx / describe.tsx]
        │  router.replace({ pathname: "/app/(meal)/confirm-meal", params: { photoUri | description, source } })
        ▼
[NEW confirm-meal.tsx]  (D-01: new route, not meal.tsx)
        │  on mount: upload photo to storage (if photo path) → storageId
        │  call NEW action: detectMealFromPhoto({storageId}) OR detectMealFromText({description})
        │      - checks auth, pro-gate, rateLimiter.limit("aiFeatures")   [charged HERE, unchanged point]
        │      - calls detectMealItems / detectMealItemsFromText (AI call, no DB write)
        │      - returns { mealName, items } to client — NO createMeal (D-05)
        │  screen shows spinner/skeleton while awaiting (D-08), then editable list (D-02/D-03/D-04)
        │  user edits locally (React state only, no server calls) — D-10
        │
        │  user taps "Подтвердить"
        ▼
   NEW mutation: confirmMeal({ photoStorageId?, description?, mealName, items })
        │  - getAuthUserId(ctx)  [normal mutation, auth present]
        │  - validate items (drop blank-name rows per D-12, clamp grams 1-1500, cap array length)
        │  - ctx.db.insert("meals", { userId, status: "processing", name: mealName,
        │        photoStorageId, description, confirmedItems: items })   ← D-05 fires HERE
        │  - ctx.scheduler.runAfter(0, internal.meals.analyze.processDetectedItemsAction.default,
        │        { mealId, userId, detectedItems: items, description })
        │  - returns mealId immediately (MEAL-03: does not wait for scheduler)
        ▼
[router navigates to existing meal.tsx?mealId=...]   ← user can leave freely, work continues server-side
        │
        ▼ (async, scheduled, runs after mutation commits)
   NEW internalAction: processDetectedItemsAction({ mealId, userId, detectedItems, description })
        │  - resolves imageUrl from meal.photoStorageId via ctx.storage.getUrl (if present)
        │  - calls EXISTING processDetectedItems({ctx, mealId, detectedItems, imageUrl, mealName, description})
        │      - searchFdcCandidates → selectCandidates → translate/health-score (unchanged)
        │      - internally now calls internal.meals.replaceMealItemsInternal / updateMealInternal
        │        (NEW — pass userId explicitly; public versions unreachable from scheduled ctx, see Pitfall 1)
        │  - on success: meal.status → "done" (triggers reactivity)
        │  - on failure (catch): internal.meals.updateMealInternal({id: mealId, userId, meal: {status: "error"}})
        ▼
[meal.tsx via useQuery(getMeal)] — reactively re-renders when status flips to "done" or "error"
        │  - on "done": Toast.show({text: "Блюдо распознано", variant: "success"})  (MEAL-04)
        │  - on "error": NEW error UI + "Повторить" button (D-16)
        ▼
[home screen / getWeekMeals] — already `useQuery`-driven, re-renders automatically once meal.status/totals patch (MEAL-05, no new code needed)

Retry path (D-16/D-17):
[Meal.tsx error state] → NEW mutation retryProcessDetectedItems({mealId})
        │  - getAuthUserId(ctx), verify meal.userId === userId AND meal.status === "error"
        │  - NO rateLimiter.limit call (D-17)
        │  - ctx.db.patch(mealId, {status: "processing"})
        │  - ctx.scheduler.runAfter(0, internal.meals.analyze.processDetectedItemsAction.default,
        │        { mealId, userId, detectedItems: meal.confirmedItems, description: meal.description })
        ▼
   same processDetectedItemsAction as above, reusing the persisted confirmedItems
```

### Recommended Project Structure
```
convex/meals/
├── analyze/
│   ├── detectMealFromPhoto.ts       # NEW public action — stage 1, photo path (replaces analyzeMealPhoto.ts's role)
│   ├── detectMealFromText.ts        # NEW public action — stage 1, text path (replaces analyzeMealDescription.ts's role)
│   ├── detectMealItems.ts           # UNCHANGED — pure AI call helper, reused by detectMealFromPhoto
│   ├── detectMealItemsFromText.ts   # UNCHANGED — pure AI call helper, reused by detectMealFromText
│   ├── processDetectedItems.ts      # MODIFIED — swap public replaceMealItems/updateMeal calls for internal variants (see Pitfall 1)
│   ├── processDetectedItemsAction.ts # NEW internalAction — scheduler entry point, wraps processDetectedItems + error handling
│   ├── analyzeMealPhoto.ts          # DELETE (superseded by detectMealFromPhoto + confirmMeal)
│   ├── analyzeMealDescription.ts    # DELETE (superseded by detectMealFromText + confirmMeal)
│   ├── analyzeMealBarcode.ts        # UNCHANGED — barcode flow stays synchronous, out of MEAL-01..05 scope
│   └── ...(searchFdcCandidates.ts, selectCandidates.ts, translateFood.ts, calculateHealthScore.ts — all UNCHANGED)
├── confirmMeal.ts                   # NEW mutation — stage 2 entry point (creates meal row, schedules background work)
├── retryProcessDetectedItems.ts     # NEW mutation — D-16/D-17 retry, no rate-limit charge
├── updateMealInternal.ts            # NEW internalMutation — userId-explicit variant of updateMeal, used only by scheduled code
├── replaceMealItemsInternal.ts      # NEW internalMutation — userId-explicit variant of replaceMealItems, used only by scheduled code
├── createMeal.ts                    # UNCHANGED (still used, e.g. by analyzeMealBarcode.ts) — confirmMeal.ts inserts directly instead of calling this, to persist confirmedItems/description/name in the same transaction
├── getMeal.ts                       # MODIFIED — stop filtering out status === "error" (line 14)
├── getWeekMeals.ts                  # MODIFIED — stop filtering out status === "error" (line 33)
├── updateMeal.ts                    # UNCHANGED — still used by Meal.tsx delete, fix-meal flow, barcode flow
└── replaceMealItems.ts              # UNCHANGED — still used by analyzeMealBarcode.ts

convex/tables/meals.ts                # MODIFIED — add confirmedItems, description fields (see Schema below)

app/app/(meal)/
├── confirm-meal.tsx                 # NEW route — D-01, the confirmation screen
├── meal.tsx                         # MODIFIED — remove photoUri/description branches (moved to confirm-meal.tsx); keep barcode branch; add error-state handling
├── fix-meal.tsx                     # UNCHANGED — precedent screen, referenced for structure only
└── mealNutrients.tsx                # UNCHANGED

components/meal/
├── Meal.tsx                         # MODIFIED — add error-state branch (Retry button) alongside existing loading/done states
├── MealItems.tsx                    # UNCHANGED (or reused read-only in done state); NEW sibling component for the editable variant on confirm-meal.tsx
└── ...
```

### Pattern 1: Mutation-triggers-background-action (the core unlock for MEAL-03)

**What:** A public `mutation` that writes the `meals` row synchronously, then calls `ctx.scheduler.runAfter(0, internal.<module>.<fn>, args)` to hand off the slow work to a scheduled `internalAction`. The mutation returns to the client the instant its transaction commits — it does not wait for the scheduled function to even start.

**When to use:** Any time a client action needs to "kick off" server work that must not block the UI, in a codebase where the only client-callable async wrapper (`useAction`) always awaits full completion.

**Example:**
```typescript
// Source: https://docs.convex.dev/scheduling/scheduled-functions (official docs, verified 2026-08-24)
// convex/meals/confirmMeal.ts
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

const confirmMeal = mutation({
  args: {
    photoStorageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    mealName: v.string(),
    items: v.array(v.object({ name: v.string(), grams: v.number() })),
  },
  handler: async (ctx, { photoStorageId, description, mealName, items }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const cleanItems = items
      .filter((i) => i.name.trim().length > 0)          // D-12
      .map((i) => ({
        name: i.name.trim(),
        grams: Math.max(1, Math.min(1500, Math.round(i.grams))),
      }))
      .slice(0, 30);                                      // defensive cap, see Security Domain
    if (cleanItems.length === 0) throw new Error("No items to confirm");

    const mealId = await ctx.db.insert("meals", {
      userId,
      status: "processing",
      name: mealName,
      photoStorageId,
      description,
      confirmedItems: cleanItems,
    });

    // Runs after this mutation commits; client does NOT wait for it.
    await ctx.scheduler.runAfter(
      0,
      internal.meals.analyze.processDetectedItemsAction.default,
      { mealId, userId, detectedItems: cleanItems, description }
    );

    return mealId;
  },
});

export default confirmMeal;
```

### Pattern 2: Internal-mutation-with-explicit-userId (required because scheduled functions lose auth)

**What:** Since `ctx.scheduler.runAfter` does not propagate the caller's identity, any DB write the scheduled `internalAction` needs to make through a mutation must either (a) call `ctx.db.patch`/`ctx.db.insert` directly if the action is trusted to already know the right meal, or (b) go through an `internalMutation` that takes `userId` as an explicit argument and checks `meal.userId === userId` itself — mirroring what the public mutation used to do with `getAuthUserId(ctx)`.

**When to use:** Any write inside a scheduled `internalAction` that previously ran inside an authenticated client-invoked `action` and relied on `getAuthUserId(ctx)` downstream.

**Example:**
```typescript
// Source: https://docs.convex.dev/scheduling/scheduled-functions
//   ("Auth is not propagated from the scheduling to the scheduled function" — verified via WebSearch 2026-08-24)
// convex/meals/updateMealInternal.ts
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { mealsFields } from "../tables/meals";
import { partial } from "convex-helpers/validators";

const { userId: _userId, totalMacros: _tm, totalNutrients: _tn, ...updatableFields } = mealsFields;

const updateMealInternal = internalMutation({
  args: {
    id: v.id("meals"),
    userId: v.id("users"),
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

### Pattern 3: usePreventRemove for the "точно уйти?" dialog (D-06)

**What:** React Navigation's `usePreventRemove(shouldPrevent, callback)` intercepts back-navigation (hardware back, header back button, and swipe-back gesture) and lets you show a confirmation `Alert` before letting the removal proceed.

**When to use:** confirm-meal.tsx, gated on "has the user not yet confirmed."

**Existing precedent in this repo:** `app/app/(settings)/generateMacroTargets.tsx:24,237` and `components/onboarding/Onboarding.tsx:36,362` already import and call `usePreventRemove`, but only to intercept the **Android hardware back button** for in-wizard step-back (they call a custom `handleBack()`, not an `Alert`). **Neither existing usage shows an actual confirmation dialog** — that part of the pattern is new to this codebase and should follow React Navigation's own documented "Discard changes?" example.

**Example:**
```typescript
// Source: https://reactnavigation.org/docs/use-prevent-remove/ (official docs, verified 2026-08-24)
import { usePreventRemove } from "@react-navigation/native";
import { Alert } from "react-native";
import { useNavigation } from "expo-router";

const navigation = useNavigation();
const [confirmed, setConfirmed] = useState(false);

usePreventRemove(!confirmed, ({ data }) => {
  Alert.alert(
    "Уйти без подтверждения?",
    "Список ингредиентов не будет сохранён.",
    [
      { text: "Остаться", style: "cancel" },
      {
        text: "Уйти",
        style: "destructive",
        onPress: () => navigation.dispatch(data.action),
      },
    ]
  );
});
```

### Anti-Patterns to Avoid
- **Calling `processDetectedItems` synchronously from a public `action` invoked by `useAction` and just "not awaiting" on the client:** Convex's `useAction` hook always returns a promise that resolves only when the server-side action function returns. There is no partial/streaming resolution — the client WILL block until the entire action (including the slow part) finishes. This defeats MEAL-03 entirely; use the scheduler pattern instead.
- **Reusing the public `updateMeal`/`replaceMealItems` mutations unmodified inside the scheduled `internalAction`:** They call `getAuthUserId(ctx)`, which returns `null` in a scheduled context (see Pitfall 1) — every write will throw `Unauthorized`, and the meal will appear permanently stuck in `"processing"` (or fail to even be marked `"error"`, since the failure-handling `updateMeal` call would itself throw).
- **Trusting `meal.status !== "done"` alone as the "still loading" signal in `meal.tsx`:** currently `isLoading = !mealId || !data || !isDone` never becomes `false` for an errored meal, because `getMeal` returns `null` for `status === "error"` and the component redirects away first (`meal.tsx:167-169`). Any error-state UI work must fix `getMeal.ts` first, or it will never render.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Return to client now, keep working on the server" | Custom polling loop, custom fire-and-forget wrapper around `useAction`, or a second unawaited action call from the client | `ctx.scheduler.runAfter(0, internal.fn, args)` inside a `mutation` | This is Convex's documented, transactional, at-least-once (well, exactly-once-attempt) mechanism; scheduling is atomic with the mutation's DB writes |
| Auth-safe access from background code | Passing raw `ctx` around and hoping auth "just works," or disabling all auth checks in the internal path | Explicit `userId` argument + ownership check in `internalMutation` (Pattern 2) | Matches Convex's own documented workaround for the auth-non-propagation limitation; keeps IDOR protection even in trusted-internal code |
| "Confirm before leaving unsaved form" | Custom `beforeunload`-style listener, manual `router.push` interception | `usePreventRemove` from `@react-navigation/native` (already a transitive dep via expo-router) | Handles hardware back, header back, AND swipe-back gesture uniformly; already partially used in this codebase |
| Swipe-to-delete row gesture | New gesture library | `react-native-gesture-handler`'s `Gesture.Pan()`, same primitive already used in `components/ui/Toast.tsx:106-116` | Already a dependency, already has a working in-repo example to copy from |

**Key insight:** every piece of this phase has a direct in-repo or official-docs precedent. The only genuinely new concept for this codebase is the scheduler-based fire-and-forget mutation pattern (Pattern 1) and its auth corollary (Pattern 2) — everything else is composition of existing primitives.

## Common Pitfalls

### Pitfall 1: Scheduled functions lose the caller's auth identity — will silently break `processDetectedItems`
**What goes wrong:** `processDetectedItems.ts:82,87` calls `ctx.runMutation(api.meals.replaceMealItems.default, ...)` and `ctx.runMutation(api.meals.updateMeal.default, ...)`. Both target mutations call `getAuthUserId(ctx)` and `throw new Error("Unauthorized")` if it's `null`. Today this works because `processDetectedItems` runs inline inside a client-invoked `action`, where auth flows through normally. Once `processDetectedItems` is invoked via `ctx.scheduler.runAfter(...)` (required for MEAL-03), the scheduled `internalAction` has **no** auth context — `getAuthUserId(ctx)` returns `null` inside it and any nested call to those two public mutations throws.
**Why it happens:** Confirmed via official Convex docs: "Auth is not propagated from the scheduling to the scheduled function." This is a documented, intentional limitation, not a bug.
**How to avoid:** Add `internalMutation` variants (`updateMealInternal`, `replaceMealItemsInternal`) that take an explicit `userId` argument and check `meal.userId === userId` themselves (Pattern 2). Route `processDetectedItems`'s internal `ctx.runMutation` calls through these when invoked from the scheduled path. Leave the public `updateMeal`/`replaceMealItems` untouched since `analyzeMealBarcode.ts` and `Meal.tsx`'s delete/fix-meal flows still call them directly from authenticated client contexts.
**Warning signs:** Meals stuck forever in `"processing"` status with no `"error"` transition either (because the error-handling `updateMeal` call inside the `catch` block would ALSO throw `Unauthorized`, so even the failure path silently swallows the real error). Watch Convex dashboard logs for `Unauthorized` thrown from inside a scheduled function run.

### Pitfall 2: Error-status meals are currently invisible — D-15/D-16 cannot be satisfied without fixing this first
**What goes wrong:** `getMeal.ts:14` returns `null` when `meal.status === "error"`. `meal.tsx:167-169` treats a `null` query result as "meal doesn't exist" and issues `<Redirect href="/app" />`. Separately, `getWeekMeals.ts:33-34` filters `status !== "error"` out of the week-history query entirely. Net effect: today, if a meal errors, it vanishes from both the detail screen (redirect to home) and the history list — there is no error state UI anywhere in the app (`Meal.tsx` has a `loading` prop and a `done` rendering path, nothing else; `isLoading = !mealId || !data || !isDone` never resolves for an errored/`null` meal).
**Why it happens:** These filters were written when the only way to reach `"error"` was a fully-failed single-shot analysis, and the intended UX was "just don't show it, let the user retry the whole flow from scratch." There was no retry-in-place concept.
**How to avoid:** This phase must explicitly change `getMeal.ts` (stop returning `null` for `"error"`) and `getWeekMeals.ts` (stop excluding `"error"` from the collected set) as prerequisite work for D-16, and add a real error-state branch to `Meal.tsx` (currently only `loading`/`done` states exist) with the "Повторить" button. This is materially more surface area than D-15's phrasing ("аналогично тому, как сейчас обрабатывается ошибка") implies — flag this explicitly to the user/planner since CONTEXT.md's working assumption about existing behavior does not match the code.
**Warning signs:** If the planner scopes D-16 as "just add a button," it will discover mid-execution that there is no error state to attach the button to, and that the meal never even reaches the screen where the button would live.

### Pitfall 3: Retry needs `description` and `mealName` persisted, not just `detectedItems`
**What goes wrong:** `processDetectedItems`'s `description` parameter (`processDetectedItems.ts:18,27,38`) is passed straight into `selectCandidates` (`selectCandidates.ts:81,99-104`) where it materially affects the AI candidate-selection prompt for text-description meals. `mealName` is only ever persisted to the `meals` doc at the very end of `processDetectedItems` (`processDetectedItems.ts:87-90`, `updateMeal({status: "done", name: mealName})`) — if the function fails before reaching that line (the common case for an `"error"` meal), `meal.name` is never set. A retry that only has `confirmedItems` cannot reconstruct these.
**Why it happens:** In the old single-shot design, `mealName`/`description` were always available as in-memory closures over the one synchronous call — nothing needed persisting because nothing could ever be retried independently.
**How to avoid:** Persist `description` as a new optional field on `meals`, and set `meal.name = mealName` at meal-row creation time (inside `confirmMeal`), not only at the end of `processDetectedItems`. `photoStorageId` is already persisted, so `imageUrl` can always be re-derived via `ctx.storage.getUrl(photoStorageId)` inside the scheduled action / on retry.
**Warning signs:** Retried text-description meals silently degrade to image-only-quality candidate selection (or worse, `selectCandidates` gets neither `imageUrl` nor `description` and falls through to a weaker prompt path); retried meals show a blank/undefined name in history until the retry itself succeeds.

### Pitfall 4: `meal.tsx`'s current "start analysis" logic must be surgically split, not just extended
**What goes wrong:** Today, `meal.tsx` does double duty: it is both the entry point that *triggers* analysis (photo crop/upload + `useAction(analyzeMealPhoto/analyzeMealDescription/analyzeMealBarcode)`, `meal.tsx:36-165`) and the screen that *displays* the result. Camera and describe screens navigate straight to it with `photoUri`/`description` params (`camera.tsx:77-81,110-113`, `describe.tsx:41-44`). If the new `confirm-meal.tsx` is added as an extra step but `meal.tsx`'s trigger logic is left untouched, both screens will independently try to run analysis for the photo/description paths.
**Why it happens:** The photo-upload logic (crop, `generateUploadUrl`, blob upload, storageId extraction — `meal.tsx:57-91`) is currently entangled with the "kick off AI analysis" call.
**How to avoid:** Move the upload-and-detect logic (the `photoUri`/`description` branches of `startMealAnalysis`, `meal.tsx:125-165`) into the new `confirm-meal.tsx`. Leave `meal.tsx`'s `barcode` branch untouched (barcode flow is out of MEAL-01..05 scope and still uses the old synchronous single-action pattern). After confirmation, navigate to `meal.tsx` with `mealId` already set (the `initialMealId` param path, `meal.tsx:25,47` — this path already exists and skips `startMealAnalysis` entirely per its guard clause at `meal.tsx:126-132`), so `meal.tsx` only ever needs to `useQuery(getMeal, {mealId})` and render — exactly the barcode flow's existing pattern today, just now shared by all three entry paths.
**Warning signs:** Duplicate/never-resolving analysis calls; `mealId` param and photo/description params both present, causing ambiguous first-render behavior.

### Pitfall 5: Rate limit is charged at "detect," but `processDetectedItems` itself makes uncounted AI calls
**What goes wrong:** `rateLimiter.limit(ctx, "aiFeatures", ...)` is only called once, at the very top of the current `analyzeMealPhoto`/`analyzeMealDescription` actions (`analyzeMealPhoto.ts:24`, `analyzeMealDescription.ts:28`), before `detectMealItems` runs. But `processDetectedItems` itself makes further AI calls for any *new* food not yet in the catalog: `selectCandidates` (candidate selection, always), `translateFood` (only if `!fdcFood.name.ru`), `calculateHealthScore` (only if `fdcFood.healthScore === undefined`) — none of these consume the 50/day `aiFeatures` limit today, and this phase does not change that (per CONTEXT.md's "Claude's Discretion" note, the charge point stays at stage 1). This is **pre-existing behavior**, not introduced by this phase, but the new Retry button (D-16) is a **new, cheap, user-triggered way to re-invoke all of these uncounted AI calls repeatedly** on the same meal, whereas previously the only way to re-trigger them was a full fresh analysis (which DID cost a rate-limit unit). Flag this as a cost/abuse consideration for the Security Domain section below — recommend the planner/user decide whether retry needs its own (lighter) rate limit.
**Why it happens:** The original design assumed "process" always followed "detect" 1:1, so uncounted-but-bounded AI usage inside `processDetectedItems` was an acceptable, self-limiting cost. Retry breaks the 1:1 assumption.
**How to avoid:** At minimum, add a light separate rate limit (e.g., N retries per meal per hour, or a small per-user "retries/day" bucket via `@convex-dev/rate-limiter`, same package already in use) OR cap retry attempts per meal (e.g., store a `retryCount` and hard-stop after 3). This is flagged as `[ASSUMED]` risk requiring user confirmation — CONTEXT.md's D-17 explicitly says no rate-limit charge for retry, but did not consider the uncounted-AI-calls-inside-processDetectedItems angle.
**Warning signs:** A user mashing "Повторить" on a persistently-failing meal (e.g., FDC search returning zero candidates every time) runs `selectCandidates`'s AI call unboundedly with zero cost/frequency ceiling.

## Code Examples

### Toast on completion (D-13, verified against actual `Toast.tsx` API)
```typescript
// Source: components/ui/Toast.tsx:54-58 (exact API, read from repo)
import { Toast } from "@/components/ui/Toast";

// Toast.show accepts { text: string; variant?: "default" | "success" | "error" }
// and auto-dismisses after 3000ms (components/ui/Toast.tsx:70). No return value, no ID needed by caller.
useEffect(() => {
  if (meal?.status === "done" && !hasNotifiedRef.current) {
    hasNotifiedRef.current = true;
    Toast.show({ text: "Блюдо распознано и записано", variant: "success" });
  }
}, [meal?.status]);
```

### Swipe-to-delete row (D-04), modeled on the existing Toast dismiss gesture
```typescript
// Source: components/ui/Toast.tsx:105-120 (exact pattern already in this codebase, adapted)
const translateX = useSharedValue(0);
const panGesture = Gesture.Pan()
  .onUpdate((event) => {
    translateX.value = event.translationX;
  })
  .onEnd((event) => {
    if (event.translationX < -80) {
      scheduleOnRN(onRemove);              // same scheduleOnRN(...) pattern as Toast.tsx:112
    } else {
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    }
  });
```

### Stage-1 detect action (photo path) — new file, mirrors deleted `analyzeMealPhoto.ts` minus `createMeal`/`processDetectedItems`
```typescript
// convex/meals/analyze/detectMealFromPhoto.ts
import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api } from "../../_generated/api";
import detectMealItems from "./detectMealItems";
import { getAuthUserId } from "@convex-dev/auth/server";
import { rateLimiter } from "../../rateLimit";
import { subscriptionConfig } from "@/config/subscriptionConfig";

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

    // Note: NO createMeal call here — D-05
    return await detectMealItems({ imageUrl });   // { mealName, items }
  },
});

export default detectMealFromPhoto;
```

## State of the Art

Not applicable in the "industry evolved" sense — this is an internal architectural change to an already-current stack (Convex ^1.27.3, expo-router ~6.0.14). The one relevant "old vs. new" is internal to this codebase's own history:

| Old Approach (this repo, today) | New Approach (this phase) | When Changed | Impact |
|--------------------------------|---------------------------|---------------|--------|
| Single synchronous `action` does detect + process + persist, client blocks until `done` | `action` (detect) → client edits locally → `mutation` (confirm, persist, schedule) → scheduled `internalAction` (process) | This phase | Client unblocks immediately after confirm; requires the auth-propagation workaround (Pitfall 1) |
| Errored meals are hidden (`getMeal`/`getWeekMeals` filter them out) | Errored meals shown with explicit Retry action | This phase | Requires touching two existing queries that currently assume "error = don't show" |

**Deprecated/outdated:** `analyzeMealPhoto.ts` and `analyzeMealDescription.ts` should be deleted once `detectMealFromPhoto`/`detectMealFromText` + `confirmMeal` replace them — keeping both old and new entry points alive would let a client bypass the confirmation step entirely (any old cached client bundle could still call the deleted... actually they'd 404 once removed from `_generated/api`, which is the correct outcome; do not leave them as dead code importing `processDetectedItems` with the old public-mutation calls, since that would reintroduce Pitfall 1 for anyone who accidentally re-wires them).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A light separate rate limit (or retry-count cap) should be added for the Retry button to prevent unbounded uncounted-AI-call abuse | Pitfall 5 | If skipped, a user can cheaply re-trigger `selectCandidates`/`translateFood`/`calculateHealthScore` AI calls indefinitely on a stuck meal at zero rate-limit cost — a cost/abuse vector, not a correctness bug. This is the researcher's recommendation, not a locked CONTEXT.md decision — needs explicit user confirmation before the planner treats it as required scope vs. nice-to-have |
| A2 | `confirmedItems` array should be capped (recommended 30 items) and grams clamped 1-1500 server-side in `confirmMeal` | Code Examples / Security Domain | If skipped, a malicious or buggy client could submit an oversized item list, inflating `searchFdcCandidates`' embedding-call fan-out cost and `processDetectedItems`' per-item `Promise.all` fan-out |
| A3 | New `meals.status` value is NOT needed for the "list shown, awaiting confirmation" state — confirmed by tracing the code: since `createMeal`/`ctx.db.insert` never fires until `confirmMeal`, there is no in-between DB row for that state at all; it's purely client-local (React state on `confirm-meal.tsx`) | Architecture Patterns, Schema | Low — this directly follows from D-05 as written and was independently re-derived from the code, not just copied from CONTEXT.md's working theory. Flagged only because CONTEXT.md itself marked this as "confirm on research" |

**Note:** Unlike most phases, this Assumptions Log is short because nearly every claim in this document was verified either by reading the actual source file (cited file:line) or by cross-checking official Convex/React Navigation documentation via WebSearch — see Sources below.

## Open Questions (RESOLVED)

1. **Should retry have its own rate limit or attempt cap?**
   - What we know: D-17 explicitly says retry must NOT consume the 50/day `aiFeatures` limit. `processDetectedItems` makes its own uncounted AI calls today (pre-existing, self-limiting under the old 1:1 detect→process flow).
   - What's unclear: Whether the user considers the new uncounted-retry-abuse surface (Pitfall 5) in scope for this phase, or an acceptable known risk deferred like D-09 (orphaned storage files).
   - Recommendation: Surface this explicitly during planning/discuss — propose a small additional rate limiter bucket (e.g., `mealRetry: { kind: "fixed window", rate: 10, period: HOUR }` keyed by `mealId` or `userId`, same `@convex-dev/rate-limiter` package, zero new dependencies) as a cheap mitigation if the user wants it in scope.
   - **RESOLVED (CONTEXT.md D-18):** In scope. A dedicated `mealRetry` fixed-window bucket (10/hour, keyed by `mealId`) was adopted and implemented in plan 07-01 (`convex/rateLimit.ts`), consumed by `retryProcessDetectedItems.ts` (plan 07-03).

2. **Exact schema shape for `confirmedItems`** — the field name/shape below is a recommendation, not yet locked:
   ```typescript
   // convex/tables/meals.ts — additions to mealsFields
   confirmedItems: v.optional(v.array(v.object({ name: v.string(), grams: v.number() }))),
   description: v.optional(v.string()),
   ```
   This is deliberately the same shape as `DetectedItem` (`detectMealItems.ts:19`, `{name: string, grams: number}`) so `processDetectedItems`'s existing `detectedItems: DetectedItem[]` parameter type needs no change.
   - **RESOLVED:** The `{name, grams}` shape above was adopted verbatim — implemented in plan 07-01 (`convex/tables/meals.ts` — `confirmedItems`/`description` fields) and consumed as-is by `confirmMeal.ts`/`retryProcessDetectedItems.ts` (plan 07-03).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V4 Access Control | yes | Ownership checks (`meal.userId === userId`) must be preserved in the NEW `internal` mutations (`updateMealInternal`, `replaceMealItemsInternal`) exactly as they exist in the public originals — see Pattern 2. Retry mutation must independently verify `meal.userId === userId` AND `meal.status === "error"` (prevents retrying another user's meal, or retrying a `done`/`processing` meal to force redundant AI spend) |
| V5 Input Validation | yes | `confirmMeal` must server-side validate/clamp the client-editable `items` array: non-empty after blank-name filtering (D-12), `grams` clamped to the existing `[1, 1500]` bound already enforced elsewhere (`detectMealItems.ts:13`, `selectCandidates.ts:10`), and a defensive max array length (recommended 30 — see Assumption A2) since this array is now fully client-controlled where before it was AI-generated and schema-bounded by `detectionSchema` (`detectMealItems.ts:6-16`) |
| V6 Cryptography | no | No new secrets/crypto surface introduced |
| V2 Authentication | no | No change to auth flow; all new mutations/actions use the existing `getAuthUserId(ctx)` pattern uniformly |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| IDOR via scheduled function losing auth (calling processDetectedItems for a mealId the "userId" arg doesn't actually own) | Tampering / Elevation of Privilege | `internalMutation` ownership check against the explicit `userId` param (Pattern 2) — never trust the scheduled action's `mealId`/`userId` args without re-verifying `meal.userId === userId` inside the internal mutation itself, since the internal action's own args could theoretically be crafted if the confirm/retry mutations ever had a bug |
| Unbounded client-controlled array driving AI/embedding fan-out cost | Denial of Service (cost) | Server-side array length cap + per-item grams clamp in `confirmMeal` (Assumption A2) |
| Retry as a rate-limit bypass for otherwise-limited AI calls | Denial of Service (cost) / Repudiation of the 50/day contract | See Open Question 1 — recommend a small dedicated rate limit or attempt cap on retry |

## Sources

### Primary (HIGH confidence)
- `convex/meals/analyze/analyzeMealPhoto.ts`, `analyzeMealDescription.ts`, `detectMealItems.ts`, `detectMealItemsFromText.ts`, `processDetectedItems.ts`, `analyzeMealBarcode.ts`, `analyzeMealConfig.ts`, `searchFdcCandidates.ts`, `selectCandidates.ts` — read in full, current repo state
- `convex/meals/createMeal.ts`, `updateMeal.ts`, `replaceMealItems.ts`, `getMeal.ts`, `getWeekMeals.ts` — read in full, current repo state
- `convex/tables/meals.ts`, `convex/tables/mealItems.ts`, `convex/rateLimit.ts` — read in full, current repo state
- `app/app/(meal)/meal.tsx`, `fix-meal.tsx`, `app/app/(add)/camera.tsx`, `describe.tsx` — read in full, current repo state
- `components/meal/Meal.tsx`, `MealItems.tsx`, `components/ui/Toast.tsx`, `WithSkeleton.tsx` — read in full, current repo state
- `app/app/(settings)/generateMacroTargets.tsx`, `components/onboarding/Onboarding.tsx` — grepped for `usePreventRemove` precedent
- https://docs.convex.dev/scheduling/scheduled-functions — official Convex docs, `runAfter`/`runAt` API and auth non-propagation, fetched 2026-08-24
- https://reactnavigation.org/docs/use-prevent-remove/ — official React Navigation docs, confirmed via WebSearch 2026-08-24

### Secondary (MEDIUM confidence)
- WebSearch results cross-referencing `ctx.scheduler.runAfter` auth propagation (multiple hits converging on the same official-docs statement)

### Tertiary (LOW confidence)
- None used — every claim above traces to a repo file read or an official-docs fetch/search.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing deps confirmed via `package.json` + grep for real usage
- Architecture: HIGH — scheduler/auth-propagation behavior confirmed against official Convex docs; every proposed file change is grounded in a specific current file:line
- Pitfalls: HIGH — all five pitfalls were discovered by tracing actual code paths (not inferred), especially Pitfall 1 (auth) and Pitfall 2 (error-state invisibility), which directly contradict an implicit assumption in CONTEXT.md

**Research date:** 2026-08-24
**Valid until:** 30 days (stable internal stack, no fast-moving external dependency)

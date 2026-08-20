# Phase 4: Сквозной сценарий тестера - Research

**Researched:** 2026-08-20
**Domain:** Bug-fix hardening (Convex query degradation, async error handling in React Native, DST-safe date bucketing) + EAS/TestFlight/Sentry release verification
**Confidence:** HIGH (all three bugs read directly from source; build/Sentry pipeline read directly from Phase 1 artifacts)

## Summary

This phase is not exploratory — it is three surgical bug fixes plus a release-verification walkthrough that has already been fully specified by a prior phase's deferred plan (Phase 1's `01-04-PLAN.md` Task 2/3, now merged per CONTEXT.md D-03). All three bugs were read directly from source during this research and their blast radius is **larger than the three files named in ROADMAP's success criteria** — this is the most important finding of this research pass and must shape the plan's task boundaries.

Specifically: the `food`-missing crash pattern in `convex/meals/getMeal.ts:26-31` is duplicated verbatim in `convex/mealItems/getMealItem.ts:20-21`, and the shape it returns (`mealItems: { ...mealItem, food }[]`) is read downstream in **five** places, not one — including inside the `correctMeal` Convex **action** itself (`convex/meals/analyze/correctMeal.ts:44`), which calls `getMeal` internally and would crash mid-AI-correction if a meal item's food is already missing. Fixing only `getMeal.ts` per the literal success-criteria line reference leaves four of these five call sites still capable of crashing — including the exact placeholder row the fix is meant to protect, since clicking it navigates to a screen backed by the unfixed `getMealItem.ts`.

Similarly, the DST bug in `getWeekMeals.ts:17-42` is not unique to meals — the identical single-offset-for-the-whole-week algorithm is copy-pasted in three sibling files (`convex/glucose/getWeekReadings.ts`, `convex/bloodPressure/getWeekReadings.ts`, `convex/movement/getWeekMovement.ts`), all called from the same home screen (`app/app/(tabs)/index.tsx`) with the same single client-computed `new Date().getTimezoneOffset()`. ROADMAP's FLOW-03 success criterion only names `getWeekMeals.ts`, but a real DST-transition week on that same screen would still show the sibling widgets (glucose/BP/steps) shifted by an hour even after the meals fix ships — worth flagging to the planner as a scope decision, not silently assumed.

The TestFlight/Sentry piece (FLOW-04 merged with backlog Phase 999.1) requires no new research — Phase 1 already produced a fully worked, human-verified-up-to-Task-1 plan (`01-04-PLAN.md`) with exact commands, org/project slugs, and acceptance criteria. This phase should reuse that plan's Task 2/3 near-verbatim rather than re-deriving the EAS/sentry-cli sequence.

**Primary recommendation:** Fix the `food`-missing degradation at its true blast radius (5 call sites, 2 Convex functions), fix `handleCorrect` exactly per the `phone-sign-in.tsx` `tryCatch` + `Toast` + `isSending`-boolean precedent (no spinner component exists in this codebase — extend the button's existing text-swap pattern instead of introducing `ActivityIndicator` for the first time), decide once (and document the decision) whether the DST fix stays meals-only or extends to the three sibling files, and reuse Phase 1's `01-04-PLAN.md` Task 2/3 verbatim for the merged TestFlight build-and-verify step.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `food`-missing degradation (D-01) | API/Backend (Convex query) | Frontend Server/Client (React Native screens rendering the result) | The query must stop throwing; but 4 of 5 read sites are in the client/action layer and must be made null-safe too, or the fix is cosmetic |
| Fix-meal error surfacing (D-02) | Browser/Client (Expo Router screen) | API/Backend (existing `correctMeal` action, unchanged) | Pure client-side control-flow bug (`await` missing); no backend change needed |
| DST week bucketing (FLOW-03) | API/Backend (Convex query, pure date arithmetic) | Browser/Client (offset/timezone input the client supplies) | Bucketing logic and correctness live entirely in the Convex query; the client only supplies the timezone signal that's currently insufficient |
| TestFlight build + sourcemaps verification (FLOW-04 / Phase 999.1) | CDN/Static distribution (EAS Build/Submit) | Observability (Sentry release artifacts) | Build pipeline produces the binary; Sentry validates the artifact after the fact — this phase does not touch application code for this part |

## User Constraints (from CONTEXT.md)

<user_constraints>
### Locked Decisions

**D-01 — Деградация блюда без связанного `food`:** `convex/meals/getMeal.ts:24-31` — когда `ctx.db.get(mealItem.foodId)` не находит документ, `mealItem` остаётся в списке, но с плейсхолдером «Продукт недоступен» вместо падения `Promise.all` с `throw new Error("Food not found")`. Вся сумма калорий/БЖУ блюда по-прежнему считается по `meal.totalNutrients` (уже посчитанным при анализе), плейсхолдер — только для конкретной строки состава, не влияет на итоговую сводку.

**D-02 — Экран «Исправить блюдо»:** `handleCorrect` — `correctMeal(...)` вызывается через `await` вместо голого вызова без ожидания. Кнопка «Исправить» показывает спиннер/индикацию загрузки, пока идёт запрос; ошибка показывается через `Toast.show({ variant: "error" })` — по прецеденту `phone-sign-in.tsx`/`confirm-phone.tsx`/`settings.tsx`, а не через `alert()`. При ошибке пользователь остаётся на экране (не `router.dismiss()`), может попробовать снова.

**D-03 — Сквозная TestFlight-проверка и связь с Phase 999.1:** FLOW-04 объединяется с backlog Phase 999.1 (EAS production build + sourcemaps через `sentry-cli` + сквозная проверка в Sentry) — один билд-цикл закрывает и FLOW-04, и OBS-01/OBS-03. Баги FLOW-01…03 чинятся и проверяются локально/в dev-сборке в рамках этой фазы; FLOW-04 физически зависит от билд-цикла Phase 999.1.

**DST (no decision number, but locked as in-scope):** `convex/meals/getWeekMeals.ts` — единый `timezoneOffsetMinutes`, посчитанный один раз на клиенте, применяется ко всей неделе. Конкретный способ починки — на усмотрение планировщика/исполнителя.

### Claude's Discretion
- Конкретный алгоритм пересчёта `timezoneOffsetMinutes` по дням недели в `getWeekMeals.ts` для корректного DST-перехода.
- Точный визуальный вид плейсхолдера «Продукт недоступен» (иконка, цвет, текст) — в рамках существующей дизайн-системы компонентов блюда.
- Тип индикатора загрузки на кнопке «Исправить» (спиннер внутри кнопки vs. смена текста) — по существующим паттернам `ScreenFooterButton`/`Button` в проекте.

### Deferred Ideas (OUT OF SCOPE)
- Отдельная EAS-сборка специально для Phase 4 (без объединения с Phase 999.1) — рассмотрена и отклонена пользователем в пользу одного билд-цикла (D-03).
</user_constraints>

## Phase Requirements

<phase_requirements>
| ID | Description | Research Support |
|----|-------------|------------------|
| FLOW-01 | Открытие блюда не падает, если продукт отсутствует в базе — блюдо отображается с деградацией | Blast-radius map below (5 call sites, 2 Convex functions) — see Architecture Patterns and Common Pitfalls |
| FLOW-02 | Ошибка при исправлении блюда через AI показывается пользователю, а не теряется молча | Exact reference pattern found in `app/auth/phone-sign-in.tsx` (`tryCatch` + `isSending` + `Toast.show`) — see Code Examples |
| FLOW-03 | Экран недельной истории показывает блюда в правильных днях, включая DST-переход | Bug confirmed at `getWeekMeals.ts:17-42`; identical bug found duplicated in 3 sibling files — see Common Pitfalls; DST-testability note re: Russia not observing DST since 2014 |
| FLOW-04 | Тестер проходит путь на TestFlight-сборке без блокирующих ошибок | Fully specified by reusing `01-04-PLAN.md` Task 2/3 verbatim (org/project slugs, exact commands, acceptance criteria) — see Code Examples / EAS section |
</phase_requirements>

## Standard Stack

No new external packages are required for this phase. Every fix reuses libraries and patterns already present in the codebase.

### Core (existing, reused — not newly installed)
| Library | Version (from `package.json`) | Purpose | Why reuse, not new |
|---------|------|---------|---------------------|
| `convex` | `^1.27.3` [VERIFIED: package.json] | Backend query/action runtime for D-01, DST fix | Already the data layer; no alternative needed |
| `date-fns` | `^4.1.0` [VERIFIED: package.json] | Already a dependency; NOT currently used in any `getWeek*` file (all use raw `Date`/ms arithmetic) | Could optionally be used for the DST fix's day-boundary arithmetic instead of hand-rolled ms math, but the existing 4 files are already committed to raw arithmetic — switching only `getWeekMeals.ts` to `date-fns` while siblings stay raw would fragment the pattern (see Common Pitfalls) |
| `@sentry/react-native` | `~7.2.0` [VERIFIED: package.json] | Already configured (Phase 1); FLOW-04 only *verifies* it on a real TestFlight binary, does not add code | No new integration work |
| `expo-localization` | `~17.0.8` [VERIFIED: package.json] | Already imported elsewhere (`meal.tsx` uses `getLocales()`); exposes `getCalendars()` which returns IANA `timeZone` identifiers | Available if the DST fix needs a timezone identifier rather than a raw offset (see DST section) — not currently imported for this purpose anywhere in the codebase |

**No installation needed.** `npm install` is not part of this phase's task list.

## Package Legitimacy Audit

Not applicable — this phase introduces zero new external packages. All fixes use libraries already present in `package.json` and patterns already established in the codebase (`Toast`, `tryCatch`, `ScreenFooterButton`, `logError`).

## Architecture Patterns

### FLOW-01: `food`-missing degradation — actual blast radius

The ROADMAP success criterion names one line range (`getMeal.ts:26-31`), but grep for `.food.` and for the query itself surfaces the true dependency graph:

```
convex/meals/getMeal.ts (getMeal query)
  ├─ throws "Food not found" inside Promise.all  [SUCCESS CRITERION #1 — the named fix]
  │
  ├─ read by: app/app/(meal)/meal.tsx:183
  │     item.food.name.ru ?? item.food.name.en   ← used to build the flattened `items`
  │     array passed to <Meal mealItems={items}/>. Runs BEFORE the placeholder-aware
  │     UI can render anything — a null/undefined `.food` here crashes the whole
  │     screen's render, defeating the purpose of the query-level fix.
  │
  ├─ read by: convex/meals/analyze/correctMeal.ts:29,44  (SERVER-SIDE, inside an action)
  │     const result = await ctx.runQuery(api.meals.getMeal.default, { mealId });
  │     ...
  │     previousItems = mealItems.map(item => ({ name: item.food.name.en, ... }))
  │     ← correctMeal calls getMeal internally to build the AI correction prompt.
  │     If getMeal now allows food:null, this line crashes the ACTION (not a query),
  │     which the user experiences as "Исправить" always failing for any meal that
  │     already has one degraded item — directly undermines D-02's "user can retry".
  │
  └─ NOT read by: app/app/(meal)/mealNutrients.tsx (only reads meal.totalNutrients,
        no .food access — unaffected, confirms D-01's claim that the meal-level
        summary is safe)

convex/mealItems/getMealItem.ts (SEPARATE query, SAME bug pattern, NOT named in
success criteria — found by grep, not by the phase description)
  ├─ line 20-21: const food = await ctx.db.get(mealItem.foodId);
  │              if (!food) throw new Error("Food not found");
  │   Identical throw pattern, independent code path.
  │
  ├─ reachable from: components/meal/MealItems.tsx — every ingredient row in the
  │     meal-detail screen is a <Link href="/app/(mealItem)/mealItem" params={{mealItemId}}>.
  │     This means: the exact placeholder row D-01 creates ("Продукт недоступен")
  │     is tappable, and tapping it navigates to a screen backed by getMealItem,
  │     which is UNFIXED by the letter of the success criteria and will crash.
  │
  ├─ read by: app/app/(mealItem)/mealItem.tsx:21
  │     name={mealItem?.food.name.ru ?? mealItem?.food.name.en}
  │
  └─ read by: app/app/(mealItem)/mealItemNutrients.tsx:20
        const name = mealItem?.food.name.ru ?? mealItem?.food.name.en ?? "";
```

**Implication for planning:** treating FLOW-01 as "edit lines 26-31 of one file" will pass a narrow acceptance test but not achieve the stated goal ("тестер... без блокирующих ошибок"). The plan should scope FLOW-01 as: (1) `getMeal.ts` returns a null-safe `food` per mealItem, (2) `getMealItem.ts` gets the same treatment (same bug, same data model, reachable from the same UI), (3) all 4 read sites (`meal.tsx`, `correctMeal.ts`, `mealItem.tsx`, `mealItemNutrients.tsx`) get a null-guard/fallback string, consistent with the visual placeholder chosen for the meal-detail row.

**Placeholder data shape recommendation:** keep `food: Doc<"foods"> | null` (a nullable union) rather than synthesizing a fake `Doc<"foods">` object. The `foods` table schema (`convex/tables/foods.ts`) has ~150 required nutrient fields — faking a complete fake document is far more error-prone than adding `?? "Продукт недоступен"` / `item.food ? ... : ...` at the ~5 read sites. A mealItem's own macros (`macrosPer100g`, `nutrientsPer100g`) already live on the `mealItems` table independent of `food` (see `convex/tables/mealItems.ts`), so calorie/gram display for a degraded row does not depend on `food` at all — only the name string does.

### FLOW-02: exact reference pattern already in the codebase

`app/auth/phone-sign-in.tsx` (already committed, working code) is the closest precedent and should be followed almost verbatim:

```typescript
// Source: app/auth/phone-sign-in.tsx (existing codebase pattern)
const [isSending, setIsSending] = useState(false);

const handleSubmit = async (provider: PhoneOtpProvider) => {
  if (isSending) return;
  setIsSending(true);
  const { error } = await tryCatch(signIn(provider, { phone }));
  setIsSending(false);

  if (error) {
    Toast.show({ text: sendCodeErrorText, variant: "error" });
    return;
  }
  router.push({ pathname: "/auth/confirm-phone", params: { phone, provider } });
};
// ...
<ScreenFooterButton disabled={isSending} onPress={() => void handleSubmit("whatsapp-otp")}>
  WhatsApp
</ScreenFooterButton>
```

Applied to `fix-meal.tsx`, this becomes (illustrative, not prescriptive on exact wording):

```typescript
// convex/meals/analyze/correctMeal.ts is an `action`, useAction already used
const [isCorrecting, setIsCorrecting] = useState(false);

const handleCorrect = async () => {
  if (!mealId || !correction.trim() || isCorrecting) return;
  if (status && !status.ok) { /* existing rate-limit toast, unchanged */ return; }

  setIsCorrecting(true);
  const { error } = await tryCatch(correctMeal({ mealId, correction }));
  setIsCorrecting(false);

  if (error) {
    Toast.show({ text: "Ошибка при исправлении блюда", variant: "error" });
    return; // stay on screen — D-02 requirement
  }
  router.dismiss(); // only dismiss on confirmed success
};
```

**No spinner component precedent exists anywhere in this codebase** — grep for `ActivityIndicator` across `app/` and `components/` returns zero results. The file being edited (`fix-meal.tsx`) already has a *text-swap* loading-state precedent one line away: `{status !== undefined && !status.ok ? "Лимит исчерпан" : "Исправить"}`. Extending that same conditional (`isCorrecting ? "Исправляем..." : ...`) is lower-risk and more consistent with the codebase than introducing `ActivityIndicator` for the first time. `Meal.tsx` also demonstrates that `ScreenFooterButton` already tolerates conditional child content (`{!hasProAccess && <ProLabel />}`), so either approach (text swap or an icon/spinner element) is mechanically supported — this is a genuine free choice per CONTEXT.md's discretion note, but "text swap" has an existing precedent and "spinner" does not.

### FLOW-03: DST bug is duplicated 4×, not 1×

```typescript
// Source: convex/meals/getWeekMeals.ts:12-27 (also verbatim in glucose/getWeekReadings.ts,
// bloodPressure/getWeekReadings.ts; movement/getWeekMovement.ts differs slightly — see below)
const now = Date.now();
const offsetMs = timezoneOffsetMinutes * 60_000;       // ← single offset for entire week
const localNowMs = now - offsetMs;
const localMidnightMs = Math.floor(localNowMs / dayMs) * dayMs;
const localDayOfWeek = new Date(localNowMs).getUTCDay();
const daysFromMonday = (localDayOfWeek + 6) % 7;
const localMondayStartMs = localMidnightMs - daysFromMonday * dayMs;
const weekStartUtc = localMondayStartMs + offsetMs;
const weekEndUtc = weekStartUtc + 7 * dayMs;
// ...later, PER ITEM:
const localMealMs = meal._creationTime - offsetMs;      // ← same fixed offset reused
const dayIndex = Math.floor((localMealMs - localMondayStartMs) / dayMs);
```

Client call site (`app/app/(tabs)/index.tsx:36`, also `nutrients.tsx:13`, and 2 more call sites in `index.tsx` for glucose/BP):
```typescript
const rawWeekMeals = useQuery(api.meals.getWeekMeals.default, {
  timezoneOffsetMinutes: new Date().getTimezoneOffset(), // computed ONCE, "now"
});
```

`JS Date.prototype.getTimezoneOffset()` correctly reflects DST *for the specific date it's called on*, but the client only ever calls it on `new Date()` (today) and reuses that single number for every day in the query's 7-day window — including days on the other side of a DST boundary within that week, which can be off by 60 minutes.

**Files sharing the identical bug (confirmed by direct read, not by name-matching):**
| File | Pattern | In FLOW-03 scope per ROADMAP text? |
|------|---------|-------------------------------------|
| `convex/meals/getWeekMeals.ts` | Exact algorithm above | Yes — explicitly named |
| `convex/glucose/getWeekReadings.ts` | Byte-identical algorithm | Not named |
| `convex/bloodPressure/getWeekReadings.ts` | Byte-identical algorithm | Not named |
| `convex/movement/getWeekMovement.ts` | Same week-boundary calc; but per-day bucketing is by a stored `date: string` field (`YYYY-MM-DD`, from `movementData` table), not by re-deriving from a raw timestamp with `offsetMs` — so the *boundary* (which week starts where) has the same DST risk, but there's no *per-item* re-bucketing bug because rows are pre-tagged with a date string at write time | Not named |

**Recommendation (Claude's discretion per CONTEXT.md):** Extract a single shared helper (e.g. `convex/lib/getLocalWeekBounds.ts`) used by all 4 query files, fixed once. This is not required by the letter of FLOW-03, but: (a) it's the same amount of code either way since 3 of 4 files need edits eventually regardless, (b) leaving 3 duplicated buggy copies right next to 1 fixed copy is an active pitfall for the next person who copy-pastes from the "wrong" sibling, (c) all 4 are visible on the same home-screen carousel a real DST-transition-week tester would see. If the planner decides to keep scope strictly to `getWeekMeals.ts` per the literal ROADMAP line reference, that is a valid, defensible choice — but it should be an explicit decision recorded in the plan, not a silent gap discovered later.

**Recommended fix shape (no new library, no runtime-support risk):** have the client compute a **per-day offset array** instead of one offset. `Date.prototype.getTimezoneOffset()` already returns the historically-correct offset for whichever date it's invoked on — the bug is that it's only ever invoked once. Passing `Array.from({length:7}, (_, i) => new Date(mondayLocalDate.getTime() + i*dayMs).getTimezoneOffset())` (7 numbers) instead of one number, and having the Convex query use `offsets[dayIndex]` per bucket instead of a single `offsetMs`, fixes the bug with zero new dependencies and zero uncertainty about Convex's `Intl`/ICU support. An alternative (passing an IANA timezone string and using `Intl.DateTimeFormat` with a `timeZone` option server-side) is possible in principle — Convex's default V8-isolate runtime is described by Convex's own docs as "very similar to the Cloudflare Workers runtime" [CITED: docs.convex.dev/functions/runtimes], and Cloudflare Workers ship full ICU by default — but this could not be verified directly against Convex's own docs in this research session [ASSUMED — see Assumptions Log A1]. The per-day-offset-array approach avoids depending on that unverified claim entirely and is the safer default recommendation.

**DST testability note (important for planning verification steps):** Russia abolished DST permanently in 2014. If TerenAI's primary test devices are set to a Russian timezone (consistent with the hardcoded `ru` locale noted in REQUIREMENTS.md's Out of Scope table), **no real DST transition will ever occur on a tester's device** to manually verify this fix end-to-end. Verification will require either (a) a pure-function unit script (see Validation Architecture) with fixed timestamps straddling a known DST boundary (e.g., EU: 2026-10-25, or manually setting a simulator's timezone to `Europe/Berlin`/`America/New_York` and testing bucketing logic in isolation), or (b) manually setting a test device's system timezone to a DST-observing region. This cannot be verified by "have a tester in Moscow use the app for a week."

### FLOW-04: EAS build + sourcemaps + TestFlight verification — reuse, don't re-derive

Phase 1's `01-04-PLAN.md` already fully specifies this (Task 2 and Task 3), was written by a prior research pass, and Task 1 of that same plan was human-verified on 2026-08-14. The org/project slugs, exact commands, and acceptance criteria below are copied directly from that plan and its dependency `01-01-SUMMARY.md` — this phase should reuse them, not re-derive:

```bash
# Source: .planning/phases/01-observability/01-04-PLAN.md Task 2 (verbatim)
eas build --platform ios --profile production
# profile "production" is the ONLY non-development profile in eas.json — there is
# no separate "testflight"/"preview" profile (DIST-01, a Phase 2 requirement, is
# still Pending per ROADMAP.md; see Common Pitfalls below).

npx @sentry/cli@latest releases --org codetau-et --project terenai list
npx @sentry/cli@latest releases --org codetau-et --project terenai files '<release>' list
# expect: release matching com.codetau.terenai@1.2.1+<build>, non-empty file list
# (bundle + map present) BEFORE submitting — 01-04-PLAN.md explicitly blocks submit
# on an empty file list.

eas submit --platform ios --profile production --latest
# submit.production.ios.ascAppId = "6797768889" already set in eas.json
```

```bash
# Source: .planning/phases/01-observability/01-04-PLAN.md Task 3 (verbatim, human-verify)
# In-app: Settings screen, 7 taps on version row → diagnostics actions appear:
#   1. Send test message      2. Send test error
#   3. Check logError          4. Native crash (app closes; report sends on next launch)
# Then in Sentry, environment=testflight, verify for EACH of the 4 events:
#   - readable TS stack trace (not Hermes bytecode addresses)     → OBS-03
#   - release matches the Task 2 build number, platform = iOS     → OBS-01
#   - environment == "testflight" (not "production", not "unknown")
#   - logError-sourced event carries a distinguishing source tag  → OBS-02
```

**Key facts carried over from Phase 1 (do not re-derive):**
- Sentry org slug: `codetau-et`, project slug: `terenai` [VERIFIED: `.planning/phases/01-observability/01-01-SUMMARY.md`, confirmed again in `app.config.ts:126-129`]
- EAS `production` environment's `EXPO_PUBLIC_SENTRY_ENVIRONMENT` is deliberately set to `testflight`, not `production` — because these builds point at Convex's **dev** deployment `keen-meerkat-110`, not a real production deployment [CITED: `01-04-PLAN.md` context block]
- Full build+submit+process cycle costs 30-45 minutes per attempt (Apple processing included) — plan task sequencing so cheap local checks happen first [CITED: `01-04-PLAN.md`]
- Existing build 1.2.1 (2), already in TestFlight, does **not** contain Sentry integration — it predates the Sentry commits by hours (committed 2026-08-05 19:10/19:38, build submitted earlier same day) [CITED: `01-04-SUMMARY.md`]. A fresh build is mandatory; there is no shortcut.
- No OTA (`expo-updates` not installed) — any bug found after this build ships requires a full new 30-45 minute cycle, not a JS patch [CITED: `STATE.md`, `ROADMAP.md` Phase 5]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async success/failure without try/catch losing the rejection | A new bespoke error-wrapper | `lib/utils/tryCatch.ts` (already exists, already used in 2 sibling auth screens) | Exact same shape of bug (missing `await`/lost rejection) already solved once in this codebase; reusing keeps the pattern uniform |
| Toast/error surfacing UI | A new inline `Toast`/banner component or `alert()` | `components/ui/Toast.tsx` `Toast.show({ variant: "error" })` | Already the established pattern in `phone-sign-in.tsx`, `confirm-phone.tsx`, `settings.tsx` — `fix-meal.tsx` is presently the only screen still using `alert()` |
| Per-day timezone-correct date bucketing | A new date library integration (`date-fns-tz`, `luxon`) just for this fix | Client-side per-day `getTimezoneOffset()` array (no new dependency) — see FLOW-03 above | `date-fns` is already a dependency but unused by any of the 4 `getWeek*` files; introducing timezone-aware date-fns/luxon usage in exactly one of four near-identical files fragments the pattern further. The bug is fixable with the same primitives already in use, correctly applied per-day instead of once |

**Key insight:** every "don't hand-roll" item in this phase already has a working reference implementation elsewhere in this exact codebase (not just "the ecosystem") — the risk here is not choosing the wrong library, it's fixing the named file while missing its un-named siblings that share the same bug.

## Common Pitfalls

### Pitfall 1: Fixing `getMeal.ts` but not `getMealItem.ts`
**What goes wrong:** The meal-detail screen stops crashing, shows the "Продукт недоступен" placeholder row — then the tester taps that exact row (it's a `<Link>` in `MealItems.tsx`, not disabled for placeholder items) and the mealItem-detail screen crashes via the untouched `getMealItem.ts:20-21`.
**Why it happens:** ROADMAP's success criterion text cites only `getMeal.ts:26-31`; `getMealItem.ts` has the identical bug but wasn't named because it wasn't grepped for during phase scoping.
**How to avoid:** Fix both queries in the same task, or explicitly disable/route around navigation for placeholder rows (harder — loses "view degraded item detail" as a feature). See Architecture Patterns above for full call-site map.
**Warning signs:** Any acceptance test that only queries/renders the meal-detail screen and never taps into an individual degraded ingredient row will pass while this gap remains.

### Pitfall 2: `correctMeal.ts` breaking silently once `getMeal.ts` allows `food: null`
**What goes wrong:** `correctMeal` (the Convex `action` behind "Исправить блюдо", D-02's own subject) calls `ctx.runQuery(api.meals.getMeal.default, ...)` internally and reads `item.food.name.en` at line 44. Once `getMeal.ts` is patched to permit `food: null`, this line throws inside the action for any meal that already has a degraded item — meaning D-02's "user can retry after seeing the error" now has a *guaranteed* failure case that has nothing to do with the AI correction itself.
**Why it happens:** D-01 and D-02 were discussed as independent bugs in CONTEXT.md; their interaction (D-01's data shape flows into D-02's action) wasn't surfaced until reading `correctMeal.ts` directly.
**How to avoid:** When patching `getMeal.ts`'s return shape, also patch `correctMeal.ts:44` to skip or placeholder-name items with `food === null` before building the AI prompt (`previousItems`).
**Warning signs:** A test that fixes/exercises `getMeal.ts` and `fix-meal.tsx` in isolation, with a meal that has no degraded items, will not catch this — it only appears when correcting a meal that already contains a placeholder row.

### Pitfall 3: Assuming DIST-01's "separate test build profile" already exists for the merged Phase 999.1 build
**What goes wrong:** Planning the merged EAS build step assuming a `preview`/`testflight` EAS profile exists to keep test builds separate from release candidates.
**Why it happens:** `eas.json` (read directly) has exactly three profiles: `development`, `development-simulator`, `production` — no fourth profile. `DIST-01` ("Существует профиль сборки для тестирования, не смешивающий тестовые билды с релизными кандидатами") is still `Pending` in ROADMAP.md's Phase 2, which Phase 4 does not formally depend on completing.
**How to avoid:** The merged build (per `01-04-PLAN.md`, which this phase reuses) uses `--profile production` as-is. This is a known, pre-existing gap (not introduced by this phase) — flag it rather than silently building a new profile mid-Phase-4 (out of this phase's stated scope) or silently accepting the DIST-01 gap without a note in the plan.
**Warning signs:** None operationally — the build will succeed either way. This is a documentation/scope-tracking risk, not a functional one.

### Pitfall 4: Verifying the DST fix on a real device in Moscow
**What goes wrong:** Assigning a human-verify checkpoint like "wait for/simulate a DST transition and confirm the week view is correct" without accounting for the fact that Russia has not observed DST since 2014 — a tester's real device clock will never cross a DST boundary.
**Why it happens:** Natural assumption that "DST bug" implies "testable by watching a real transition," which is true in DST-observing regions but not in the project's primary market.
**How to avoid:** Verification must use either a pure-function unit script with fixed timestamps (recommended — see Validation Architecture) or manually reconfigure a simulator/device timezone to a DST-observing region and step the system clock across the transition date.
**Warning signs:** A plan task phrased as "manually verify on device during the next DST changeover" with no date attached is a sign this wasn't accounted for.

### Pitfall 5: Introducing `ActivityIndicator` inconsistently
**What goes wrong:** Adding a spinner to exactly one button (`fix-meal.tsx`'s "Исправить") when no other async button in the app (Google sign-in, phone OTP send/resend, meal photo analysis) has one — creates a one-off visual pattern.
**Why it happens:** D-02's wording ("спиннер/индикацию загрузки") is satisfied by either a spinner or a text change; a spinner is the more visually obvious reading but has zero codebase precedent.
**How to avoid:** Default to the text-swap pattern already present one line away in the same file (`"Лимит исчерпан"` conditional) unless there's a specific design reason to introduce `ActivityIndicator` for the first time in this phase.
**Warning signs:** None functional — purely a consistency/design-system concern, explicitly left to discretion by CONTEXT.md.

## Code Examples

### Null-safe food name pattern (all 5 call sites should converge on the same shape)
```typescript
// Recommended shared idiom, applied at each of the 5 read sites identified above:
const foodName = item.food
  ? (item.food.name.ru ?? item.food.name.en)
  : "Продукт недоступен";
```

### `tryCatch` + `Toast` + disabled-while-pending (exact existing precedent)
```typescript
// Source: app/auth/phone-sign-in.tsx (existing, working code — reuse verbatim pattern)
import tryCatch from "@/lib/utils/tryCatch";
import { Toast } from "@/components/ui/Toast";

const [isSending, setIsSending] = useState(false);
// ...
setIsSending(true);
const { error } = await tryCatch(someAsyncCall());
setIsSending(false);
if (error) {
  Toast.show({ text: "...", variant: "error" });
  return;
}
```

## State of the Art

| Old Approach (in this file) | Current Approach (recommended) | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `void correctMeal(...)` inside sync `try`, `alert()` on catch | `await tryCatch(correctMeal(...))`, `Toast.show({variant:"error"})`, stay on screen | This phase (D-02) | Matches the pattern already used in 3 other screens; `fix-meal.tsx` is the last holdout using `alert()` |
| Convex query throws on missing FK reference | Convex query degrades gracefully, returns nullable field | This phase (D-01) | Matches Convex's own general guidance to avoid throwing across `Promise.all` for expected-missing references, though no single official Convex doc was found specifically endorsing this pattern — treat as a codebase-level architectural decision, not an externally-sourced best practice |
| Single client-computed offset for a 7-day window | Per-day offset array, or (unverified) IANA timezone + server-side `Intl` | This phase (FLOW-03) | Fixes DST edge case; per-day-array variant needs no new dependency or unverified runtime capability |

**Deprecated/outdated:** None — this is a bug-fix phase on code committed within the current milestone, not a library-version migration.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Convex's default (non-Node) V8-isolate runtime supports `Intl.DateTimeFormat` with an arbitrary `timeZone` option (full ICU), by analogy to Cloudflare Workers | FLOW-03 / Architecture Patterns | If false, an IANA-timezone-based fix would silently fall back to the host's default locale/timezone data or throw at runtime. Mitigated by recommending the per-day-offset-array approach as the primary fix, which does not depend on this claim at all |
| A2 | No `preview`/`testflight` EAS build profile exists beyond `development` and `production` | Common Pitfalls #3 | Low — directly read from `eas.json`, high confidence; listed as assumption only because DIST-01's resolution timeline (Phase 2, still Pending) could change this before Phase 4 executes |

## Open Questions

1. **Should the DST fix extend to `getWeekReadings.ts` (glucose, blood pressure) and `getWeekMovement.ts`, or stay scoped to `getWeekMeals.ts` only?**
   - What we know: identical bug exists in all 4 files, all rendered on the same home screen carousel.
   - What's unclear: ROADMAP's FLOW-03 text names only `getWeekMeals.ts`; CONTEXT.md's discretion note also only mentions `getWeekMeals.ts`.
   - Recommendation: planner should make this an explicit decision point (not silently skip or silently expand scope) — likely worth extending given it's the same fix effort either way once a shared helper is extracted, but this is a legitimate scope call the user may want to weigh in on given it wasn't discussed in `/gsd:discuss-phase`.

2. **Does `correctMeal.ts`'s internal `item.food.name.en` usage (line 44) count as in-scope for D-01, given CONTEXT.md didn't mention it?**
   - What we know: it's a direct, provable consequence of the D-01 data-shape change; without a matching fix, D-02's "user can retry on error" produces a new guaranteed-failure path.
   - What's unclear: whether the user considers this part of "the D-01 fix" or a separate, undiscovered bug.
   - Recommendation: treat as in-scope — it's not a new bug being introduced by this phase's work being incomplete, it's a direct consequence of shipping D-01 without it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `eas-cli` | FLOW-04 build/submit | Not verified in this session (requires user's shell/auth) | `>= 16.6.2` per `eas.json` cli.version | None — build step requires a human with EAS access; already flagged as `checkpoint:human-verify` in the reused `01-04-PLAN.md` |
| `sentry-cli` (via `npx @sentry/cli@latest`) | FLOW-04 sourcemaps verification | Invoked via `npx`, no local install required | latest (pinned by `@latest` in the reused command) | None needed — `npx` resolves it |
| `SENTRY_AUTH_TOKEN` in shell env | FLOW-04 sourcemaps verification | Not present in this session (by design — user exports it manually per `01-01-SUMMARY.md`/`01-04-PLAN.md` security note) | — | None — must be supplied by the user; agent must not request the value in chat (established constraint from Phase 1) |
| TestFlight-registered iOS device | FLOW-04 Task 3 | Not verifiable in this session | — | None — human-only step, already modeled as `checkpoint:human-verify` in the reused plan |

**Missing dependencies with no fallback:**
- `SENTRY_AUTH_TOKEN` and physical device/TestFlight access — both require direct human involvement and are already correctly modeled as blocking human-verify checkpoints in the plan being reused.

**Missing dependencies with fallback:**
- None — this phase has no dependency with a viable automated fallback; FLOW-04's nature (verifying a shipped binary works) mandates human involvement by definition.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed — no `jest.config.*`, `vitest.config.*`, or `*.test.ts`/`*.spec.ts` files exist anywhere in the repo [VERIFIED: repo-wide find] |
| Config file | none |
| Quick run command | none |
| Full suite command | none |

This is a project-level decision, not an oversight: `REQUIREMENTS.md` Out of Scope explicitly states "Автотесты всего кода: Тестов нет вообще; вводить покрытие параллельно с отладкой краша — распыление. Точечные тесты допустимы, если нужны для отладки." This phase should not introduce a test framework. Where automated verification is genuinely useful (see below), the codebase's existing convention for standalone scripts (`ts-node -r tsconfig-paths/register`, see `package.json`'s `script:importFdc`/`script:syncFoods`) is the right-sized tool — not a new framework.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLOW-01 | Meal with missing `food` renders with placeholder, no crash, across all 5 call sites | manual (dev build) | none — no framework; verify via `npm run ios` against a meal item whose `foodId` is manually deleted in the Convex dashboard | N/A — no test infra |
| FLOW-02 | `correctMeal` failure shows Toast, keeps user on screen, allows retry | manual (dev build) | none — simplest forced-failure: exceed the rate limit or momentarily disconnect during the call | N/A |
| FLOW-03 | Week bucketing correct across a DST boundary | **can** be automated without a framework | `npx ts-node -r tsconfig-paths/register scripts/verifyWeekBucketing.ts` (new, ad-hoc script following existing `scripts/importFdcData.ts` convention) asserting the extracted pure bucketing function places fixed, hand-picked timestamps straddling a known DST transition (e.g. EU: 2026-10-25 02:00 CET→CEST reversal) into the correct day index | ❌ — Wave 0 gap, but see note below: only feasible if the fix extracts the bucketing math into a pure, importable function |
| FLOW-04 | Real TestFlight binary, 4 Sentry event types, readable stack traces | manual (`checkpoint:human-verify`) | none — inherently requires a physical device + human eyes on the Sentry dashboard, per Phase 1's own plan | N/A |

### Sampling Rate
- **Per task commit:** manual smoke check in `npm run ios` dev build (no automated quick-run exists project-wide)
- **Per wave merge:** manual full walkthrough of onboarding → photo → home screen, matching FLOW-04's eventual TestFlight script, but on dev build first
- **Phase gate:** the reused `01-04-PLAN.md` Task 3 checklist (7-tap diagnostics, 4 event types, environment=testflight) is the closest thing to a phase-gate automated check, and it is explicitly human-only

### Wave 0 Gaps
- [ ] (Optional, recommended only if the DST fix extracts a pure bucketing function) `scripts/verifyWeekBucketing.ts` — ad-hoc `ts-node` script, no framework, asserting correct day-bucketing across a fixed DST-transition timestamp set. Not required if the fix is verified by hand-inspection of the extracted function's logic instead.
- No other gaps — this phase's other three requirements (FLOW-01, FLOW-02, FLOW-04) are inherently manual/device-dependent per the project's own "no autotests this milestone" decision and FLOW-04's physical-device nature.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Unchanged by this phase — all three bug fixes operate inside already-authenticated Convex queries/actions (`getAuthUserId` checks untouched) |
| V3 Session Management | No | Unchanged |
| V4 Access Control | No | `getMeal`/`getMealItem`/`getWeekMeals` already enforce `meal.userId !== userId` / index scoping by `userId`; this phase does not touch authorization checks, only the data-shape returned after authorization passes |
| V5 Input Validation | No new surface | `correction: v.string()` and `mealId: v.id(...)` validation in `correctMeal`/`getMeal` args already exist and are untouched; this phase adds no new external input |
| V6 Cryptography | No | Not applicable to this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `SENTRY_AUTH_TOKEN` exposure via `sentry-cli --auth-token` flag or chat request | Information disclosure | Already mitigated by Phase 1's established convention (T-01-17 in `01-04-PLAN.md`'s own threat model): token stays in the user's shell env var, never requested in chat, never passed as a CLI flag argument (which would leak into shell history/process listings). This phase's FLOW-04 task should inherit that same constraint verbatim. |
| Silent sourcemaps-upload failure leading to a false sense of OBS-03 completion | Tampering / false assurance | Already mitigated by `01-04-PLAN.md`'s explicit block-on-empty-file-list check via `sentry-cli releases files list` before submitting — reuse this gate, do not just check the build log for "success" |
| Placeholder food data accidentally leaking a real error message/stack to the end user in the UI | Information disclosure (minor) | The placeholder string ("Продукт недоступен") is static and user-facing by design (D-01) — ensure the underlying `logError` call in `getMeal.ts`'s catch block still fires for genuine unexpected errors, so a *missing food* (expected, degraded gracefully) is not conflated with logging suppression for *other* unexpected failures in the same function |

## Sources

### Primary (HIGH confidence — direct source reads in this session)
- `convex/meals/getMeal.ts`, `convex/mealItems/getMealItem.ts`, `convex/meals/analyze/correctMeal.ts`, `app/app/(meal)/fix-meal.tsx`, `convex/meals/getWeekMeals.ts`, `convex/glucose/getWeekReadings.ts`, `convex/bloodPressure/getWeekReadings.ts`, `convex/movement/getWeekMovement.ts`, `app/app/(meal)/meal.tsx`, `components/meal/Meal.tsx`, `components/meal/MealItems.tsx`, `app/app/(mealItem)/mealItem.tsx`, `app/app/(mealItem)/mealItemNutrients.tsx`, `app/app/(meal)/mealNutrients.tsx`, `components/ui/Toast.tsx`, `lib/utils/tryCatch.ts`, `components/ui/Button.tsx`, `components/ui/screen/ScreenFooter.tsx`, `app/auth/phone-sign-in.tsx`, `app/auth/confirm-phone.tsx`, `convex/tables/mealItems.ts`, `convex/tables/foods.ts`, `eas.json`, `app.config.ts`, `package.json`
- `.planning/phases/01-observability/01-04-PLAN.md`, `01-04-SUMMARY.md`, `01-01-SUMMARY.md`, `docs/PRODUCTION-DEBUGGING.md` — the fully-worked FLOW-04/Phase-999.1 build-and-verify sequence
- `.planning/phases/04-e2e-flow/04-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md` — phase scope and locked decisions

### Secondary (MEDIUM confidence)
- Convex runtime docs (`docs.convex.dev/functions/runtimes`) — confirms default runtime is V8-isolate, "very similar to Cloudflare Workers runtime," but does not explicitly document `Intl`/ICU/timeZone support [CITED, incomplete]

### Tertiary (LOW confidence)
- Cloudflare Workers full-ICU-by-default claim, used only to justify Assumption A1 — not independently re-verified against current Cloudflare docs in this session, and explicitly not relied upon for the primary FLOW-03 recommendation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all reused libraries and their versions read directly from `package.json`
- Architecture (blast-radius mapping for D-01, DST duplication, FLOW-04 reuse): HIGH — every claim traced to a direct file read in this session, not inferred
- Pitfalls: HIGH — all 5 pitfalls are concrete, reproducible code paths found by grep/read, not speculative
- DST fix algorithm specifics: MEDIUM — the per-day-offset-array approach is sound and dependency-free (HIGH), but the alternative IANA/`Intl` approach's feasibility on Convex's runtime is unverified (LOW, flagged as Assumption A1)

**Research date:** 2026-08-20
**Valid until:** 30 days (bug-fix phase on stable, already-shipped code; no fast-moving external dependency)

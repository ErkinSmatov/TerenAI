# Phase 68: Apple Health, оценка глюкозы, месячная история - Research

**Researched:** 2026-08-25
**Domain:** React Native/Expo HealthKit sync reliability, glucose-response estimation heuristics, Convex month-scoped queries, React Native calendar UI
**Confidence:** MEDIUM (HEALTH-01 root cause has one HIGH-confidence verified code bug + two MEDIUM-confidence external-evidence hypotheses that need on-device diagnosis before a fix is committed; GLU-01 formula is explicitly a heuristic, not a clinical model; HIST-01/02 is HIGH confidence — standard patterns, no ambiguity)

## Summary

This phase bundles three independent workstreams. For **HEALTH-01**, direct code reading found one concrete, verifiable bug (a `useRef` guard permanently disabling glucose sync when the profile query hasn't loaded on the very first effect run) plus two credible external-evidence causes: (1) Expo Router's default `Tabs` navigator never unmounts `HomeScreen` when the app is merely backgrounded, so `hasSyncedRef` blocks any re-sync until the process is fully killed — and there is currently zero `AppState`-driven re-sync trigger anywhere in the codebase; (2) an **open, unresolved** upstream GitHub issue in `@kingstinct/react-native-healthkit` (#330, opened 2026-03-19) describes the *exact* symptom reported by the user — HealthKit queries return stale/cached results while the app process stays alive, and killing the app is the only way to get fresh samples — with the reporter explicitly noting that an `AppState`-based re-fetch did **not** fix it for them. This means the JS-level fix (real, worth doing regardless) may not fully resolve the bug alone; the phase plan should start with a diagnostic-only task before committing to a single fix narrative.

For **GLU-01**, there is no glycemic-index field on `foods` and no npm package provides a usable GI database — but the project already stores per-meal aggregated sugar/fiber/carb totals (`meals.totalNutrients.carbs.{total,net,fiber,sugar}`, populated at meal-confirm time from `foods.nutrients`). This existing data is sufficient to build a practical GI-proxy heuristic (no schema change needed) combined with a simple time-since-meal decay curve. This is explicitly a heuristic approximation, not a validated clinical formula, and must be flagged to the user as an assumption.

For **HIST-01/HIST-02**, the codebase already has the exact analogous pattern to extend: `getLocalWeekBounds`/`localWeekBounds.ts` (client computes local calendar boundaries, server only validates/buckets) generalizes cleanly to a month; `getWeekMeals`/`getWeekReadings`/`getWeekMovement` generalize to month-scoped equivalents; and `HomeMacroSummary`/`HomeMicroSummary`/`HomeGlucoseSummary`/`HomeMovementSummary`/`HomeBloodPressureSummary`/`HomeRecentlyLogged` already take data via props (several already support `readOnly`), so a new date-parameterized route can reuse them directly. No calendar library exists yet; `react-native-calendars` is the standard, pure-JS (no native module, so no New Architecture risk), actively maintained choice.

**Primary recommendation:** Treat HEALTH-01 as diagnose-first (add temporary instrumentation, distinguish JS-level vs. native-level staleness on a real device) before choosing a fix; implement the verified `hasSyncedRef` race fix and an `AppState`-driven re-sync unconditionally (safe, standard, needed regardless of root cause); build GLU-01 from existing per-meal nutrient totals with an explicit "≈" heuristic, no new schema; build HIST-01/02 as a new `/app/(home)/day/[date]` route parameterized by ISO date string, backed by month-scoped Convex queries that reuse the existing local-bounds validation pattern, with `react-native-calendars` for the picker UI.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| HealthKit data fetch (steps/energy/distance/glucose) | Client (native module bridge) | — | HealthKit is iOS-device-local; only the RN bridge (`@kingstinct/react-native-healthkit`) can read it |
| Sync trigger/scheduling (when to re-fetch) | Client (React/AppState) | — | App lifecycle (foreground/background) is a client-only concept; no server-side cron can trigger a client-side native read |
| Movement/glucose persistence + de-dup | API/Backend (Convex mutations) | Database | `syncDays`/`importHealthKitReadings` already own upsert/de-dup logic; correct tier, no change needed |
| Glucose estimate computation (GLU-01) | Client (`lib/nutrition/*`) | — | Per CONTEXT.md discretion note, no persistent field needed; purely derived from already-fetched meal/profile data at render time, consistent with existing `calculateDayTotals` pattern being a pure client function |
| Glucose estimate participation in clinical warning fallback (D-08) | Client (where warning is rendered) or shared util reused from `convex/observers/utils/thresholds.ts` | API/Backend (if reused in `getObservedPatients.ts` for the observer feature) | `isGlucoseOutOfRange` already exists as a pure function importable from both tiers; reuse, don't duplicate |
| Month-bounds computation (HIST-01/02) | Client (`lib/utils/*`) | API/Backend (`convex/utils/*` validates) | Exact mirror of the existing week-bounds split: client computes local calendar math (DST-safe), server only validates + buckets |
| Month-scoped data queries (meals/readings/movement) | API/Backend (Convex queries) | Database | Direct analogue of `getWeekMeals`/`getWeekReadings`/`getWeekMovement` |
| Calendar UI (date picker, unfilled-day indicator) | Client (React Native component) | — | Pure UI concern; `react-native-calendars` renders in-app, no backend involvement beyond the month query feeding "which days have data" markers |
| Day-summary screen for arbitrary date | Client (new route, reusing `Home*Summary` components) | API/Backend (new date-parameterized query or reuse month query sliced client-side) | Same tier split as existing `HomeScreen`/`nutrients.tsx` |

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions

**Диагностика Apple Health-бага (HEALTH-01)**
- **D-01:** Симптом, подтверждённый пользователем лично: синхронизация срабатывает один раз, затем «замирает» — новые данные из Apple Health в последующие дни/сессии не подтягиваются в приложение
- **D-02:** Разрешение HealthKit было предоставлено через экран настроек (`health.tsx`) — флаг `healthkit_connected` в SecureStore установлен. Причина НЕ в отсутствующем разрешении
- **D-03:** Баг воспроизводится и в TestFlight/production, и в dev-сборке (`npm run ios`) — не специфичен для типа сборки, значит маловероятно, что причина в переменных окружения EAS
- **D-04:** Отдельный видимый пользователю UI-статус последней синхронизации ("последняя синхронизация: вчера в 14:32" и т.п.) НЕ нужен — пользователь хочет просто рабочую синхронизацию, без диагностического UI

**Формула и подача оценки глюкозы (GLU-01)**
- **D-05:** Формула оценки должна быть более точной моделью — учитывает гликемический индекс (GI) конкретного продукта и время с последнего приёма пищи, а не грубая эмпирика по сумме углеводов. Явное технико-исследовательское ограничение: сейчас GI продукта нигде не хранится в схеме (`convex/tables/foods.ts`) — источник/способ получения GI-данных на старте (захардкоженная таблица по категориям, оценка через существующие макросы, внешний справочник) — открытый вопрос для research/planner
- **D-06:** Оценочное значение отображается на главном экране рядом с `HomeGlucoseSummary` (`components/home/HomeGlucoseSummary.tsx`) — в том же блоке «Уровень сахара», не отдельной новой секцией и не только на экране блюда
- **D-07:** Величина показывается как абсолютное значение в тех же единицах, что и реальные измерения (mmol/L или mg/dL по настройке пользователя из `glucoseReadings.unit`), с явной пометкой приближения (напр. знак «≈») — не относительный подъём и не качественная шкала
- **D-08:** Оценочное значение участвует в клинических предупреждениях о выходе за диапазон (установленных в Phase 6, `06-CONTEXT.md` D-06/D-07) **только как fallback**: если за релевантный период (день) есть хотя бы одно реальное измерение глюкозы (ручное или из HealthKit, `source: "manual" | "healthkit"`), предупреждение считается исключительно по реальным данным; оценка подсвечивается тем же порогом предупреждения только когда реальных измерений вообще нет за этот период. Подтверждено явно пользователем после уточняющего вопроса

### Claude's Discretion
- Точный источник/структура GI-данных для формулы D-05 (хардкод по категориям продуктов, эвристика от существующих макросов блюда, справочник) — техническое решение для research/planner. **Research finding: use existing per-meal `totalNutrients.carbs.{total,fiber,sugar}` — see GI Proxy Heuristic below.**
- Механика UI календаря (HIST-01/02): где именно появляется кнопка/элемент входа в календарь, какой конкретно экран переиспользуется как «аналитика за день» — сейчас на эту роль не подходит ни `nutrients.tsx` (это экран микронутриентов конкретного дня недели, не общая сводка), ни `HomeScreen` напрямую (использует `useState` для выбора дня внутри текущей недели, не параметризован датой/route). Нужно решить: параметризовать `HomeScreen`-подобную сводку по произвольной дате (route типа `/day/:date`), или собрать облегчённую версию, переиспользующую существующие карточки (`HomeMacroSummary`, `HomeMicroSummary`, `HomeGlucoseSummary` с `readOnly`, `HomeMovementSummary`, `HomeRecentlyLogged`, `HomeBloodPressureSummary`)
- Что считается «незаполненным днём» — сейчас `HomeDaySelector` показывает только 7 дней текущей недели без состояния "есть данные/нет данных" визуально; нужно решить, относится ли "незаполненный" только к дням без блюд внутри видимой недели, или это более общий вход в календарь, не привязанный к конкретному дню-триггеру
- Диапазон доступной истории (весь месяц целиком включая будущее, или только назад от сегодняшней даты; можно ли листать месяцы вперёд/назад произвольно) — пользователь не уточнял, оставлено на усмотрение
- Точная формула/структура хранения оценки глюкозы (отдельная вычисляемая величина на клиенте vs персистентное поле в Convex) — по существующим конвенциям `convex/tables/*.ts` и `lib/nutrition/*`. **Research finding: compute client-side, no persistence — see GLU-01 architecture note below.**

### Deferred Ideas (OUT OF SCOPE)
Нет — обсуждение не вышло за рамки скоупа фазы.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HEALTH-01 | Данные из Apple Health (движение, глюкоза) синхронизируются надёжно | See "HEALTH-01 Diagnostic Findings" — one verified code bug + two evidence-backed hypotheses + recommended diagnose-first task sequence |
| GLU-01 | Приблизительная оценка уровня глюкозы от сахара в еде, дополняющая измерения | See "GI Proxy Heuristic" and "Time-Since-Meal Decay Model" — buildable entirely from existing `meals.totalNutrients` data, no schema change |
| HIST-01 | История доступна за произвольный месяц, не только текущую неделю | See "Month-Scoped Query Pattern" — direct generalization of existing week pattern |
| HIST-02 | Незаполненный день → календарь → дата → существующий экран аналитики дня | See "Calendar Library" and "Date-Parameterized Day Screen" |

</phase_requirements>

## Standard Stack

### Core (already in project — no version changes needed)
| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@kingstinct/react-native-healthkit` | ^14.0.2 [VERIFIED: package.json] | HealthKit bridge (steps, energy, distance, glucose) | Already integrated; only known active RN HealthKit binding using Nitro modules |
| `expo-secure-store` | ~15.0.7 [VERIFIED: package.json] | Persists `healthkit_connected` flag | Already used, no change |
| `convex` | ^1.27.3 [VERIFIED: package.json] | Backend queries/mutations | Already the project's only backend |
| `date-fns` | ^4.1.0 [VERIFIED: package.json] | Date math in UI layer | Already used throughout (`getLocalWeekBounds`, `HomeDaySelector`) |

### Supporting (new for this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-calendars` | 1.1314.0 (latest, `snapshot` tag ignored) [VERIFIED: npm registry, `npm view react-native-calendars dist-tags`] | Month calendar picker UI for HIST-02 | Pick this for the calendar entry point — pure JS, no native module, so zero New Architecture / Nitro-module risk on top of the HealthKit native module already in the build |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-native-calendars` | `@marceloterreiro/flash-calendar` (v2.0.0, [VERIFIED: npm registry]) | Newer, explicitly built/marketed for the New Architecture and higher raw scroll performance, but ~10x fewer weekly downloads (61.5K vs 558K, [VERIFIED: npmjs.org downloads API, week of 2026-08-17]) and a much smaller ecosystem of examples/Stack Overflow answers. Since `react-native-calendars` is pure JS with no native module, New Architecture is not actually a differentiator here — prefer the more battle-tested option unless a specific `flash-calendar` feature (e.g. FlashList-style virtualization for very long ranges) is needed. Not needed for a single month-at-a-time picker. |
| AppState-only re-sync fix | Native library upgrade / patch to `@kingstinct/react-native-healthkit` | Not viable short-term: issue #330 is open and unresolved upstream as of research date (2026-08-25); no released version fixes it. Do not block the phase on an upstream fix. |

**Installation:**
```bash
npm install react-native-calendars
```

**Version verification:** `npm view react-native-calendars dist-tags` → `{ latest: '1.1314.0', snapshot: '1.1314.0-snapshot.1613' }`, first published 2017-05-09 (mature, actively maintained monorepo under `wix/react-native-calendars`). No `peerDependencies` field returned by `npm view` — confirms it does not pin a specific `react-native`/`react` version, consistent with pure-JS implementation.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads (week) | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------------|-------------|-----------|-------------|
| `react-native-calendars` | npm | ~9 years (published 2017-05-09) [VERIFIED: `npm view react-native-calendars time.created`] | 558,128 [VERIFIED: npmjs.org downloads API] | github.com/wix/react-native-calendars [VERIFIED: `npm view repository.url`] | OK [VERIFIED: `slopcheck scan --pkg npm react-native-calendars --json`] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

`@marceloterreiro/flash-calendar` was evaluated as an alternative but not recommended (see Alternatives table) — not run through slopcheck since it is not the recommendation; if the planner chooses it instead, run `slopcheck scan --pkg npm @marceloterreiro/flash-calendar` before installing.

## Architecture Patterns

### System Architecture Diagram — HEALTH-01 sync flow (current, buggy)

```
[App cold start / HomeScreen mount]
        |
        v
useHealthKitSync(isGlucometerTrack) effect fires
        |
        v
   hasSyncedRef.current? --yes--> STOP (never runs again for this mount,
        |                          even if isGlucometerTrack flips true->false->true,
        no                          even across tab-switch-and-back)
        v
  hasSyncedRef.current = true
        |
        v
  isHealthKitConnected() [SecureStore flag check]
        |
        v
  fetchRecentMovement(8) ----> queryStatisticsCollectionForQuantity x3 (native bridge)
        |                              |
        |                     [possible native-level staleness — see Pitfall 3]
        v
  syncMovementDays() [Convex mutation, upserts by date] --always safe, idempotent--
        |
        v
  if (includeGlucose) fetchRecentGlucoseSamples(30d) ----> queryQuantitySamples (native bridge)
        |                                                          |
        |                                                [same native-level staleness risk]
        v
  importHealthKitReadings() [Convex mutation, de-dup by healthKitUuid]

PROBLEM POINTS (see Common Pitfalls):
  1. First render often has includeGlucose=false (profile query not yet loaded) ->
     glucose branch skipped -> ref locks -> glucose NEVER syncs again this mount.
  2. Expo Router Tabs keep HomeScreen mounted across backgrounding -> ref never
     resets except on full app kill -> "syncs once per force-quit" matches D-01.
  3. Native query itself may return HealthKit-side cached results even after a
     fresh JS-level re-fetch (external evidence, unresolved upstream issue).
```

### Recommended Project Structure (additions only)
```
app/app/(home)/
├── day/
│   └── [date].tsx          # NEW — date-parameterized day summary (HIST-01/02),
│                            # reuses Home*Summary components with readOnly/props
├── calendar.tsx             # NEW — month calendar picker (HIST-02 entry point)
lib/
├── health/
│   └── healthKit.ts          # existing — no change to fetch functions themselves
├── hooks/
│   └── useHealthKitSync.ts   # MODIFIED — remove permanent ref-lock, add AppState trigger
├── nutrition/
│   └── estimateGlucoseFromMeals.ts   # NEW — GI-proxy + time-decay pure function (GLU-01)
├── utils/
│   ├── getLocalWeekBounds.ts # existing, unchanged
│   └── getLocalMonthBounds.ts # NEW — month analogue, same DST-safe local-Date-math pattern
convex/
├── utils/
│   └── localWeekBounds.ts    # existing — extend or sibling with localMonthBounds.ts
├── meals/getMonthMeals.ts    # NEW — month-scoped analogue of getWeekMeals
├── glucose/getMonthReadings.ts   # NEW — month-scoped analogue of getWeekReadings
├── movement/getMonthMovement.ts  # NEW — month-scoped analogue of getWeekMovement
scripts/
└── verifyMonthBucketing.ts   # NEW — ts-node DST verification script, sibling of
                                # existing verifyWeekBucketing.ts
```

### Pattern 1: Local calendar bounds computed client-side, validated server-side
**What:** `getLocalWeekBounds()` computes 8 local-midnight UTC timestamps + 7 date strings using `new Date(year, month, day)` constructor math (correctly resolves DST), sends them to Convex; `assertLocalWeekBounds`/`assertLocalWeekDates` in `convex/utils/localWeekBounds.ts` validate shape/spacing but do NOT recompute the calendar (server can't know the client's local timezone).
**When to use:** Any new month-scoped query (HIST-01/02) must follow the identical split — do not attempt to compute month boundaries inside a Convex function using `Date.UTC` or a fixed offset; this is precisely the DST bug class already fixed for weeks (FLOW-03).
**Example:**
```typescript
// Source: lib/utils/getLocalWeekBounds.ts (existing, read directly)
export default function getLocalWeekBounds(now: Date = new Date()): LocalWeekBounds {
  const daysFromMonday = (now.getDay() + 6) % 7;
  const dayStartsUtc: number[] = [];
  const weekDates: string[] = [];
  for (let i = 0; i <= 7; i++) {
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday + i);
    dayStartsUtc.push(localDate.getTime());
    if (i < 7) weekDates.push(toLocalDateString(localDate));
  }
  return { dayStartsUtc, weekDates };
}
```
A month analogue replaces the fixed 7/8-length arrays with a variable-length array (28-31 days + 1 boundary), using `new Date(now.getFullYear(), now.getMonth(), 1)` as the anchor and `new Date(now.getFullYear(), now.getMonth() + 1, 0)` for the last day — same DST-safe constructor approach. `assertLocalWeekBounds`'s fixed-length-8 assumption cannot be reused verbatim; write a sibling `assertLocalMonthBounds` that validates variable length (28-31 entries) instead of hardcoding 8.

### Pattern 2: Convex month query mirrors the week query shape
**What:** `getWeekMeals`/`getWeekReadings` use a range index query (`gte`/`lt` on `_creationTime` or `recordedAt`) bounded by `[monthStartUtc, monthEndUtc)`, then bucket results into a per-day array using `getLocalWeekDayIndex`-style lookup (renamed/generalized to accept a variable-length `dayStartsUtc`). `getWeekMovement` uses the `date` string index directly (`gte`/`lte` on `weekDates[0]`/`weekDates[last]`).
**When to use:** For HIST-01, add `getMonthMeals`, `getMonthReadings`, `getMonthMovement` (and `getMonthBloodPressure` if the day screen shows blood pressure too) following this exact shape. A full month's `.collect()` (max ~31 days of one user's meals/readings) is well within Convex's practical query-result-size limits at this project's current scale — no need for pagination in v1.
**Example:**
```typescript
// Source: convex/meals/getWeekMeals.ts (existing, read directly) — month version
// changes: dayStartsUtc.length check becomes 29-32 (variable), week[] becomes
// Array.from({ length: dayStartsUtc.length - 1 }, ...)
```

### Pattern 3: Reusable presentational Home*Summary components already support arbitrary-date rendering
**What:** `HomeGlucoseSummary`, `HomeBloodPressureSummary`, `HomeMovementSummary` all accept data via props and already have a `readOnly` boolean prop (added for Phase 6's observer view) that removes the "Add reading" / "See all" CTA links. `HomeMicroSummary` takes `totalMicros` + `dayIndex` (used only to build the `/nutrients?dayIndex=N` link — this coupling to a 0-6 week index must be changed to accept a date string instead for arbitrary-date reuse). `HomeMacroSummary` and `HomeRecentlyLogged` take pure data props already.
**When to use:** Build `/app/(home)/day/[date].tsx` as a thin data-fetching wrapper: parse `date` route param, call the new month-scoped queries (or a new single-day query) filtered to that date, then render the existing `Home*Summary` components with `readOnly` where available. This avoids re-implementing any card UI.
**Example:**
```typescript
// Source: components/home/HomeMicroSummary.tsx (existing) — needs this change:
// current:  href={{ pathname: "/app/(home)/nutrients", params: { dayIndex } }}
// for arbitrary dates, nutrients.tsx also needs to accept ?date=YYYY-MM-DD as an
// alternative to ?dayIndex=N (or the day screen route needs its own inline
// micronutrient view instead of linking out).
```

### Pattern 4: AppState-driven re-sync (NEW pattern for this project — not yet used anywhere)
**What:** React Native's built-in `AppState.addEventListener("change", (nextState) => { if (nextState === "active") { ... } })` fires when the app transitions from background/inactive to active. `grep -rn "AppState" .` returns zero matches in this codebase today — this is a gap, not a refactor of existing code.
**When to use:** Replace the "run once forever" `hasSyncedRef` guard in `useHealthKitSync` with a guard that re-runs on (a) initial mount AND (b) every foreground transition, optionally throttled (e.g. skip if last sync was < 5 minutes ago, tracked in a `useRef<number>` timestamp, not `SecureStore` — no need to persist across app restarts since a fresh cold start should always sync anyway).
**Example:**
```typescript
// New pattern — not sourced from existing code, standard RN API
import { AppState } from "react-native";

useEffect(() => {
  const sync = () => { /* existing fetch+mutate logic */ };
  sync(); // run on mount
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") sync();
  });
  return () => sub.remove();
}, [includeGlucose, syncMovementDays, importGlucoseReadings]);
```
Note: per the external evidence in issue #330, this alone may not fully resolve the *native-level* staleness if that hypothesis is confirmed on-device — see Common Pitfalls and the recommended diagnose-first task.

### Anti-Patterns to Avoid
- **Persisting the glucose estimate as a `glucoseReadings` row with a new `source: "estimate"` value:** would silently mix estimated and real data in every query that reads `glucoseReadings` (week/month queries, PDF export in `convex/reports/`, observer views in Phase 6) unless every single call site is updated to filter it out. Compute it as a derived client-side value instead (per CONTEXT.md discretion note) and pass it as a separate prop into `HomeGlucoseSummary`.
- **Hardcoding a month as always 30/31 days without re-deriving via `new Date(y, m+1, 0).getDate()`:** breaks February and leap years; use the constructor-based last-day-of-month trick already implicitly modeled by the week bounds' DST-safe approach.
- **Re-authorizing HealthKit (`requestAuthorization`) as a "fix" for stale data:** iOS deliberately does not report per-type read-denial status back to the app (Apple privacy design) — re-requesting authorization for already-granted read types is a no-op and won't surface or fix silent data gaps. Confirmed not the issue per D-02 anyway.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Month calendar grid UI, date range highlighting, "marked day" dots | Custom `FlatList`-based calendar grid | `react-native-calendars` `Calendar`/`CalendarList` component with `markedDates` prop | Calendar month-grid math (weekday offsets, leap years, locale-aware week start) is exactly the kind of deceptively fiddly UI logic explicitly called out by this project's own established convention (`getLocalWeekBounds` comments already document a DST edge case bug class) — a maintained library avoids re-discovering those edge cases |
| Foreground/background app lifecycle detection | Custom polling of `AppState.currentState` on a timer | `AppState.addEventListener("change", ...)` (already React Native core, zero new dependency) | This is a built-in RN API, not a hand-roll risk — listed here only to confirm no external library is needed for this specific fix |

**Key insight:** The two things this phase might be tempted to hand-roll (calendar grid math, month-boundary DST math) both already have either a direct library (calendar) or a direct in-repo precedent to copy (month boundary math directly mirrors the already-solved, already-tested week boundary math — do not re-derive from scratch).

## GI Proxy Heuristic (GLU-01) — detailed finding

**Problem:** D-05 requires the estimate to account for glycemic index of the specific food, but `convex/tables/foods.ts` has no GI field, and no npm package or established free API provides a drop-in GI database [VERIFIED: WebSearch found no npm package; University of Sydney's GI database and glycemicindex.com are the authoritative sources but are not machine-readable APIs].

**Finding:** The project does not need per-food GI to satisfy D-05's *intent* — it already computes and stores, per meal, at confirm time (`meals.totalNutrients.carbs`):
```typescript
// Source: convex/tables/mealItems.ts (existing schema, read directly)
carbs: { total: number, net: number, fiber: number, sugar: number }
```
This is aggregated across all ingredients of the meal (via `mealItemsFields.nutrientsPer100g` → summed by `addNutrients` in `lib/nutrition/calculateDayTotals.ts`'s sibling logic). A meal with a high sugar-to-total-carb ratio and low fiber content produces a faster/sharper glucose response than one with the same total carbs but high fiber and low sugar (established nutrition-science principle behind the standard glycemic-load formula `GL = GI × carbs / 100`, [CITED: Oregon State University Linus Pauling Institute, en.wikipedia.org/wiki/Glycemic_load]).

**Recommended formula (heuristic, `[ASSUMED]` — not a validated clinical model, flag for user/product confirmation):**
```
sugarRatio = sugar / max(total, 1)
fiberRatio = fiber / max(total, 1)
estimatedGI = clamp(35 + 55 * sugarRatio - 25 * fiberRatio, 15, 100)   // proxy, not real GI
glycemicLoad = (estimatedGI * total) / 100                             // standard GL formula, [CITED]
```
This reuses the *real, standard* glycemic-load formula (verified/citable) but substitutes a hand-derived proxy for GI (not verified/citable — this is the part that needs explicit "≈" framing and cannot be presented as clinically accurate).

## Time-Since-Meal Decay Model (GLU-01)

**Finding:** Postprandial glucose response is physiologically a rise-then-fall curve: it typically starts within ~15 min, peaks around 45-60 min, and returns toward baseline by ~2-3 hours [ASSUMED — general nutrition/diabetes-education knowledge, not verified via a specific clinical source in this research session; flag as needing confirmation if the planner wants a citation-backed curve shape]. A simple, easy-to-explain-in-UI model:
```
minutesSinceMeal = (now - meal._creationTime) / 60000
if minutesSinceMeal < 0 or minutesSinceMeal > 180: contribution = 0
elif minutesSinceMeal <= 60: contribution = glycemicLoad * (minutesSinceMeal / 60)     // linear rise to peak at 60min
else: contribution = glycemicLoad * max(0, 1 - (minutesSinceMeal - 60) / 120)          // linear decay to 0 by 180min
```
Sum `contribution` across all meals eaten in the trailing 3 hours, scale to a mmol/L or mg/dL delta via a single tunable coefficient, and add to a baseline. **Open question (needs planner/user decision, not resolvable by research alone):** what baseline to add the delta to — options are (a) the user's average real fasting reading over a trailing window if any exist, (b) a fixed population-average baseline (~5.5 mmol/L / ~100 mg/dL) when no real data exists at all, or (c) always show the delta as the whole displayed number with an implicit population baseline. D-07 requires an absolute value, so *some* baseline choice is unavoidable — this is squarely a product decision, not a technical one, and should be surfaced to the user rather than assumed silently.

## Glucose Unit Ambiguity (GLU-01) — open question surfaced by research

**Finding:** There is no single stored "user's glucose unit" preference anywhere in the schema. `glucoseReadings.unit` is set per-reading: the manual-entry screen (`app/app/(add)/glucose.tsx`) defaults its local `useState<GlucoseUnit>` to `"mmol/L"` but lets the user toggle per entry via `SegmentedControl`; HealthKit-imported readings are always inserted as `"mg/dL"` (hardcoded in `fetchRecentGlucoseSamples`). CONTEXT.md D-07 says to display the estimate "in the same unit as real measurements... per the user's setting from `glucoseReadings.unit`" — but there is no single authoritative "the" unit when a user has a mix of manual mmol/L entries and HealthKit mg/dL entries in the same day. **Recommendation:** use the unit of the user's most recent real reading if one exists in the last N days; otherwise default to `"mmol/L"` (matching the manual-entry screen's own default). Flag this as a planner decision point, not silently resolved by research.

## HEALTH-01 Diagnostic Findings

### Verified code bug (HIGH confidence — read directly from source)
**What:** In `app/app/(tabs)/index.tsx`, `isGlucometerTrack = profile?.data?.goalTrack === "glucometer"` evaluates to a definite `false` (not `undefined`) while `profile` is still loading (Convex `useQuery` returns `undefined` on first render, and `undefined === "glucometer"` is `false`). `useHealthKitSync(isGlucometerTrack)` is called with `includeGlucose = false` on that first render. Inside the hook, the effect runs immediately (mount), sets `hasSyncedRef.current = true`, and skips the `if (includeGlucose)` glucose-import branch entirely since it's false at that moment. When `profile` finishes loading a render later and `isGlucometerTrack` flips to `true`, the effect's dependency array changes and React re-invokes the effect function — but its very first line, `if (hasSyncedRef.current) return;`, is already `true`, so the function returns immediately and the glucose import branch **never runs for the rest of that mount's lifetime.**
**Impact:** For any user on the `"glucometer"` goal track, HealthKit glucose import via `useHealthKitSync` silently never fires (movement sync is unaffected since it doesn't depend on `includeGlucose`). This alone would fully explain a "glucose never syncs from Apple Health" symptom, independent of the other two hypotheses below.
**Fix direction:** Remove the permanent `hasSyncedRef` lock; gate on `includeGlucose` changing from `false`→`true` (or on the AppState-driven re-sync below, which naturally re-evaluates `includeGlucose` on every trigger).

### Hypothesis 2 — screen never remounts across "sessions" (MEDIUM-HIGH confidence, standard documented behavior)
**What:** `app/app/(tabs)/_layout.tsx` uses `expo-router`'s `Tabs` with no `unmountOnBlur`/`popToTopOnBlur` override — the default React Navigation bottom-tabs behavior keeps all visited tab screens mounted in memory even when the app is backgrounded (not force-quit) [CITED: React Navigation docs/GitHub issues — screens persist across tab switches and app backgrounding by design; `unmountOnBlur` was removed from newer versions in favor of `popToTopOnBlur`, and the old always-unmount behavior requires an explicit `useIsFocused`-gated wrapper]. `grep -rn "AppState" .` across the whole repo returns zero matches — there is no code anywhere that re-triggers sync on a foreground transition.
**Impact:** If a user's daily habit is "open app, background it (not force-quit), reopen later" — which is extremely common on iOS — `HomeScreen` never remounts, `hasSyncedRef` (once fixed for the bug above) still only allows one sync per true process-launch. This matches D-01's wording ("syncs once, then freezes... in subsequent days/sessions") very closely if "session" means "app reopened from background," not "app relaunched from a full kill."
**Fix direction:** Add an `AppState`-driven re-sync (Pattern 4 above) — safe and standard regardless of which hypothesis is the "real" cause.

### Hypothesis 3 — upstream native library staleness (MEDIUM confidence, single external report, unresolved)
**What:** GitHub issue #330 on `kingstinct/react-native-healthkit` (opened 2026-03-19, still open, no fix version identified in 13.3.0 through 14.0.2 release notes) [CITED: github.com/kingstinct/react-native-healthkit/issues/330] describes: `queryQuantitySamples`, `queryQuantitySamplesWithAnchor`, `subscribeToChanges`, and `useMostRecentQuantitySample` all returning stale/outdated HealthKit data while the app process stays alive; only killing and relaunching the app returns fresh samples. The reporter explicitly tried and reports failure of: (1) `subscribeToChanges` with anchored queries — never fires; (2) polling with fresh date parameters every 30s — still stale; (3) an `AppState` listener re-fetching on foreground — "brief backgrounding insufficient"; (4) all three combined — still stale. Reporter's environment: library v13.2.3, RN 0.83.2, Expo SDK 55 (this project runs library v14.0.2, RN 0.81.5, Expo SDK 54 — close but not identical; not confirmed whether the bug reproduces on this project's exact versions).
**Impact:** If this hypothesis is confirmed on this project's actual device/build, the AppState fix (Hypothesis 2's remedy) and the ref-lock fix (verified bug's remedy) may both land correctly and the symptom could still partially persist for `queryQuantitySamples`/`queryStatisticsCollectionForQuantity` calls specifically, because the staleness would be inside the native `HKHealthStore` query execution itself, below the JS layer this project controls.
**Fix direction:** Cannot be fixed by this project's own code if confirmed — would need either an upstream library fix/workaround (none currently known) or a documented, accepted limitation. **This is why a diagnose-first task is recommended** rather than assuming the JS-level fixes alone will resolve D-01 end-to-end.

### Recommended task sequencing for HEALTH-01
1. **Diagnostic task (do first, before any fix):** Add temporary console/Sentry-breadcrumb logging in `fetchRecentMovement`/`fetchRecentGlucoseSamples` that logs the returned sample/day count and the most recent `recordedAt`/date timestamp on every call. Ship a dev build, use the app normally for 2+ days without force-quitting, and compare logged results across sessions. If the *fetch itself* returns the same stale count/timestamps across foreground-only sessions (no kill), Hypothesis 3 is confirmed and needs to be documented as a known upstream limitation. If the fetch returns fresh data once an AppState-triggered re-run happens, only Hypotheses 1+2 are the cause and the JS fixes are sufficient.
2. **Fix task (always do, regardless of diagnostic outcome):** Fix the verified `hasSyncedRef` race (glucose-skip bug) and replace the "run once per mount" pattern with the AppState-driven re-sync (Pattern 4).
3. **Contingent task (only if diagnostic confirms Hypothesis 3):** Document the upstream limitation for the user/team (per D-04, no user-facing diagnostic UI is wanted, but an internal note in STATE.md/a follow-up backlog item is appropriate), and evaluate whether a periodic background-fetch-triggered sync (via `expo-task-manager`/`expo-background-fetch`, which force-launches the JS context briefly) would work around it by effectively performing the "kill+relaunch" that the reporter found necessary — this is a bigger scope addition and should be raised as a discretionary follow-up, not assumed into this phase's plan without user confirmation.

## Common Pitfalls

### Pitfall 1: `includeGlucose` race on first render (see Verified code bug above)
**What goes wrong:** Glucose HealthKit import silently never runs for the whole app session on the glucometer track.
**Why it happens:** `hasSyncedRef` locks on the very first effect invocation, which can happen before the Convex profile query resolves.
**How to avoid:** Don't gate on a boolean ref that never resets; gate on either the AppState-driven re-sync or an explicit check that re-attempts glucose sync once `includeGlucose` transitions from `false`/`undefined` to `true`.
**Warning signs:** Users on `goalTrack: "glucometer"` see steps/movement update but never see HealthKit-sourced glucose readings appear, even though manual entries work fine.

### Pitfall 2: Screens persisting across tab navigation and app backgrounding
**What goes wrong:** Any "run once" `useRef` guard on mount effectively becomes "run once per full app kill," not "run once per open."
**Why it happens:** Expo Router's `Tabs` (React Navigation bottom-tabs under the hood) keeps visited screens mounted by default; there is no `unmountOnBlur` equivalent configured in `app/app/(tabs)/_layout.tsx`.
**How to avoid:** Use `AppState` foreground transitions (or `useFocusEffect` from `@react-navigation/native`, though `AppState` is more appropriate here since the concern is process backgrounding, not tab-switching) instead of a mount-only effect for anything that should refresh "per day the user opens the app."
**Warning signs:** A feature that "worked once, then never updated again" without the user force-quitting the app between tests.

### Pitfall 3: Assuming a native HealthKit query always returns fresh data
**What goes wrong:** Even after fixing all JS-level triggering issues, the native module itself may return cached results per the unresolved upstream issue #330.
**Why it happens:** Unknown/unconfirmed — reporter suspects `HKHealthStore` instance reuse or query-level caching inside the native binding; no fix has landed as of this research.
**How to avoid:** Cannot be avoided purely from the JS side if confirmed. Diagnose first (see Recommended task sequencing) rather than assuming a JS fix alone resolves the full symptom.
**Warning signs:** Sample counts/timestamps logged from `fetchRecentMovement`/`fetchRecentGlucoseSamples` stay identical across multiple foreground-triggered re-fetches within the same app-process lifetime, even though new data genuinely exists in the Health app.

### Pitfall 4: Fixed 8-element/7-element array assumptions leaking into month code
**What goes wrong:** Copy-pasting `assertLocalWeekBounds` (hardcoded `length !== 8`) or `assertLocalWeekDates` (hardcoded `length !== 7`) verbatim for months will throw on every single month since months are 28-31 days, not a fixed length.
**Why it happens:** The existing week-bounds validators are intentionally fixed-length; a naive month adaptation might not notice the hardcoded constant.
**How to avoid:** Write new `assertLocalMonthBounds`/`assertLocalMonthDates` functions that validate a *range* (29-32 for the `dayStartsUtc` boundary array, 28-31 for the date-string array) instead of an exact constant, and validate month-length correctness via `new Date(year, month + 1, 0).getDate()` rather than a hardcoded day count.
**Warning signs:** Convex query throws "Invalid week bounds"/"Invalid week dates"-style errors specifically in February or 31-day months during manual testing.

### Pitfall 5: `HomeMicroSummary`'s `dayIndex`-only routing breaks for arbitrary dates
**What goes wrong:** `HomeMicroSummary` links to `/app/(home)/nutrients?dayIndex=N` where `nutrients.tsx` recomputes `getLocalWeekBounds()` fresh and indexes into *the current week* — passing an arbitrary date's "day index" here would silently show the wrong (current-week) day's micronutrients.
**Why it happens:** `nutrients.tsx` was built assuming "current week only," matching its original scope before this phase.
**How to avoid:** Either extend `nutrients.tsx` to accept an optional `?date=YYYY-MM-DD` param that takes priority over `dayIndex` when present, or build the arbitrary-date day screen with its own inline micronutrient card instead of linking out to `nutrients.tsx`.
**Warning signs:** Tapping into micronutrient detail from the new date-parameterized day screen shows data for today (or the current week) instead of the selected historical date.

## Code Examples

### Existing week-bounds pattern to mirror for months
```typescript
// Source: lib/utils/getLocalWeekBounds.ts (read directly — full file, 35 lines)
export type LocalWeekBounds = { dayStartsUtc: number[]; weekDates: string[] };
// Month analogue signature:
// export type LocalMonthBounds = { dayStartsUtc: number[]; monthDates: string[] };
// Anchor: new Date(now.getFullYear(), now.getMonth(), 1)
// Day count: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
```

### Existing server-side validation pattern to mirror
```typescript
// Source: convex/utils/localWeekBounds.ts (read directly)
// assertLocalWeekBounds checks: length===8, monotonic 22-26h steps, total span
//   7*24h ± 2h. Month analogue must replace the fixed length/span checks with
//   range checks (28-31 day months) and DAY-COUNT-aware step validation
//   (same 22-26h per-step tolerance for DST, but variable total span 28*24h to
//   31*24h ± tolerance).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `useRef`-gated "sync once per mount" for background data refresh | `AppState`-driven re-sync on every foreground transition (this project has zero `AppState` usage today — this is a gap-fill, not a migration from a formerly-correct pattern) | N/A — this project never implemented the AppState pattern | Without it, any "run once" effect on a persistently-mounted tab screen only truly re-runs once per full app kill |

**Deprecated/outdated:**
- `unmountOnBlur` on React Navigation tab screens is deprecated in favor of `popToTopOnBlur` [CITED: React Navigation GitHub issues] — not directly relevant here since the project doesn't use either option, but worth knowing if the planner considers "force screens to unmount on tab blur" as an alternative fix strategy (not recommended — `AppState` is the more targeted fix for the actual problem, which is background/foreground, not tab-switching).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The GI-proxy formula (`estimatedGI = clamp(35 + 55*sugarRatio - 25*fiberRatio, 15, 100)`) is a reasonable heuristic | GI Proxy Heuristic | If the coefficients are badly calibrated, the displayed "≈" glucose estimate could be meaningfully wrong for common foods (e.g. white rice vs. lentils with similar total carbs) — low real-world harm since it's clearly marked approximate and never overrides real measurements (D-08), but could mislead users who don't read the "≈" marker carefully |
| A2 | Postprandial glucose peaks ~45-60min and returns to baseline by ~2-3h (used for the time-decay model's 60min/180min constants) | Time-Since-Meal Decay Model | If materially wrong, the estimate could show a "spike" at the wrong time of day relative to when the user actually ate — same low-harm profile as A1 since it's approximate-only |
| A3 | Displaying the estimate using "the most recent real reading's unit, else default to mmol/L" is the right resolution for the D-07 unit-ambiguity gap | Glucose Unit Ambiguity | Minor UX inconsistency risk only — wrong unit choice could confuse a user used to seeing mg/dL, not a correctness/safety risk since the number itself doesn't change, only its labeled unit |
| A4 | Issue #330 (native HealthKit staleness) reproduces on this project's exact versions (library 14.0.2 / RN 0.81.5 / Expo SDK 54), not just the reporter's newer versions (13.2.3 / RN 0.83.2 / Expo SDK 55) | HEALTH-01 Diagnostic Findings, Hypothesis 3 | If it does NOT reproduce on this project's versions, the diagnostic task in step 1 of the recommended sequencing will correctly rule it out with no wasted fix effort — the diagnose-first sequencing is specifically designed to make this assumption safe to be wrong |

## Open Questions

1. **What baseline should the GLU-01 estimate be added to, to produce an absolute value?**
   - What we know: D-07 requires an absolute value in the user's unit; there is no existing "baseline glucose" concept anywhere in the schema.
   - What's unclear: Whether to use a trailing average of the user's own real readings, a fixed population-average constant, or something else.
   - Recommendation: Surface this explicitly to the user during planning/discuss rather than the planner picking silently — this materially affects what number is shown, unlike A1/A2 above which only affect the shape of the curve around a chosen baseline.

2. **Does the HEALTH-01 native-level staleness (issue #330) actually reproduce in this project's build?**
   - What we know: The symptom description matches D-01 closely; the library version differs slightly from the reporter's.
   - What's unclear: Cannot be confirmed without on-device diagnostic logging (this research had no access to a running iOS device/simulator with real HealthKit data).
   - Recommendation: Run the diagnostic task (Recommended task sequencing, step 1) as the first executable task of the phase plan, before committing to any specific fix as "the" fix.

3. **What counts as an "unfilled day" trigger for the calendar entry point, and how far back/forward does history go?**
   - What we know: CONTEXT.md explicitly leaves this to the planner.
   - What's unclear: Nothing technical — this is a pure product/UX decision with no research-discoverable "right answer."
   - Recommendation: Planner should decide directly (e.g., a simple always-visible calendar icon near `HomeDaySelector`, independent of any specific day's fill state, is the lowest-risk interpretation — avoids inventing a new "has this day got data" visual state on `HomeDaySelector` that CONTEXT.md never asked for).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Physical iOS device or simulator with HealthKit + sample health data | HEALTH-01 diagnosis and verification | ✗ (not available in this research/build environment) | — | Diagnostic task must be executed by the user/human-verify step on a real device; cannot be simulated or verified from this sandboxed research session |
| `react-native-calendars` on npm registry | HIST-02 | ✓ | 1.1314.0 | — |
| `@kingstinct/react-native-healthkit` already installed | HEALTH-01 | ✓ | 14.0.2 | — |
| `slopcheck` CLI | Package legitimacy audit | ✓ (installed during this research session) | — | — |

**Missing dependencies with no fallback:**
- A real iOS device/TestFlight build for HEALTH-01 diagnosis and final verification — this phase cannot be fully verified in CI/sandbox; the plan must include an explicit `checkpoint:human-verify` step for the HEALTH-01 diagnostic task and again after the fix.

**Missing dependencies with fallback:**
- None beyond the above.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed project-wide [VERIFIED: `package.json` has no `jest`/`vitest`/test script; confirmed by grep of `devDependencies`] |
| Config file | none — see Wave 0 |
| Quick run command | `npx ts-node -r tsconfig-paths/register scripts/verify<Name>.ts` (established ad-hoc pattern, not a real test runner) |
| Full suite command | `npx tsc --noEmit` (project's actual regression gate per STATE.md — "clean project-wide" is the recurring bar mentioned across recent phase closures) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| HEALTH-01 | HealthKit sync updates data across sessions without force-quit | manual-only (device/HealthKit dependency, no simulator equivalent available) | — (human-verify on TestFlight/dev build over 2+ real days) | N/A |
| GLU-01 | Estimate formula produces a plausible, unit-correct value; correctly defers to real measurements per D-08 | unit (pure function `estimateGlucoseFromMeals`) + manual sanity check of displayed numbers | `TZ=Europe/Berlin ts-node -r tsconfig-paths/register scripts/verifyGlucoseEstimate.ts` (new, mirrors `verifyWeekBucketing.ts` pattern) | ❌ Wave 0 |
| HIST-01 | Month-scoped queries bucket days correctly, including DST transitions | unit (pure function `getLocalMonthBounds` + Convex validator) | `TZ=Europe/Berlin ts-node -r tsconfig-paths/register scripts/verifyMonthBucketing.ts` (new, mirrors `verifyWeekBucketing.ts`) | ❌ Wave 0 |
| HIST-02 | Calendar → date tap → day screen shows correct data for that date | manual (UI navigation flow, no test framework to automate RN navigation in this project) | — (human-verify) | N/A |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (already the project's established bar per recent phase closures)
- **Per wave merge:** `npx tsc --noEmit` + relevant `scripts/verify*.ts` scripts + `npx eslint .`
- **Phase gate:** `npx tsc --noEmit` clean, both new `scripts/verify*.ts` scripts pass, HEALTH-01 human-verify over a multi-day real-device window, HIST-02 human-verify of the calendar → day-screen flow

### Wave 0 Gaps
- [ ] `scripts/verifyMonthBucketing.ts` — covers HIST-01 (mirrors existing `scripts/verifyWeekBucketing.ts`)
- [ ] `scripts/verifyGlucoseEstimate.ts` — covers GLU-01 formula sanity (new script, no existing sibling to copy beyond the general ts-node-script pattern)
- [ ] Framework install: none — project has intentionally deferred a real test framework (QA-01/QA-02 are v2 scope per REQUIREMENTS.md Out of Scope); do not introduce jest/vitest in this phase, stay consistent with the existing ad-hoc script convention

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | No new auth surface in this phase |
| V3 Session Management | no | N/A |
| V4 Access Control | yes | All new Convex queries/mutations (`getMonthMeals`, `getMonthReadings`, `getMonthMovement`) MUST call `getAuthUserId(ctx)` and throw `Unauthorized` on `null`, exactly mirroring `getWeekMeals`/`getWeekReadings`/`getWeekMovement`/`syncDays`/`importHealthKitReadings` — copy the existing pattern verbatim, do not invent a new auth check style |
| V5 Input Validation | yes | New Convex functions must validate their date-range/bounds args with `convex/values` `v.*` schemas (already the project convention) plus a bespoke `assertLocalMonthBounds`/`assertLocalMonthDates` analogous to the existing week validators — reject malformed or absurdly-wide client-supplied date ranges rather than trusting them blindly (the existing week validators already do this: length checks, per-step tolerance, total span tolerance) |
| V6 Cryptography | no | No new crypto surface; `healthkit_connected` flag continues using `expo-secure-store`, unchanged |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Client sends an arbitrarily wide or malformed month-bounds array to `getMonthMeals`/`getMonthReadings`/`getMonthMovement`, attempting to exfiltrate another time range or cause an oversized `.collect()` | Tampering / Denial of Service | `assertLocalMonthBounds`/`assertLocalMonthDates` must cap the accepted span (e.g., reject anything wider than ~32 days) exactly as the existing `assertLocalWeekBounds` caps at `7*24h ± 2h` — do not accept an unbounded client-supplied range |
| IDOR: a month-scoped query returns another user's meals/readings/movement because `userId` filtering is forgotten in a new hand-written query | Tampering / Information Disclosure | Copy the `.withIndex("byUserId"/"byUserIdAndRecordedAt"/"byUserIdAndDate", (idx) => idx.eq("userId", userId)...)` pattern from the existing week queries verbatim — this is already the established, correct pattern in this codebase, just don't drop the `userId` clause when writing the month analogue |

## Sources

### Primary (HIGH confidence)
- Direct codebase reads: `lib/health/healthKit.ts`, `lib/hooks/useHealthKitSync.ts`, `app/app/(tabs)/index.tsx`, `app/app/(tabs)/_layout.tsx`, `convex/glucose/importHealthKitReadings.ts`, `convex/movement/syncDays.ts`, `app/app/(settings)/health.tsx`, `convex/tables/foods.ts`, `convex/tables/glucoseReadings.ts`, `convex/tables/meals.ts`, `convex/tables/mealItems.ts`, `convex/tables/movementData.ts`, `convex/tables/profiles.ts`, `components/home/HomeGlucoseSummary.tsx`, `components/home/HomeMovementSummary.tsx`, `components/home/HomeBloodPressureSummary.tsx`, `components/home/HomeMicroSummary.tsx`, `components/home/HomeRecentlyLogged.tsx`, `components/home/HomeDaySelector.tsx`, `convex/utils/localWeekBounds.ts`, `lib/utils/getLocalWeekBounds.ts`, `convex/meals/getWeekMeals.ts`, `convex/glucose/getWeekReadings.ts`, `convex/movement/getWeekMovement.ts`, `app/app/(home)/nutrients.tsx`, `convex/observers/utils/thresholds.ts`, `config/glucoseConfig.ts`, `config/nutrientsConfig.ts`, `app/app/(add)/glucose.tsx`, `scripts/verifyWeekBucketing.ts`, `lib/utils/logError.ts`, `app.config.ts`, `package.json`, `.planning/config.json`
- `npm view react-native-calendars dist-tags/time.created/repository.url` — package facts
- `slopcheck scan --pkg npm react-native-calendars --json` — legitimacy check, result `OK`

### Secondary (MEDIUM confidence)
- github.com/kingstinct/react-native-healthkit/issues/330 — "Killing an app is the only way to get new samples" (open, unresolved, matches D-01 symptom closely)
- github.com/kingstinct/react-native-healthkit/releases — confirmed no fix landed for staleness/caching between v13.3.0 and v14.0.2
- React Navigation GitHub issues/docs on default tab screen persistence and `unmountOnBlur` deprecation
- Oregon State University Linus Pauling Institute + en.wikipedia.org/wiki/Glycemic_load — standard `GL = GI × carbs / 100` formula (the GI *input* itself remains a project-specific proxy, not sourced from these citations)

### Tertiary (LOW confidence)
- General WebSearch summaries on `AppState` foreground-resync patterns (standard, well-known RN pattern, not a controversial claim, but no single authoritative source was fetched in full)
- Postprandial glucose timing constants (peak ~45-60min, return to baseline ~2-3h) — general nutrition/diabetes-education knowledge, not verified against a specific clinical source this session (see Assumption A2)

## Metadata

**Confidence breakdown:**
- Standard stack (calendar library choice): HIGH — verified via npm registry + slopcheck, clear pure-JS/no-native-module rationale
- HEALTH-01 root cause: MEDIUM — one bug is HIGH confidence (verified by direct code reading), the other two are credible but unconfirmed on this project's actual device/build; diagnose-first sequencing recommended specifically because of this uncertainty
- GLU-01 formula: LOW-MEDIUM — the glycemic-load formula itself is a real, citable standard; the GI-proxy substitution and time-decay constants are explicitly hand-derived heuristics, flagged throughout as assumptions needing confirmation
- HIST-01/02 architecture: HIGH — direct generalization of an already-shipped, already-tested pattern in this exact codebase (week bounds → month bounds), no external unknowns

**Research date:** 2026-08-25
**Valid until:** 2026-09-24 (30 days — stack choices are stable; re-check the HEALTH-01 upstream issue #330 status specifically if planning is delayed, since an upstream fix could land and change the recommended approach)

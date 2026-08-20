# Phase 4: Сквозной сценарий тестера - Context

**Gathered:** 2026-08-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Тестер проходит путь «онбординг → фото блюда → калории и БЖУ на главном экране» на реальной TestFlight-сборке без блокирующих ошибок. В скоуп входят три конкретных известных бага (деградация при отсутствующем `food`, потеря ошибки на экране «Исправить блюдо», DST-баг недельной истории) и сам сквозной прогон внутренним тестером. Новые возможности, изменения авторизации/подписки, OTA — вне этой фазы.

</domain>

<decisions>
## Implementation Decisions

### Деградация блюда без связанного `food`
- **D-01:** `convex/meals/getMeal.ts:24-31` — когда `ctx.db.get(mealItem.foodId)` не находит документ, `mealItem` остаётся в списке, но с плейсхолдером «Продукт недоступен» вместо падения `Promise.all` с `throw new Error("Food not found")`. Вся сумма калорий/БЖУ блюда по-прежнему считается по `meal.totalNutrients` (уже посчитанным при анализе), плейсхолдер — только для конкретной строки состава, не влияет на итоговую сводку

### Экран «Исправить блюдо» (`app/app/(meal)/fix-meal.tsx`)
- **D-02:** `handleCorrect` — `correctMeal(...)` вызывается через `await` вместо голого вызова без ожидания (сейчас `void`-подобный вызов внутри синхронного `try`, из-за чего `catch` никогда не видит асинхронный сбой). Кнопка «Исправить» показывает спиннер/индикацию загрузки, пока идёт запрос; ошибка показывается через `Toast.show({ variant: "error" })` — по прецеденту `phone-sign-in.tsx`/`confirm-phone.tsx`/`settings.tsx`, а не через `alert()`, как сейчас. При ошибке пользователь остаётся на экране (не `router.dismiss()`), может попробовать снова

### Недельная история и DST (`convex/meals/getWeekMeals.ts`)
- Технический баг: единый `timezoneOffsetMinutes`, посчитанный один раз на клиенте, применяется ко всей неделе — при переходе на летнее/зимнее время внутри недели часть дней смещается на час. Конкретный способ починки (per-day offset пересчёт, либо иной подход) — на усмотрение планировщика/исполнителя; пользователь не высказывал предпочтений, это чисто корректность вычислений, а не видимое поведение

### Сквозная TestFlight-проверка (FLOW-04) и связь с Phase 999.1
- **D-03:** Установленная сейчас сборка 1.2.1 (2) не содержит кода после 2026-08-06 (гостевой доступ, Phase 6 «Наблюдатель», телефонная авторизация) — OTA ещё не подключён (Phase 5), поэтому сквозной прогон FLOW-04 требует новой EAS production-сборки. Пользователь решил **объединить это с Phase 999.1** (backlog: EAS production build + проверка sourcemaps через `sentry-cli` + сквозная проверка в Sentry) — один билд-цикл закрывает и FLOW-04, и OBS-01/OBS-03, вместо двух отдельных сборок
- Практическое следствие для планирования: баги FLOW-01…03 чинятся и проверяются локально/в dev-сборке в рамках этой фазы; сам пункт «тестер проходит путь на TestFlight без блокирующих ошибок» (FLOW-04) физически зависит от билд-цикла Phase 999.1 и не может быть закрыт раньше него

### Claude's Discretion
- Конкретный алгоритм пересчёта `timezoneOffsetMinutes` по дням недели в `getWeekMeals.ts` для корректного DST-перехода
- Точный визуальный вид плейсхолдера «Продукт недоступен» (иконка, цвет, текст) — в рамках существующей дизайн-системы компонентов блюда
- Тип индикатора загрузки на кнопке «Исправить» (спиннер внутри кнопки vs. смена текста) — по существующим паттернам `ScreenFooterButton`/`Button` в проекте

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Роадмап и требования
- `.planning/ROADMAP.md` §Phase 4 — формальная запись фазы, включая точные ссылки на баги (файл:строки) в Success Criteria
- `.planning/REQUIREMENTS.md` §FLOW — FLOW-01…04
- `.planning/ROADMAP.md` §Backlog Phase 999.1 — EAS production build + sourcemaps + TestFlight-проверка, с которым объединяется FLOW-04 по решению D-03

### Затрагиваемый код
- `convex/meals/getMeal.ts` — деградация при отсутствующем `food` (D-01)
- `app/app/(meal)/fix-meal.tsx` — await + спиннер + Toast (D-02)
- `convex/meals/getWeekMeals.ts` — DST-баг недельной истории

No external specs beyond ROADMAP.md/REQUIREMENTS.md — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/Toast.tsx` (`Toast.show({ text, variant: "error" })`) — уже используется как единый паттерн отображения ошибок пользователю в `app/auth/phone-sign-in.tsx`, `app/auth/confirm-phone.tsx`, `app/app/(tabs)/settings.tsx` — переиспользовать в `fix-meal.tsx` вместо `alert()`
- `lib/utils/tryCatch.ts` — обёртка `await tryCatch(promise)` для `{ data, error }`, уже используется в тех же экранах вместо `try/catch` — подходящий паттерн для `handleCorrect` вместо текущего `try { void correctMeal(...) }`

### Established Patterns
- Convex function-per-file с `try/catch` + `logError` на верхнем уровне handler (везде в `convex/meals/*.ts`) — сохранить при правке `getMeal.ts`/`getWeekMeals.ts`
- `ScreenFooterButton` уже принимает `disabled` — на него же можно завязать состояние загрузки

### Integration Points
- `convex/meals/getMeal.ts` — возвращаемая форма `{ meal, mealItems: mealItemsWithFood }` используется на экране блюда (не найден в этой сессии, но должен быть проверен планировщиком/исполнителем на предмет обработки `food: null`)
- `app/app/(meal)/fix-meal.tsx` — единственная точка входа AI-исправления блюда

</code_context>

<specifics>
## Specific Ideas

Нет частных референсов сверх зафиксированных решений выше — обсуждение осталось в рамках трёх известных багов и стратегии TestFlight-проверки.

</specifics>

<deferred>
## Deferred Ideas

- Отдельная EAS-сборка специально для Phase 4 (без объединения с Phase 999.1) — рассмотрена и отклонена пользователем в пользу одного билд-цикла (D-03)

### Reviewed Todos (not folded)
None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-e2e-flow*
*Context gathered: 2026-08-20*

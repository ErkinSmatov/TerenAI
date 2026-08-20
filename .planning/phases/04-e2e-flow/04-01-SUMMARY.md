---
phase: 04-e2e-flow
plan: 01
subsystem: api
tags: [convex, react-native, expo-router, null-safety, error-handling]

# Dependency graph
requires:
  - phase: 03-guest-onboarding
    provides: гостевой userId, авторизация через getAuthUserId, работающий поток фото -> AI-анализ
provides:
  - "getMeal/getMealItem не падают при отсутствующем документе foods — food стало Doc<\"foods\"> | null"
  - "Единый хелпер getFoodName для UI-плейсхолдера «Продукт недоступен»"
  - "correctMeal null-безопасен по item.food, деградированные позиции не выпадают из previousItems"
  - "Экран «Исправить блюдо» дожидается результата действия, показывает ошибку тостом, блокирует повторное нажатие"
affects: [04-02, 04-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Единственный источник строки-плейсхолдера для деградированных внешних ссылок (lib/utils/getFoodName.ts) вместо дублирования литерала по местам чтения"
    - "async handleX + tryCatch + isX state + Toast(variant: error) для форм с внешним действием (уже использовался в phone-sign-in.tsx, теперь и в fix-meal.tsx)"

key-files:
  created:
    - lib/utils/getFoodName.ts
  modified:
    - convex/meals/getMeal.ts
    - convex/mealItems/getMealItem.ts
    - convex/meals/analyze/correctMeal.ts
    - app/app/(meal)/meal.tsx
    - app/app/(mealItem)/mealItem.tsx
    - app/app/(mealItem)/mealItemNutrients.tsx
    - app/app/(meal)/fix-meal.tsx

key-decisions:
  - "getFoodName(food: Doc<\"foods\"> | null): string принимает только null, не undefined — состояние загрузки обрабатывается на месте вызова отдельно (mealItem.tsx передаёт undefined в prop name во время загрузки, mealItemNutrients.tsx — пустую строку)"
  - "В correctMeal.ts для previousItems используется отдельный литерал \"unknown food\" (английский, для промпта модели), а не getFoodName (русский, для UI) — разные аудитории одного и того же null-состояния"
  - "Деградированные позиции не выбрасываются из previousItems в correctMeal — их grams нужны модели для сохранения веса блюда при пересчёте (D-05)"

patterns-established:
  - "lib/utils/getFoodName.ts как образец: одна функция на файл, default export, обрабатывает деградацию внешней ссылки в единственном месте"

requirements-completed: [FLOW-01, FLOW-02]

# Metrics
duration: ~6min
completed: 2026-08-20
---

# Phase 04 Plan 01: Деградация вместо падения на экране блюда Summary

**getMeal/getMealItem возвращают food как Doc<"foods"> | null вместо throw; все 4 места чтения null-безопасны через getFoodName; fix-meal.tsx дожидается correctMeal через tryCatch и показывает ошибку тостом вместо молчаливой потери**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-08-20T13:24:25Z
- **Completed:** 2026-08-20T13:29:54Z
- **Tasks:** 2
- **Files modified:** 7 modified + 1 created

## Accomplishments
- Убран блокирующий краш экрана блюда: `getMeal.ts` и `getMealItem.ts` больше не бросают `"Food not found"`, поле `food` стало `Doc<"foods"> | null`, доказано зелёным `npx tsc --noEmit` в strict-режиме
- Все 4 места чтения `.food` (три экрана + действие `correctMeal`) стали null-безопасны через единый хелпер `lib/utils/getFoodName.ts`, кроме `correctMeal.ts`, где используется отдельный английский литерал `"unknown food"` для промпта
- Экран «Исправить блюдо» переведён с `void correctMeal(...)` + синхронный `try/catch` + `alert()` на `await tryCatch(correctMeal(...))` + `Toast.show({ variant: "error" })`; пользователь остаётся на экране при сбое и может повторить попытку; кнопка блокируется и показывает «Исправляем…» во время запроса

## Task Commits

Each task was committed atomically:

1. **Task 1: Деградация вместо падения при отсутствующем food** - `b42e245` (fix)
2. **Task 2: Видимая ошибка и состояние загрузки на экране «Исправить блюдо»** - `e8d4b09` (fix)

_Plan metadata commit made separately by orchestrator after wave completion (worktree mode — STATE.md/ROADMAP.md not touched by this agent)._

## Files Created/Modified
- `lib/utils/getFoodName.ts` — новый хелпер: `getFoodName(food: Doc<"foods"> | null): string`, возвращает `food.name.ru ?? food.name.en` или литерал `"Продукт недоступен"`
- `convex/meals/getMeal.ts` — убран `throw new Error("Food not found")`, `food` возвращается как есть (nullable); авторизационные `throw` и `logError` в catch не тронуты
- `convex/mealItems/getMealItem.ts` — та же правка; дополнительно исправлен текст лога `"getMeal error"` → `"getMealItem error"`
- `convex/meals/analyze/correctMeal.ts` — `item.food.name.en` заменено на условное чтение с фолбэком `"unknown food"`; деградированные позиции остаются в `previousItems` со своим `grams`
- `app/app/(meal)/meal.tsx` — `name: item.food.name.ru ?? item.food.name.en` заменено на `name: getFoodName(item.food)`
- `app/app/(mealItem)/mealItem.tsx` — `name` передаётся как `undefined` во время загрузки, иначе `getFoodName(mealItem.food)`
- `app/app/(mealItem)/mealItemNutrients.tsx` — `name` — пустая строка во время загрузки, иначе `getFoodName(mealItem.food)`
- `app/app/(meal)/fix-meal.tsx` — `handleCorrect` асинхронный, `isCorrecting` state, `await tryCatch(correctMeal(...))`, `Toast.show({ variant: "error" })` при сбое без `router.dismiss()`, `router.dismiss()` только после успеха; кнопка `disabled` расширена, текст кнопки — «Исправляем…» во время запроса

## Decisions Made
- `getFoodName` принимает только `Doc<"foods"> | null`, не `undefined` — намеренно, чтобы состояние «данные ещё грузятся» не показывало «Продукт недоступен» вместо скелетона/пустого состояния
- `correctMeal.ts` не переиспользует `getFoodName` — промпт модели англоязычный, UI-хелпер возвращает русскую строку; используется отдельный литерал `"unknown food"`

## Deviations from Plan

None — план выполнен как написан. Ниже — два замечания по формулировкам automated-проверок плана, не требующие изменения кода.

### Note 1: verify-скрипт `grep "Food not found" convex --include="*.ts" | wc -l` возвращает `1`, не `0`

Оставшееся совпадение — `convex/meals/replaceMealItems.ts:61`, `throw new Error(\`Food not found: ${foodId}\`)`. Этот файл **не входит** в `files_modified` плана, не упомянут в `<read_first>` или `<action>` — это мутация (не query), логика которой отличается (замена состава блюда новыми `foodId`, а не чтение уже сохранённого деградированного `food`). Правка вне зоны ответственности этого плана (Scope Boundary) — задокументировано, не исправлено.

### Note 2: verify-скрипт `grep -c "isCorrecting" fix-meal.tsx` возвращает `4`, план ожидал «не менее 5»

Причина — case-sensitivity: `setIsCorrecting` содержит `IsCorrecting` с заглавной `I`, поэтому не матчится шаблоном `isCorrecting` (строчная `i`). Case-insensitive подсчёт (`grep -ic`) даёт `6` — все требуемые элементы присутствуют: объявление состояния, ранний выход, два вызова сеттера (`setIsCorrecting(true)`/`setIsCorrecting(false)`), `disabled`, текст кнопки. Код соответствует установленной конвенции (`isSending`/`setIsSending` в `phone-sign-in.tsx`) — переименование сломало бы конвенцию ради совпадения с недостаточно точным grep-шаблоном плана.

## Issues Encountered

Worktree был создан от устаревшей базы (`dbc40fe`, предшествующей созданию плана фазы 4). HEAD исправлен через `git reset --hard` на ожидаемый базовый коммит `dfcc2e7` перед началом работы (working tree был чист, потерь не было).

## Next Phase Readiness

- FLOW-01 и FLOW-02 реализованы, готовы к ручной проверке поведения в плане 04-03 Task 1 (удаление документа `foods` через Convex dashboard, форсированный сбой `correctMeal`) — эта проверка намеренно не выполнялась в этом плане (дорогой билд-цикл)
- Оставшийся `throw new Error("Food not found: ...")` в `convex/meals/replaceMealItems.ts` не затронут — вне скоупа этого плана; не блокирует FLOW-01/FLOW-02, но стоит держать в поле зрения при дальнейшей работе с деградацией `foods`

---
*Phase: 04-e2e-flow*
*Completed: 2026-08-20*

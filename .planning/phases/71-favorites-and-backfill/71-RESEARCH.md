# Phase 71: favorites-and-backfill - Research

**Researched:** 2026-10-08
**Domain:** Convex-схема и запросы (поле даты приёма + миграция), цепочка добавления еды в Expo Router, новая таблица избранного
**Confidence:** HIGH по карте мест использования `_creationTime` и цепочке добавления (проверено по коду), MEDIUM по поведению индексов Convex с отсутствующим полем (см. A1)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** В избранное сохраняется **одно блюдо**: название + список ингредиентов с граммами (снимок `confirmedItems`: `name`, `nameRu`, `grams`) + по желанию фото. Это новая сущность пользователя (отдельная таблица), не ссылка на конкретный приём пищи — удаление/изменение исходного приёма не должно ломать избранное.
- **D-02:** Добавление — **звёздочка на экране блюда** (`app/app/(meal)/meal.tsx`) «в избранное» / «убрать из избранного». Управление списком: просмотр и **удаление** в экране списка избранного. Переименование и редактирование ингредиентов самого избранного в этой фазе не делаем (правка граммов — только при подтверждении конкретного приёма).
- **D-03:** Набор приёмов / «рацион на день целиком» в избранное **не входит** (отложено).
- **D-04:** Точка входа — **новый пункт «Избранное» в меню «+»** (`components/tabs/TabsAddOptions.tsx`), карточка в той же сетке 2×2 рядом с «Описать»/«Сканировать». Открывает список избранного.
- **D-05:** После выбора блюда открывается **экран подтверждения** (`confirm-meal`) с уже заполненными ингредиентами — **без** ИИ-распознавания (не тратит лимит ИИ-функций): пользователь может поправить граммы и нажать «Подтвердить», дальше обычный путь `confirmMeal` и расчёт КБЖУ.
- **D-06:** Дата выбирается кнопкой **«Добавить» на экране дня** (`app/app/(home)/day/[date].tsx`, тот же экран, что открывается из календаря) — кнопка «+» в блоке «Рацион». Дата пробрасывается через всю цепочку добавления (описать / сканировать / из избранного → подтверждение → сохранение). Отдельный пикер даты на экране подтверждения НЕ добавляется.
- **D-07:** **Глубина — без ограничений в прошлое, в будущее нельзя** (кнопка на экране будущей даты недоступна, сервер отклоняет будущую дату).
- **D-08:** **Время приёма:** на экране подтверждения при добавлении за прошлый день пользователь выбирает **приём пищи (завтрак / обед / ужин …) или конкретное время**; по умолчанию подставляется разумное время (например, по выбранному приёму), блюда в «Рационе» выстраиваются по этому времени.
- **D-09:** Задним числом добавленный приём **везде считается по реальной дате приёма**: серия (streak) восстанавливается/продлевается, блюдо попадает в месячный отчёт, оценку глюкозы, данные для наблюдателя (на ту дату), бейджи и неделю/месяц Главной/истории. Напоминания о приёмах пищи (`checkMealReminders`) смотрят на сегодняшний день и от задним числом добавленных блюд не должны срабатывать/подавляться ошибочно.
- **D-10:** Для этого вводится явное поле даты приёма (например `eatenAt`, ms UTC) вместо `_creationTime` как источника истины, с **бэкфиллом старых записей** (`eatenAt = _creationTime`) и переводом всех чтений на него. Имя поля, индексы и стратегия миграции — на усмотрение планировщика (см. Claude's Discretion).

### Claude's Discretion
- Имя и форма поля даты приёма (`eatenAt` или аналог), индекс `byUserId` + дата, механика миграции/бэкфилла (в проекте есть `convex/migrations.ts`), порядок перевода запросов: `meals/getWeekMeals`, `getMonthMeals`, `observers/getPatientToday`, `getObservedPatients`, `getPatientHistory`, `home/getStreak`, `reports/getMonthlyReport`, `badges/checkAndAwardBadges`, `notifications/checkMealReminders`, а также клиентские места, использующие `meal._creationTime` для времени (`HomeRecentlyLogged`, `HomeDaySelector`, оценка глюкозы).
- Структура таблицы избранного (имя таблицы, индексы, лимит количества), UI экрана списка избранного (карточки в стиле приложения, пустое состояние), иконка/подпись пункта меню «+», нужен ли пункт Pro-гейтинг (избранное само по себе ИИ не использует).
- Как именно сделать выбор времени/приёма пищи (сегменты «Завтрак / Обед / Ужин / Другое» + пикер времени или только пикер) и дефолтные времена.
- Поведение кнопки «Добавить» на экране дня при отсутствии данных за день (там сейчас пустое состояние) — кнопка должна быть доступна и в пустом состоянии.
- Как показывать, что блюдо добавлено задним числом (метка/без метки).

### Deferred Ideas (OUT OF SCOPE)
- Набор приёмов / рацион на день целиком в избранное (D-03)
- Переименование/редактирование ингредиентов самого избранного (D-02)
- Редактирование даты/времени уже сохранённого приёма пищи
- Шаринг избранного между пользователями / подсказки «часто едите»
</user_constraints>

## Project Constraints (from CLAUDE.md)

- Отвечать пользователю на русском; весь пользовательский текст в UI и комментарии/доки — на русском (так же устроен существующий код).
- Паттерны кода (из CONTEXT/кода): Convex — одна функция на файл, `export default`, `logError`, `getAuthUserId` + проверка владельца; тема — `useThemedStyles` + `getColor(..., theme)`.
- Проект уже на OTA-обновлениях (фаза 67) и в TestFlight: **не добавлять новых нативных зависимостей** (см. раздел про пикер времени).

<phase_requirements>
## Phase Requirements

Идентификаторов требований в запросе не передано; в REQUIREMENTS.md для фазы 71 отдельных ID нет. Планировщик ссылается на D-01..D-10.

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01..D-05 | Избранное (таблица, звезда, меню «+», confirm-meal без ИИ) | разделы «Избранное», «Цепочка добавления» |
| D-06..D-08 | Дата с экрана дня, без будущего, выбор времени | разделы «Цепочка добавления», «Пикер времени», «Pitfalls» |
| D-09..D-10 | Поле `eatenAt`, бэкфилл, перевод всех чтений | разделы «Полный список мест `_creationTime`», «Схема и миграция» |
</phase_requirements>

## Summary

Источник истины о времени приёма пищи сейчас — только `_creationTime`. Проверено `grep` по `convex app components lib context zod scripts`: у таблицы `meals` его читают **9 серверных файлов** (11 мест чтения + 8 range-запросов по индексу) и **3 клиентских файла + 1 чистый модуль оценки глюкозы**. Все остальные потребители (HomeDaySelector, nutrients, index.tsx, streak.tsx, MealCompletionWatcher, calculateDayTotals) время приёма сами не читают — они опираются на раскладку по дням, которую делает сервер (`getWeekMeals`/`getMonthMeals`). Поэтому после перевода двух этих запросов Главная, Дневник и календарь серии починятся автоматически.

Рекомендуемая схема: `meals.eatenAt: v.optional(v.number())` + индекс `byUserIdAndEatenAt ["userId","eatenAt"]` (аналог уже существующего `glucoseReadings.byUserIdAndRecordedAt`). Миграция — штатная `@convex-dev/migrations@0.3.0` (уже подключена в `convex/convex.config.ts`, `convex/migrations.ts` содержит только каркас `migrations` + `run`, ни одной миграции пока нет). Порядок деплоя из двух шагов: (A) схема + запись `eatenAt` во всех insert + миграция-бэкфилл, прогнать до конца; (B) только потом переключать чтения на индекс по `eatenAt`. Чтения на шаге B обязаны быть уверены, что у всех строк поле заполнено, потому что range-запрос по индексу с отсутствующим полем строку не вернёт.

Цепочка добавления передаёт данные только через `router.replace/push` params (`describe` → `confirm-meal`, `camera` → `confirm-meal` либо `meal` для штрихкода). Параметр `date` (`YYYY-MM-DD`) нужно пробросить в 4 перехода; время приёма выбирается на `confirm-meal` и уходит в `confirmMeal` как `eatenAt` (ms). Режим избранного в `confirm-meal` уже наполовину «бесплатен»: `runDetection` и так выходит при отсутствии `photoUri` и `description`, нужно лишь не оставлять `isDetecting=true` и отдельно подставить ингредиенты — retry-логика «Connection lost» внутри `runDetection` при этом не затрагивается.

**Primary recommendation:** Ввести `eatenAt` (optional) + индекс, писать его во всех insert (default `Date.now()`), бэкфилл миграцией, затем перевести 9 серверных файлов на хелпер `getMealTime(meal) = meal.eatenAt ?? meal._creationTime` и индекс `byUserIdAndEatenAt`; избранное — отдельная таблица `favoriteMeals` со снимком ингредиентов, выбор через новый экран `(add)/favorites` и `confirm-meal?favoriteId=`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Источник истины времени приёма (`eatenAt`) | Database / Storage (Convex schema) | API / Backend | Все агрегаты (неделя, месяц, серия, отчёт, наблюдатель) считаются на сервере |
| Валидация даты (не будущее, число) | API / Backend (`confirmMeal`) | Browser / Client (UI блокирует кнопку) | Клиенту доверять нельзя (D-07) |
| Раскладка по локальным дням | Browser / Client считает границы, API раскладывает | — | Существующий контракт `dayStartsUtc` (DST решается на клиенте) |
| Выбор приёма/времени | Browser / Client (`confirm-meal`) | — | Чистый UI, результат — число `eatenAt` |
| Снимок избранного | API / Backend (читает свой `meals` и копирует `confirmedItems`) | — | Нельзя доверять ингредиентам, присланным клиентом |
| Список/удаление избранного | API / Backend + Client UI | — | Обычный CRUD по `userId` |
| Дефолтные времена слотов | Browser / Client | — | Нужны только для подстановки в UI |
| Напоминания | API / Backend (cron) | — | Переводятся на `eatenAt` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | ^1.27.3 (package.json) | БД, схема, индексы | Уже используется |
| @convex-dev/migrations | 0.3.0 (установлена, `node_modules/@convex-dev/migrations/package.json`) | Батчевый бэкфилл `eatenAt` | Уже подключен в `convex/convex.config.ts:6` (`app.use(migrations)`), `convex/migrations.ts` готов |
| convex-helpers | ^0.1.104 | `partial()` для `updateMeal` | Уже используется |
| expo-router | ~6.0.14 | Параметры маршрутов для проброса даты | Уже используется |
| date-fns | ^4.1.0 | `format`, `isAfter`, `startOfDay` на клиенте | Уже используется |

### Supporting (уже в проекте — переиспользовать)
| Component | Path | Purpose | When to Use |
|---------|---------|---------|-------------|
| `SegmentedControl` | `components/ui/SegmentedControl.tsx` (props: `options: string[]`, `selectedOption`, `onChange`) | Сегменты «Завтрак / Обед / Ужин / Другое» | Выбор слота на confirm-meal |
| `WheelPicker` | `components/ui/WheelPicker.tsx` (props: `data: string[]`, `initialValue`, `onValueChange`) | Часы и минуты для «Другое» | Две колонки рядом, как в `OnboardingBirthDate.tsx` |
| `BottomSheet` | `components/ui/BottomSheet.tsx` (gorhom, `Trigger` + `children`) | Меню выбора способа добавления на экране дня | Кнопка «+» в «Рационе» |
| `ScreenHeaderButton` / `ScreenHeaderActions` | `components/ui/screen/ScreenHeader.tsx` (строки 42, 85) | Звезда в шапке `Meal` | Рядом с «⋮» |
| `Card`, `Button`, `Text`, `Toast`, `WithSkeleton` | `components/ui/*` | Карточки списка избранного | Стиль приложения |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JS-пикер из `WheelPicker` | `@react-native-community/datetimepicker` | Нативный модуль → потребует нового нативного билда для TestFlight, ломает OTA (фаза 67); в `package.json` его нет [VERIFIED: grep package.json]. НЕ использовать |
| `eatenAt` optional навсегда | Сделать required после бэкфилла | Required даёт строгую типизацию, но требует ещё одного деплоя и ломает `partial(mealsFields)` не сильно; рекомендовано оставить optional в этой фазе, `tighten` — отдельным необязательным шагом |

**Installation:** новых пакетов не требуется (`npm install` не нужен).

**Version verification:** `@convex-dev/migrations` 0.3.0 — [VERIFIED: node_modules/@convex-dev/migrations/package.json]. API `migrations.define({ table, migrateOne })`, `runner()`, `dryRun`, `batchSize` — [VERIFIED: node_modules/@convex-dev/migrations/README.md].

## Package Legitimacy Audit

Фаза **не устанавливает внешних пакетов** — все зависимости уже в `package.json`/`node_modules`. Аудит не требуется.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Полный список мест, где `meals._creationTime` — время/дата приёма

[VERIFIED: grep -rn "_creationTime" convex app components lib context zod scripts]. Строки — на момент исследования.

### Сервер (`convex/**`) — обязательно перевести на `eatenAt`

| # | Файл | Строки | Что делает | Что менять |
|---|------|--------|-----------|-----------|
| 1 | `convex/meals/getWeekMeals.ts` | 28-29 (range), 37 (`getLocalWeekDayIndex`), 44 (sort) | Неделя Главной | Индекс `byUserIdAndEatenAt`, день и сортировка по `getMealTime(meal)` |
| 2 | `convex/meals/getMonthMeals.ts` | 28-29, 40, 47 | Месяц: Дневник, календарь серии | То же |
| 3 | `convex/home/getStreak.ts` | 22 (+ запрос 15-19 `order("desc")` по `byUserId`) | Серия | Запрос по `byUserIdAndEatenAt` `.order("desc")`, массив из `getMealTime`. **Порядок должен быть убывающий по eatenAt**, иначе `computeStreakFromMealTimes` сломается |
| 4 | `convex/utils/streakDays.ts` | вся функция | Чистая; принимает `number[]` desc | Менять не нужно (имя параметра `mealCreationTimesDesc` можно оставить) |
| 5 | `convex/observers/getPatientToday.ts` | 36-37 (range), 46 (sort), 97-100 (запрос done-meals для серии), 103 | «Сегодня» пациента + серия | Range → eatenAt; серия: индекс + `order("desc")` |
| 6 | `convex/observers/getPatientHistory.ts` | 28-29 (range), 59 (in-memory фильтр по дню) | История 30 дней | Range → eatenAt; фильтр `getMealTime(meal) >= startUtc && < endUtc` |
| 7 | `convex/observers/getObservedPatients.ts` | 71-72 | Сводка за сегодня по каждому пациенту | Range → eatenAt. Строки 54, 142-148 — это `link._creationTime` (таблица `observerLinks`), НЕ трогать |
| 8 | `convex/badges/checkAndAwardBadges.ts` | 25-29 (запрос), 33 | Серия для бейджей | Индекс + `order("desc")` + `getMealTime`. `mealCount` не зависит от времени |
| 9 | `convex/notifications/checkMealReminders.ts` | 56-57 (окно «уже поел»), 72 (серия), 66-70 (запрос done) | Напоминания | Окно — по `eatenAt` (так задним числом добавленный вчерашний ужин не подавляет сегодняшнее напоминание, D-09); серия — как в п.3 |
| 10 | `convex/reports/getMonthlyReport.ts` | 186-187 (range), 200 (`localDateOf`) | PDF/месячный отчёт | Range → eatenAt, день по `getMealTime`. Строки 269-270, 280 — давление, НЕ трогать |

Не meals, оставить как есть: `bloodPressure/*` (`_creationTime` — время замера), `observers/getMyObservers.ts:34`, `profiles`/`checkWeighInReminders.ts:40`, `observers/getPatientToday.ts:64-68` (давление).

Прочие серверные места, которые не читают время, но затрагиваются:
- `convex/meals/createMeal.ts:17` — insert, используется ТОЛЬКО штрихкодом (`analyzeMealBarcode.ts:29`). Добавить опциональный `eatenAt`, по умолчанию `Date.now()`.
- `convex/meals/confirmMeal.ts:43` — insert основного пути. Добавить опциональный `eatenAt` + валидация.
- `convex/meals/updateMeal.ts:8` и `updateMealInternal.ts:6-11` строят args из `mealsFields` через `partial(...)`. Новое поле в `mealsFields` автоматически станет **изменяемым клиентом** через публичную `updateMeal`. Обязательно деструктурировать `eatenAt` вместе с `userId, totalMacros, totalNutrients` в обоих файлах (иначе клиент сможет подменить дату мимо валидации «не будущее»).
- `convex/users/deleteUser.ts:18-42` — удаляет meals по `byUserId`; добавить удаление избранного и его фото.
- `convex/meals/getMeal.ts` — возвращает весь документ, время не читает. Менять не нужно.
- `processDetectedItems*`, `correctMeal`, `retryProcessDetectedItems`, `updateMealTotals` — время не используют, патчат существующий документ → `eatenAt` сохраняется.

### Клиент (`app/**`, `components/**`, `lib/**`)

| # | Файл | Строки | Что менять |
|---|------|--------|-----------|
| 1 | `components/home/HomeRecentlyLogged.tsx` | 133 (`format(meal._creationTime, "HH:mm")`) | `getMealTime(meal)`. Используется Главной, Дневником и экраном наблюдателя (`app/app/(settings)/observedPatient/[patientId].tsx:185`) |
| 2 | `components/charts/SugarByHourChart.tsx` | 44 (тип `Pick<..., "_creationTime">`), 98 (`getHours()`), 188 (`< hourEnd`) | Тип и оба чтения → `getMealTime` |
| 3 | `components/home/HomeGlucoseSummary.tsx` | 19 (`MealForChart = Pick<Doc<"meals">, "_id" \| "_creationTime" \| "totalNutrients">`) | Добавить `"eatenAt"` в Pick |
| 4 | `lib/nutrition/estimateGlucoseFromMeals.ts` | 33 (`EstimateMealInput._creationTime`), 141 (`now - meal._creationTime`) | Тип входа расширить (`_creationTime` + `eatenAt?`), использовать `getMealTime`. Модуль принципиально чистый (без импортов RN/Convex) — хелпер положить в чистый `lib/meals/getMealTime.ts` |
| 5 | `scripts/verifyGlucoseEstimate.ts` | 19 | Оставить совместимым (`_creationTime` присутствует) — проверка не должна сломаться |

Проверено, что время НЕ читают: `HomeDaySelector.tsx` (в CONTEXT назван, но `_creationTime` там нет — только ссылки на день недели), `app/(tabs)/index.tsx`, `app/(home)/nutrients.tsx`, `app/(home)/streak.tsx`, `lib/nutrition/calculateDayTotals.ts`, `MealCompletionWatcher.tsx` (см. pitfall 8). `bloodPressureLog.tsx`, `HomeBloodPressureSummary.tsx`, `BloodPressureLineChart.tsx` — давление, не трогать.

## Схема и миграция

### Схема (рекомендация)

```typescript
// convex/tables/meals.ts
export const mealsFields = {
  // ...существующие поля
  // Реальное время приёма пищи, мс UTC. Не заполнено только у строк, созданных
  // до фазы 71 (до завершения бэкфилла); читать через getMealTime().
  eatenAt: v.optional(v.number()),
};

export const meals = defineTable(mealsFields)
  .index("byUserId", ["userId"])
  .index("byUserIdAndEatenAt", ["userId", "eatenAt"]);
```

- Имя поля `eatenAt` и имя индекса `byUserIdAndEatenAt` согласованы с `glucoseReadings.byUserIdAndRecordedAt` (`convex/tables/glucoseReadings.ts`). Индекс `byUserId` оставить (его использует `deleteUser`).
- Convex автоматически добавляет `_creationTime` последней колонкой индекса — порядок при равных `eatenAt` стабилен [CITED: docs.convex.dev/database/reading-data/indexes].
- Range-запрос: `.withIndex("byUserIdAndEatenAt", q => q.eq("userId", userId).gte("eatenAt", start).lt("eatenAt", end))` — правило «eq-поля по порядку, затем gte/lt на следующем» соблюдено [CITED: docs.convex.dev/database/reading-data/indexes].

### Хелпер

```typescript
// lib/meals/getMealTime.ts — чистый, без импортов RN/Convex (импортируется и сервером, и клиентом, и ts-node)
export function getMealTime(meal: { _creationTime: number; eatenAt?: number }): number {
  return meal.eatenAt ?? meal._creationTime;
}
```

Сервер уже импортирует из `@/lib/...` (`getWeekMeals.ts` → `@/lib/utils/logError`, `checkAndAwardBadges.ts` → `@/lib/badges/badgeDefinitions`), так что путь допустим.

### Миграция (порядок деплоя — критично)

Range-запрос по индексу, где поле отсутствует, строку, вероятно, не вернёт (отсутствующее поле индексируется как `undefined`, который сортируется ниже чисел; официальные доки это явно не описывают — [ASSUMED], A1). Поэтому читать из `eatenAt` можно только когда бэкфилл завершён.

1. **Деплой A (безопасный для старых билдов):** схема (`eatenAt` optional + индекс), `confirmMeal`/`createMeal` пишут `eatenAt = args.eatenAt ?? Date.now()`, миграция, хелпер. Чтения ещё на `_creationTime`.
2. **Бэкфилл:** в `convex/migrations.ts`:

```typescript
// Source: node_modules/@convex-dev/migrations/README.md
export const backfillMealEatenAt = migrations.define({
  table: "meals",
  migrateOne: (_ctx, meal) => {
    if (meal.eatenAt === undefined) return { eatenAt: meal._creationTime };
  },
});
```
   Запуск (из комментария в `convex/migrations.ts`): `npx convex run migrations:run '{"fn": "migrations:backfillMealEatenAt"}'`, статус `npx convex run --component migrations lib:getStatus --watch`; сначала `dryRun: true` (README, раздел «Test a migration with dryRun»). Запускать и на dev, и на prod.
3. **Проверка полноты (checkpoint, ручной):** убедиться, что нет строк без `eatenAt` (например, временная `internalQuery`, считающая `meals` где `eatenAt === undefined`, ожидание 0).
4. **Деплой B:** перевод всех 9 серверных файлов на `byUserIdAndEatenAt`/`getMealTime`.
5. **(Необязательно, отдельно)** `tighten`: сделать `eatenAt` required, когда на prod нет строк без поля. Не блокирует фазу.

Совместимость со старыми билдами TestFlight/OTA:
- Старый клиент зовёт `confirmMeal` без `eatenAt` → сервер ставит `Date.now()`. Ничего не ломается.
- Старый клиент группирует по дням на сервере (корректно), но показывает метку «HH:mm» по `_creationTime` — у задним числом добавленных блюд метка будет временем создания. Косметика, только для добавленных через новый билд; допустимо.
- Новый клиент к старому бэкенду: передача лишнего аргумента `eatenAt` приведёт к ошибке валидации — деплой Convex всегда раньше клиентского релиза (стандарт).
- Хранить `getMealTime` fallback **постоянно** (дёшево, защищает от гонок).

## Цепочка добавления: как есть и как менять

Текущие переходы [VERIFIED: чтение файлов]:
- `components/tabs/TabsAddOptions.tsx:144-167` `handleOptionPress`: Pro-гейт (`option.isPro && !hasProAccess` → paywall), AI-лимит (`option.isAiFeature && !status.ok` → Toast), затем `router.push(option.href)` (на Android — через `setTimeout 200`). Опции — массив `baseOptions` (стр. 71-86), «Сахар»/«Давление» добавляются для `goalTrack === "glucometer"` (стр. 123-126). Сетка: `flexWrap`, `itemWidth` считается на 2 колонки; **3 карточки дадут неполный второй ряд** — это приемлемо (Описать, Сканировать / Избранное).
- `app/app/(add)/describe.tsx:44` → `router.replace({ pathname: "/app/(meal)/confirm-meal", params: { description } })`.
- `app/app/(add)/camera.tsx`: фото (стр. 77-80) и галерея (стр. 110-113) → `confirm-meal` с `{ photoUri, source }`; штрихкод (стр. 126-129) → `/app/(meal)/meal` с `{ barcode, source: "camera" }`.
- `app/app/(meal)/meal.tsx:56-72`: штрихкод → `analyzeMealBarcode` (action) → `ctx.runMutation(api.meals.createMeal.default, { status: "processing" })` (`analyzeMealBarcode.ts:29`). **Экрана подтверждения нет** → выбора времени нет.
- `app/app/(meal)/confirm-meal.tsx:79-176` `runDetection`, `:178-208` `handleConfirm` (после успеха `setConfirmed(true); router.replace("/app")`), `:210-220` `usePreventRemove`.

### (a) Проброс даты

- Параметр маршрута: `date: "YYYY-MM-DD"` (локальная дата, совпадает с форматом `[date].tsx`). Пробросить в: `describe` (читать `useLocalSearchParams`, добавить в `params` replace на стр. 44), `camera` (3 перехода), `meal` (для штрихкода), `favorites`, `confirm-meal`.
- Логику `parseDayParam` из `app/app/(home)/day/[date].tsx:28-48` вынести в общий `lib/utils/parseLocalDate.ts` (она локальна в файле и нужна ещё в `confirm-meal` для вычисления `eatenAt`). Валидация «не в будущем» и там, и на сервере.
- На `confirm-meal`: если `date` задан и это **не сегодня** → показать блок «Время приёма». Если `date` — сегодня или не задан → поле не показывать и `eatenAt` не передавать (сервер ставит `Date.now()`, поведение как сейчас).
- Штрихкод: нет confirm-экрана → передавать клиентом `eatenAt` по умолчанию (дефолт слота «Обед» или «текущее время суток» на целевой дате) аргументом `analyzeMealBarcode` → `createMeal`. Это Claude's Discretion; минимально безопасно — принять опциональный `eatenAt` в `analyzeMealBarcode`/`createMeal` и в `meal.tsx` вычислять дефолт; либо не показывать штрихкод при backfill (решает планировщик, см. Open Questions).
- Как открыть меню с датой с экрана дня: меню «+» живёт в `Tabs` (`app/app/(tabs)/_layout.tsx:107`, `tabBarButton: () => <TabsAddOptions />`) и параметров не получает. Рекомендация: вынести массив опций и обработчик `handleOptionPress` в общий модуль (`components/tabs/addOptions.ts(x)` / хук `useAddOptionPress(date?)`) и рендерить на экране дня в `BottomSheet` (уже есть, `components/ui/BottomSheet.tsx`) ту же сетку карточек. Гейтинг Pro/ИИ-лимит переиспользуется как есть.

### (b) confirm-meal с готовыми ингредиентами (избранное)

Факты: `runDetection` (стр. 79) начинается с `if (startedRef.current || (!photoUri && !description)) return;` — то есть без `photoUri` и `description` детекция **уже не запускается**; но `isDetecting` инициализируется `true` (стр. 71) и кнопка «Подтвердить» disabled при `isDetecting` (стр. 262). Значит:

1. Новый параметр `favoriteId?: string`. `const favorite = useQuery(api.favorites.getFavorite.default, favoriteId ? { favoriteId } : "skip")`.
2. `const [isDetecting, setIsDetecting] = useState(!favoriteId)`; отдельный `useEffect`, который **один раз** (ref-guard, чтобы реактивное обновление запроса не затёрло правки граммов пользователем) делает `setItems(favorite.items.map(i => ({ id: uuidv4(), name: i.nameRu ?? i.name, searchName: i.name, grams: i.grams })))`, `setMealName(favorite.name)`, `setPhotoStorageId(favorite.photoStorageId)`, `setIsDetecting(false)`. Маппинг идентичен тому, что `handleConfirm` отправляет обратно (`name: searchName ?? name, nameRu: name`, стр. 195-199).
3. Фото: у избранного нет локального `photoUri`; сервер возвращает `photoUrl` (через `ctx.storage.getUrl`, как `getWeekMeals.ts:51-58`), `confirm-meal` рисует `<Image source={{ uri: favorite.photoUrl }}>` (сейчас карточка фото условна по `photoUri`, стр. 227).
4. **Retry «Connection lost» не затронуть:** `isTransientConnectionError` и цикл `DETECTION_MAX_ATTEMPTS` находятся целиком внутри `runDetection` и дальше выполнения не доходят в режиме избранного. Не менять сигнатуру/зависимости `runDetection` кроме добавления `date`/`eatenAt`, не менять `startedRef`. Не вызывать `runDetection` для favorite.
5. `description` в `confirmMeal` для избранного не передавать (undefined).
6. `handleConfirm` добавляет `eatenAt` (только если backfill): `Date.now()`-дефолт серверный.
7. После успеха при backfill: `router.replace` на день (`{ pathname: "/app/(home)/day/[date]", params: { date } }`), а не `"/app"`, иначе пользователь не увидит добавленное (см. pitfall 8). Для обычного пути оставить `"/app"`.

### confirmMeal (сервер)

```typescript
// Добавить в args: eatenAt: v.optional(v.number())
const now = Date.now();
const MAX_CLOCK_SKEW_MS = 5 * 60_000;
let eatenAt = now;
if (args.eatenAt !== undefined) {
  if (!Number.isFinite(args.eatenAt) || args.eatenAt <= 0 || args.eatenAt > now + MAX_CLOCK_SKEW_MS) {
    throw new Error("Invalid eatenAt");
  }
  eatenAt = args.eatenAt;
}
// в insert добавить eatenAt
```
Вынести проверку в чистый `convex/utils/resolveEatenAt.ts` (по образцу `localWeekBounds.ts` — без импортов Convex, чтобы тестировать через ts-node). Ограничение глубины в прошлое не вводить (D-07), только `> 0` и конечное число.

## Избранное: данные и UI

### Таблица

```typescript
// convex/tables/favoriteMeals.ts (подключить в convex/schema.ts)
export const favoriteMealsFields = {
  userId: v.id("users"),
  name: v.string(),
  items: v.array(v.object({ name: v.string(), nameRu: v.optional(v.string()), grams: v.number() })),
  photoStorageId: v.optional(v.id("_storage")),
  sourceMealId: v.optional(v.id("meals")), // только ключ дедупа/«уже в избранном», не зависимость
};
export const favoriteMeals = defineTable(favoriteMealsFields)
  .index("byUserId", ["userId"])
  .index("byUserIdAndSourceMealId", ["userId", "sourceMealId"]);
```

Функции (`convex/favorites/*.ts`, одна на файл, `export default`, `logError`, `getAuthUserId`, проверка владельца как в `getMeal.ts`):
- `addFavoriteFromMeal({ mealId })` — читает **собственный** `meals` по `mealId`, проверяет `userId`, берёт `meal.name`, `meal.confirmedItems`, `meal.photoStorageId` (клиенту ингредиенты не доверять, D-01 снимок). Ошибка, если нет `confirmedItems` или статус `deleted`/`error`. Идемпотентна: если уже есть запись по `byUserIdAndSourceMealId`, вернуть её id. Лимит, например, 50 на пользователя (дискреция) — отказ с понятной ошибкой.
- `removeFavorite({ favoriteId })` — проверка владельца, `ctx.db.delete`. Файл в storage НЕ удалять (см. ниже).
- `listFavorites` — `byUserId`, `order("desc")`, с `photoUrl` через `ctx.storage.getUrl`.
- `getFavorite({ favoriteId })` — для `confirm-meal` (владелец + `photoUrl`).
- `getMealFavorite({ mealId })` — вернуть `favoriteId | null` по `byUserIdAndSourceMealId`; `meal.tsx` подписывается на него для состояния звезды. Реактивно, обновляется после add/remove.

Известное ограничение: блюдо, созданное из избранного, — новый `meals` без связи с избранным; звезда на нём покажет «не в избранном», и повторное добавление создаст дубль. Смягчение (дискреция): в `addFavoriteFromMeal` дополнительно дедупить по совпадению нормализованного `name` + набора `(name, grams)` среди ≤50 записей пользователя. Это дёшево.

### Жизненный цикл фото

[VERIFIED: grep] В коде `ctx.storage.delete` вызывается **только** в `convex/users/deleteUser.ts:36-38`; удаление блюда в UI — мягкое (`updateMeal` `status: "deleted"`, `Meal.tsx:handleDelete`), файл остаётся. Следовательно: избранное хранит тот же `photoStorageId` без копирования; удаление исходного блюда его не ломает (D-01). При `removeFavorite` файл не удалять (на него могут ссылаться блюда, созданные из избранного). В `deleteUser` добавить: удалить `favoriteMeals` пользователя; при удалении файлов собирать `Set` уже удалённых `storageId` (общий id у meals и favorites и у блюд, созданных из избранного) и оборачивать `ctx.storage.delete` в try/catch — поведение повторного удаления несуществующего id не проверялось [ASSUMED], A3.

### UI

- Звезда: в `components/meal/Meal.tsx` (шапка, стр. 128-142) добавить `ScreenHeaderButton` со звездой (lucide `StarIcon`, заливка при favorited) рядом с `ScreenHeaderActions`; либо пункт в popover-опциях (`options` на стр. 132-139 — `PopoverOption` с `Icon/text/onPress`). `meal.tsx` (экран) уже имеет `data.meal`; передать в `Meal` новые props `isFavorite`, `onToggleFavorite`, `canFavorite` (= `meal.confirmedItems?.length > 0` и статус `done`). Блюда, созданные штрихкодом, не имеют `confirmedItems` (`createMeal` их не пишет, `analyzeMealBarcode.ts`) → звезду скрывать.
- Пункт меню: в `TabsAddOptions` добавить `favoritesOption: { label: "Избранное", icon: StarIcon, href: "/app/(add)/favorites", isPro: false, isAiFeature: false }`. Гейтинг: `isPro:false`, `isAiFeature:false` (избранное не вызывает ИИ-детекцию и не тратит `aiFeatures`; `confirmMeal` лимит не списывает [VERIFIED: confirmMeal.ts, rate limiter используется в `retryProcessDetectedItems`/`detect*`]). Пункт доступен всем; фоновый `processDetectedItemsAction` использует LLM для подбора, но это уже так для любого пути confirm.
- Экран `app/app/(add)/favorites.tsx`: список карточек (стиль `MealCard`/`Card`), пустое состояние текстом на русском, удаление (свайп/кнопка корзины с `AlertDialog` — компонент есть), выбор → `router.replace({ pathname: "/app/(meal)/confirm-meal", params: { favoriteId, date? } })`. Зарегистрировать в `app/app/_layout.tsx` по аналогии с остальными `(add)`-экранами (проверить при реализации, как зарегистрированы `describe`/`glucose`).

## Пикер времени (D-08)

- Нативного date/time-пикера в проекте нет (`package.json`: ни `datetimepicker`, ни аналогов; есть `react-native-calendars`, `@gorhom/bottom-sheet`). Использовать JS: `SegmentedControl` (`["Завтрак","Обед","Ужин","Другое"]`) + при «Другое» две `WheelPicker` (часы `"00".."23"`, минуты `"00".."59"`) в `View` с `flexDirection: "row"` — паттерн из `components/onboarding/steps/basics/OnboardingBirthDate.tsx:65-82`.
- Известное ограничение `WheelPicker`: значение отдаётся только в `onMomentumScrollEnd` (после остановки прокрутки), `initialValue` ищется по `data.indexOf` — передавать строки совпадающего формата.
- Дефолтные времена: взять часы из `lib/notifications/reminderSchedule.ts` `MEAL_REMINDER_POINTS` (завтрак 9, обед 14, ужин 20) для согласованности — [VERIFIED: файл]. Дефолтный слот — «Ужин» (сценарий «забыл записать ужин»); решение за планировщиком.
- Сборка `eatenAt`: `new Date(y, m - 1, d, hour, minute).getTime()` по локальным компонентам (как в `getLocalWeekBounds.ts`, это корректно разрешает DST). Для прошедших дней всегда ≤ now, проблем нет.
- Метка «добавлено задним числом» — дискреция; дешёво выводится сравнением дня `eatenAt` с днём `_creationTime`, но отдельное поле не нужно.

## Architecture Patterns

### System Architecture Diagram

```
 Экран дня [date].tsx ──(+ «Рацион», не будущее)──> BottomSheet/сетка опций (общий модуль с TabsAddOptions)
 Меню «+» (TabsAddOptions, без даты) ───────────────────────────────┐
        │ Описать        │ Сканировать          │ Избранное        │
        v                v                      v                  │
   describe(date?)   camera(date?)          favorites(date?)       │
        │              │      │ штрихкод            │ выбор          │
        │              │      └> meal?barcode&date  │                │
        └──> confirm-meal ?description|photoUri|favoriteId & date
                │  [ИИ-детекция | подстановка избранного]  + выбор времени если date != сегодня
                v
           confirmMeal(items, eatenAt?) ──валидация: число, <= now+5мин──> insert meals{eatenAt}
                │                                                   │
                v                                                   v
   scheduler → processDetectedItemsAction → КБЖУ, checkAndAwardBadges (серия по eatenAt)
                                                        │
   Чтение: byUserIdAndEatenAt ──> getWeekMeals / getMonthMeals ──> Главная, Дневник, календарь серии
                           ├─> getStreak / badges / reminders (desc по eatenAt)
                           ├─> getMonthlyReport
                           └─> observers: Today / History / ObservedPatients
```

### Recommended Project Structure
```
convex/
├── tables/favoriteMeals.ts      # новая таблица
├── favorites/{addFavoriteFromMeal,removeFavorite,listFavorites,getFavorite,getMealFavorite}.ts
├── utils/resolveEatenAt.ts      # чистая валидация (ts-node-проверяема)
└── migrations.ts                # + backfillMealEatenAt
lib/meals/getMealTime.ts         # чистый хелпер
lib/utils/parseLocalDate.ts      # вынесенный parseDayParam
lib/meals/mealSlots.ts           # слоты и дефолтные часы
app/app/(add)/favorites.tsx
components/tabs/addOptions.ts(x) # общий список опций + handler (меню «+» и экран дня)
```

### Anti-Patterns to Avoid
- Включать `eatenAt` в `updateMeal`/`updateMealInternal` args (клиент обойдёт проверку будущей даты).
- Читать по индексу `eatenAt` до завершения бэкфилла.
- Присылать ингредиенты избранного клиентом на сервер при добавлении в избранное — только снимок из своего `meals`.
- Сортировать серию по `_creationTime`: `computeStreakFromMealTimes` требует убывающий порядок по тому же времени, по которому считает дни.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Бэкфилл миграции | Ручной цикл в `internalMutation` | `@convex-dev/migrations` (`migrations.define`, `runner`) | Батчинг, возобновление, dryRun, статус |
| Локальные границы дней | Свой расчёт по `getTimezoneOffset()` | `getLocalWeekBounds`/`getLocalMonthBounds` + `getLocalWeekDayIndex`/`getLocalMonthDayIndex` | DST решён на клиенте; сервер лишь раскладывает |
| Выбор слота | Свой переключатель | `SegmentedControl` | Уже в теме приложения |
| Время (колонки часов/минут) | Нативный пикер | `WheelPicker` | Без нового нативного билда |
| Фото URL | Свой путь | `ctx.storage.getUrl` на сервере | Как в `getWeekMeals.ts` |

## Runtime State Inventory

Фаза не rename, но есть миграция данных:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Все строки `meals` на dev и prod без `eatenAt` | **Data migration** `backfillMealEatenAt` (`eatenAt = _creationTime`) + кодовая правка insert'ов (два разных шага) |
| Live service config | None — verified: фаза не трогает внешние сервисы | — |
| OS-registered state | None — verified: cron `convex/crons.ts` ссылается на `checkMealReminders` по имени функции, имя не меняется | — |
| Secrets/env vars | None — verified | — |
| Build artifacts | `convex/_generated/*` — перегенерируются `npx convex dev/codegen` после изменения схемы | Запустить codegen |

## Common Pitfalls

### Pitfall 1: Чтение по `eatenAt` до бэкфилла
**What goes wrong:** Старые приёмы пропадают из недели/месяца/серии. **Why:** отсутствующее поле не попадает в range. **How to avoid:** деплой A → миграция → проверка 0 строк без поля → деплой B (см. раздел «Миграция»). **Warning signs:** пустая Главная у существующих пользователей, серия 0.

### Pitfall 2: `updateMeal` делает `eatenAt` изменяемым
См. Anti-Patterns. Деструктурировать `eatenAt` из `mealsFields` в `updateMeal.ts:8` и `updateMealInternal.ts:6-11`.

### Pitfall 3: Порядок серии
`getStreak`, `getPatientToday`, `checkAndAwardBadges`, `checkMealReminders` берут все `done`-блюда `.order("desc")` по `byUserId` (т. е. по `_creationTime`). После перехода обязательно `withIndex("byUserIdAndEatenAt", q => q.eq("userId", ...)).order("desc")`, иначе задним числом добавленный вчерашний ужин (создан сегодня) окажется «первым» и серия посчитается неверно (`computeStreakFromMealTimes` возвращает 0, если первое по порядку блюдо не сегодня/вчера, и `break` при разрыве).

### Pitfall 4: Часовой пояс и день
Клиент строит `eatenAt` из локальных компонентов даты; сервер дни раскладывает по присланным `dayStartsUtc`, а серия/бейджи/напоминания — по `timezoneOffsetMinutes` (серверные фоновые задачи берут offset из последнего `pushTokens`, `checkAndAwardBadges.ts:19-22`, по умолчанию 0). Блюдо около полуночи при смене пояса может уйти на соседний день в серии — это существующее поведение, не ухудшается.

### Pitfall 5: Будущая дата
Сервер: `eatenAt > now + 5 мин` → ошибка. Клиент: кнопка «+» не показывается для даты > сегодня (маршрут `day/[date]` можно открыть вручную с будущей датой — `parseDayParam` его принимает, `maxDate` ограничен только календарём в `streak.tsx:150`), дополнительно проверять в `[date].tsx`.

### Pitfall 6: Пустое состояние `day/[date].tsx`
При `hasData === false` экран рисует только `EmptyState` (стр. 241-243 в текущем файле) без блока «Рацион» — кнопки добавления там нет. Нужно показать кнопку «Добавить» и в пустом состоянии. Кроме того, `HomeRecentlyLogged` при `meals.length === 0` рисует `HomeEmptyState` с `href="/app/(add)/describe"` **без даты** (`HomeRecentlyLogged.tsx:~215-219`) — на экране дня с глюкозой/движением, но без блюд, это добавило бы блюдо на сегодня. Нужно либо передавать `date` в `href`, либо в режиме добавления за день использовать общую кнопку «+». То же на Главной при выбранном прошлом дне недели (вне скоупа D-06, но стоит отметить).

### Pitfall 7: Наблюдатель
`getPatientToday` и `getObservedPatients` смотрят только «сегодня» (`localDayBoundaries(Date.now(), ...)`); задним числом добавленное блюдо на вчера туда не попадёт (правильно), в `getPatientHistory` (30 дней) попадёт после перевода на `eatenAt`. Блюдо старше 30 дней наблюдатель не увидит — штатное ограничение истории.

### Pitfall 8: `MealCompletionWatcher` и редирект
`MealCompletionWatcher` слушает `getWeekMeals` только **текущей недели**. Блюдо, добавленное в прошлую неделю, не вызовет тост «Блюдо распознано» (карточка на экране дня сама обновится реактивно через `getMonthMeals`). После `confirmMeal` в режиме backfill возвращать пользователя на экран дня, а не на `/app`. Если нужен тост — расширить watcher (необязательно).

### Pitfall 9: Оценка глюкозы
`estimateGlucoseFromMeals` считает «сейчас − время приёма» в окне `WINDOW_MINUTES`; для прошлых дней блюда вне окна — вклад 0 (корректно). На экране дня оценка и так не передаётся (`[date].tsx` комментарий). `SugarByHourChart` строит точки по часам `eatenAt` — после перевода график показывает реальное время.

### Pitfall 10: `deleteUser`
Добавить удаление `favoriteMeals`, иначе данные пользователя остаются после удаления аккаунта (требование приватности).

### Pitfall 11: Ключи React
`HomeRecentlyLogged` использует `key={`log-item-${index}-${meal.name}`}` — при переупорядочивании по `eatenAt` можно сменить на `meal._id`.

## Code Examples

### Range-чтение недели/месяца по `eatenAt`
```typescript
// Source: паттерн из convex/meals/getWeekMeals.ts, индекс по образцу glucoseReadings.byUserIdAndRecordedAt
const meals = await ctx.db
  .query("meals")
  .withIndex("byUserIdAndEatenAt", (idx) =>
    idx.eq("userId", userId).gte("eatenAt", weekStartUtc).lt("eatenAt", weekEndUtc)
  )
  .filter((q) => q.neq(q.field("status"), "deleted"))
  .collect();
// раскладка: getLocalWeekDayIndex(dayStartsUtc, getMealTime(meal)); sort: getMealTime(b) - getMealTime(a)
```

### Серия
```typescript
const meals = await ctx.db
  .query("meals")
  .withIndex("byUserIdAndEatenAt", (q) => q.eq("userId", userId))
  .order("desc")
  .filter((q) => q.eq(q.field("status"), "done"))
  .collect();
return computeStreakFromMealTimes(meals.map(getMealTime), Date.now(), timezoneOffsetMinutes ?? 0);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `_creationTime` = время приёма | явное `eatenAt` | эта фаза | Возможен ввод задним числом |
| Дата только «сейчас» | `date` param + выбор времени | эта фаза | Новый UI на `confirm-meal` |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Range-запрос по индексу не возвращает строки, где индексируемое optional-поле отсутствует (документация это прямо не описывает) | Схема и миграция | Если на самом деле возвращает, двухшаговый деплой избыточен, но безопасен; ошибки нет |
| A2 | `eq("eatenAt", undefined)` допустим в индексе (не используется в рекомендации) | — | Нет, рекомендация обходится без него |
| A3 | Повторный `ctx.storage.delete` несуществующего id может бросать исключение | Избранное / фото | Без try/catch `deleteUser` может упасть на общем `storageId`; защита (Set + try/catch) покрывает оба случая |
| A4 | Дефолтные часы слотов 9/14/20 (по `MEAL_REMINDER_POINTS`) устраивают пользователя | Пикер времени | Только UX, правится константами |
| A5 | Лимит 50 избранных на пользователя | Избранное | Дискреция, необязательно |
| A6 | Допуск часов «+5 минут» для будущего времени достаточен | confirmMeal | Ложные отказы при сильном рассинхроне часов телефона; можно увеличить |

## Open Questions

1. **Штрихкод при backfill**
   - Известно: путь штрихкода идёт `camera` → `meal` → `analyzeMealBarcode` → `createMeal`, экрана подтверждения нет.
   - Неясно: поддерживать ли дату для штрихкода в этой фазе (D-06 перечисляет «описать / сканировать / из избранного»).
   - Рекомендация: пробросить `date` и передавать `eatenAt` (дефолт — текущее время суток на целевой дате, но не позже now) в `analyzeMealBarcode`/`createMeal` (оба опциональные), без пикера времени.

2. **Звезда для блюд без `confirmedItems`** (штрихкод) — рекомендация: скрывать.

3. **Метка «добавлено задним числом»** — рекомендация: без метки в этой фазе.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node / npm | tsc, eslint, ts-node | ✓ (скрипты в package.json) | — | — |
| Convex CLI (`npx convex`) | codegen, запуск миграции | требует доступ к dev/prod-деплою (не проверялось в сессии) | — | Ручной запуск через Convex dashboard |
| `@convex-dev/migrations` | бэкфилл | ✓ | 0.3.0 | — |

Блокирующих отсутствующих зависимостей нет; запуск миграции на prod — ручной шаг пользователя.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Автотестов UI нет; есть ad-hoc ts-node verify-скрипты (`scripts/verify*.ts`) + `tsc` + `eslint` |
| Config file | `tsconfig.json`, `eslint.config.mjs` |
| Quick run command | `npm run tsc` |
| Full suite command | `npm run tsc && npm run lint && npm run script:verifyStreakDays` (скрипт `verifyStreakDays.ts` существует в `scripts/`, проверить наличие записи в `package.json` при реализации) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-10 | `getMealTime` fallback, `resolveEatenAt` отклоняет будущее/NaN/<=0 | ts-node unit | новый `scripts/verifyEatenAt.ts` (+ npm-скрипт, `TZ=Europe/Berlin`) | ❌ Wave 0 |
| D-09 | Серия по `eatenAt` с задним числом | ts-node | расширить `scripts/verifyStreakDays.ts` | ✅ (расширить) |
| D-09 | Глюкоза не ломается | ts-node | `npm run script:verifyGlucoseEstimate` | ✅ |
| D-09 | Раскладка по неделе/месяцу | ts-node | `npm run script:verifyWeekBucketing`, `script:verifyMonthBucketing` | ✅ |
| D-09 | Окна напоминаний | ts-node | `npm run script:verifyMealReminderWindows` | ✅ |
| D-10 | Полнота бэкфилла | ручной/dashboard | internalQuery «строк без eatenAt = 0» | ❌ Wave 0 |
| D-01/D-02/D-04/D-05 | Избранное end-to-end | manual (устройство) | — | — |
| D-06/D-07/D-08 | Backfill с экрана дня, время, будущая дата | manual (устройство) | — | — |

Проверяется статически: `npm run tsc` (типы Doc после codegen, все чтения `getMealTime`), `npm run lint`, `grep -rn "_creationTime" convex app components lib` — остаться должны только `bloodPressure`, `observerLinks`, `profiles`, `getMealTime.ts`, миграция; `npx convex codegen`/`convex dev` — валидность схемы и индекса.

Только на устройстве: звезда ↔ список, выбор из избранного и правка граммов, добавление за вчера (все три пути), порядок карточек по времени, серия/месячный отчёт, наблюдатель, поведение на старом билде, пустое состояние дня, будущая дата, тёмная тема, «Connection lost» (режим самолёта во время детекции — убедиться, что retry жив).

### Sampling Rate
- **Per task commit:** `npm run tsc`
- **Per wave merge:** `npm run tsc && npm run lint` + затронутые verify-скрипты
- **Phase gate:** всё выше зелёное + ручной чеклист устройства

### Wave 0 Gaps
- [ ] `scripts/verifyEatenAt.ts` — `getMealTime`, `resolveEatenAt`
- [ ] npm-скрипт для него в `package.json`
- [ ] Временная internalQuery проверки бэкфилла

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (используется существующий `getAuthUserId`) | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | `getAuthUserId` + сверка `userId` владельца в каждой функции избранного (как `getMeal.ts`); `eatenAt` вне `updateMeal` |
| V5 Input Validation | yes | `v.*` валидаторы Convex + `resolveEatenAt`; лимиты длины имени/числа ингредиентов/граммов (как `confirmMeal`: 30 ингредиентов, 1..1500 г) |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Подмена даты в будущее / мусорное число | Tampering | Серверная валидация `eatenAt`; исключение из `updateMeal` |
| Чужое `favoriteId` / `mealId` (IDOR) | Information disclosure | Проверка `doc.userId === userId` |
| Подмена ингредиентов при добавлении в избранное | Tampering | Снимок из собственного `meals` на сервере |
| Раздувание таблицы избранного | DoS | Лимит записей на пользователя |
| Утечка фото между пользователями | Information disclosure | `photoUrl` только в функциях владельца |

## Sources

### Primary (HIGH confidence)
- Код репозитория (все пути выше), прочитан в сессии: `convex/**`, `app/**`, `components/**`, `lib/**`
- `node_modules/@convex-dev/migrations/README.md`, `package.json` (v0.3.0)
- https://docs.convex.dev/database/reading-data/indexes/ — правила range-выражений индекса, `_creationTime` как последняя колонка

### Secondary (MEDIUM)
- Поведение отсутствующих optional-полей в индексе — не подтверждено официальной документацией (A1)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — всё уже в проекте
- Карта `_creationTime`: HIGH — получена grep'ом по всему коду
- Архитектура/миграция: MEDIUM-HIGH — безопасна независимо от A1
- Pitfalls: HIGH — выведены из чтения кода

**Research date:** 2026-10-08
**Valid until:** 30 дней (кодовая база меняется между фазами; перепроверить grep перед стартом)

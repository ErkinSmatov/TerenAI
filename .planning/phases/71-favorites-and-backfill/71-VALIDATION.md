---
phase: 71
slug: favorites-and-backfill
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-08
---

# Phase 71 — Validation Strategy

> Контракт валидации для обратной связи во время выполнения. Автотестов UI в проекте нет; проверка — статический анализ, `ts-node` verify-скрипты для чистой логики и ручные проверки на устройстве.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | ts-node + node:assert (скрипты `scripts/verify*.ts`), `tsc`, `eslint`, `convex codegen` |
| **Config file** | none — отдельного test-runner нет |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && npx eslint . && npx convex codegen && npm run script:verifyStreakDays && npm run script:verifyWeekBucketing && npm run script:verifyMonthBucketing && npm run script:verifyMealReminderWindows && npm run script:verifyBadgeThresholds && npm run script:verifyGlucoseEstimate` |
| **Estimated runtime** | ~90 секунд |

> `eslint .` допускает только 6 известных ошибок (confirm-meal.tsx ×5, confirm-phone.tsx ×1) — новых быть не должно.

---

## Sampling Rate

- **После каждого коммита задачи:** `npx tsc --noEmit` (+ `npx eslint` по изменённым файлам)
- **После каждой волны:** полная команда выше
- **Перед `/gsd:verify-work`:** полная команда зелёная + ручные проверки пройдены
- **Max feedback latency:** ~90 секунд

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Решения | Проверка | Automated Command | Статус |
|---------|------|------|---------|----------|-------------------|--------|
| 71-01-01 | 01 | 1 | D-07, D-08, D-10 | ts-node unit (Wave 0) | `npm run script:verifyEatenAt && npx tsc --noEmit` | ⬜ |
| 71-01-02 | 01 | 1 | D-07, D-10 | grep + типы | `npx convex codegen && npx tsc --noEmit` + grep `byUserIdAndEatenAt`, `resolveEatenAt(`, `eatenAt` в updateMeal | ⬜ |
| 71-01-03 | 01 | 1 | D-10 | grep + codegen (Wave 0: internalQuery) | `npx convex codegen && npx tsc --noEmit` + grep `backfillMealEatenAt` | ⬜ |
| 71-02-01 | 02 | 1 | D-01, D-02 | grep + типы | `npx convex codegen && npx tsc --noEmit && npx eslint convex/favorites` | ⬜ |
| 71-02-02 | 02 | 1 | D-02, D-05 | grep + типы | `npx convex codegen && npx tsc --noEmit` | ⬜ |
| 71-02-03 | 02 | 1 | D-01 (приватность) | grep | `npx tsc --noEmit` + grep `favoriteMeals`, `new Set` в deleteUser | ⬜ |
| 71-03-01 | 03 | 2 | D-10 | CLI dev | `npx convex run meals/countMealsWithoutEatenAt '{}'` → missing = 0 | ⬜ |
| 71-03-02 | 03 | 2 | D-10 | human-action (prod) | resume-signal «prod: missing=0» | ⬜ |
| 71-04-01 | 04 | 3 | D-09 | ts-node + grep | `npm run script:verifyWeekBucketing && npm run script:verifyMonthBucketing && npm run script:verifyMealReminderWindows && npm run script:verifyBadgeThresholds` + grep `_creationTime` == 0 | ⬜ |
| 71-04-02 | 04 | 3 | D-09 | grep + типы | `npx tsc --noEmit` + grep остатка `_creationTime` (только давление/link) | ⬜ |
| 71-04-03 | 04 | 3 | D-09 | ts-node | `npm run script:verifyStreakDays && npm run script:verifyGlucoseEstimate` | ⬜ |
| 71-05-01 | 05 | 2 | D-02, D-04 | grep + типы | `npx tsc --noEmit` + grep `api.favorites.*` в meal.tsx, `/app/(add)/favorites` в TabsAddOptions | ⬜ |
| 71-05-02 | 05 | 2 | D-02, D-05 | grep + типы | `npx tsc --noEmit && npx eslint "app/app/(add)/favorites.tsx"` | ⬜ |
| 71-05-03 | 05 | 2 | D-05 | grep + eslint baseline | `npx tsc --noEmit` + eslint confirm-meal.tsx ≤ 5 ошибок + grep `isTransientConnectionError` == 2 | ⬜ |
| 71-06-01 | 06 | 3 | D-06, D-07 | grep + типы | `npx tsc --noEmit` + grep `resolveAddDate` в 4 экранах | ⬜ |
| 71-06-02 | 06 | 3 | D-08 | grep + ts-node | `npx tsc --noEmit && npm run script:verifyEatenAt` + grep `buildEatenAt`, `dismissTo` | ⬜ |
| 71-07-01 | 07 | 4 | D-04, D-06 | grep + типы | `npx tsc --noEmit && npx eslint components/tabs` | ⬜ |
| 71-07-02 | 07 | 4 | D-06, D-07 | grep + типы | `npx tsc --noEmit` + grep `isFutureLocalDay`, `onAddPress`, `DayAddMealSheet` | ⬜ |
| 71-08-01 | 08 | 5 | все | полный прогон | Full suite command + `npm run script:verifyEatenAt` + аудит `_creationTime` | ⬜ |
| 71-08-02 | 08 | 5 | D-01..D-09 | human-verify (устройство) | чеклист 10 пунктов | ⬜ |
| 71-08-03 | 08 | 5 | D-10 | human-action (prod) | resume-signal «prod deployed» | ⬜ |

Нет 3 подряд задач без автоматической проверки: ручные задачи (71-03-02, 71-08-02, 71-08-03) окружены задачами с CLI/ts-node проверками.

---

## Wave 0 Requirements

- [ ] `scripts/verifyEatenAt.ts` + npm-скрипт `script:verifyEatenAt` — чистая логика `getMealTime` / `resolveEatenAt` / `parseLocalDate` / `mealSlots` (план 71-01, задача 1)
- [ ] Временная internalQuery `convex/meals/countMealsWithoutEatenAt.ts` — проверка полноты бэкфилла между деплоями A и B (план 71-01, задача 3)

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|-----------|-------------------|
| Добавление еды за прошлую дату (кнопка на экране дня, выбор приёма/времени) | UI + навигация | Открыть прошлый день из календаря → «+» → описать/скан/избранное → выбрать время → блюдо в «Рационе» этого дня в нужном порядке |
| Серия/отчёт/бейджи/наблюдатель по реальной дате | Данные на устройстве | Добавить ужин за вчера → серия обновилась, блюдо в истории наблюдателя на вчерашней дате |
| Избранное: звезда, список, выбор, удаление | UI | Звезда на экране блюда → «Избранное» в меню «+» → подтверждение с готовыми ингредиентами без ИИ → удаление из списка |
| Устойчивость к обрыву связи в режиме избранного | Сеть | Режим самолёта во время подтверждения/детекции — нет потери данных, ошибки корректны |
| Порядок деплоя A→B→C бэкфилла | Прод-окружение | Деплой схемы → миграция → проверка «0 строк без eatenAt» → деплой переключения чтений |

---

## Validation Sign-Off

- [x] У всех задач есть `<automated>` проверка или зависимость от Wave 0
- [x] Нет 3 подряд задач без автоматической проверки
- [x] Wave 0 покрывает все отсутствующие ссылки
- [x] Нет watch-режимов
- [x] Latency < 90 с
- [x] `nyquist_compliant: true` в frontmatter

**Approval:** pending

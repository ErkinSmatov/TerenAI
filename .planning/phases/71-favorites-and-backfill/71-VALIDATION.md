---
phase: 71
slug: favorites-and-backfill
status: draft
nyquist_compliant: false
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

Заполняется планировщиком по задачам планов (автоматические критерии — grep по `_creationTime`, наличие индекса/поля, verify-скрипты). Новые скрипты: `scripts/verifyEatenAt.ts` (`getMealTime`, `resolveEatenAt`: будущая дата отклоняется, fallback на `_creationTime`).

---

## Wave 0 Requirements

- [ ] `scripts/verifyEatenAt.ts` + npm-скрипт `script:verifyEatenAt` — чистая логика `getMealTime` / `resolveEatenAt`
- [ ] Временная internalQuery «число meals без eatenAt» — проверка полноты бэкфилла между деплоями A и B

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

- [ ] У всех задач есть `<automated>` проверка или зависимость от Wave 0
- [ ] Нет 3 подряд задач без автоматической проверки
- [ ] Wave 0 покрывает все отсутствующие ссылки
- [ ] Нет watch-режимов
- [ ] Latency < 90 с
- [ ] `nyquist_compliant: true` в frontmatter

**Approval:** pending

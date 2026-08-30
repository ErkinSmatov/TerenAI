---
phase: 69-onboarding-gamification
plan: 01
subsystem: notifications+gamification+database
tags: [convex, schema, expo-notifications, badges, reminders, ts-node, pure-functions]

requires: []
provides:
  - "Чистая (без convex/react/react-native) логика расписания напоминаний: `lib/notifications/reminderSchedule.ts`"
  - "Чистая логика порогов и идемпотентного начисления бейджей: `lib/badges/badgeDefinitions.ts`"
  - "Convex-таблицы `pushTokens` и `badges`, зарегистрированные в схеме"
  - "5 опциональных полей профиля для напоминаний (weightUpdatedAt, weighInRemindersEnabled, mealRemindersEnabled, lastWeighInReminderSentAt, lastMealReminderSentAt)"
  - "3 verify-скрипта (node:assert/strict, ts-node) и соответствующие npm-скрипты"
affects: [69-03, 69-04, 69-06, 69-07]

tech-stack:
  added: []
  patterns:
    - "Чистые доменные модули без импортов convex/react/react-native — единственный тестируемый слой в проекте без test harness для Convex-действий и cron"
    - "verify-скрипты по эталону scripts/verifyWeekBucketing.ts / verifyGlucoseEstimate.ts: node:assert/strict + финальный console.log(\"...: OK\")"
    - "Соглашение о часовом поясе (localMs = utcMs - timezoneOffsetMinutes * 60_000) повторено из convex/home/getStreak.ts"

key-files:
  created:
    - lib/notifications/reminderSchedule.ts
    - lib/badges/badgeDefinitions.ts
    - scripts/verifyWeighInReminder.ts
    - scripts/verifyMealReminderWindows.ts
    - scripts/verifyBadgeThresholds.ts
    - convex/tables/pushTokens.ts
    - convex/tables/badges.ts
  modified:
    - package.json
    - convex/tables/profiles.ts
    - convex/schema.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "MEAL_REMINDER_POINTS зафиксированы как breakfast/9, lunch/14, dinner/20 с 30-минутным окном — реализация Claude's Discretion из D-11/D-15"
  - "windowStartUtcMs для точки приёма пищи = конец предыдущей точки (для breakfast — начало локальных суток); поле mealType в схему не вводится (трактовка D-12)"
  - "Шесть порогов бейджей (streak 7/30/100, mealCount 10/50/100) зафиксированы как реализация D-16/D-17"
  - "resolveNewBadges делает \"догоняющее\" начисление всех пройденных порогов за один вызов, идемпотентность гарантируется фильтром по awarded (T-69-04)"

patterns-established:
  - "Pattern: доменная арифметика времени/порогов выносится в lib/**, покрывается ts-node verify-скриптом, и только затем используется из Convex-функций"

requirements-completed: [WEIGH-01, MEALPUSH-01, BADGE-01, PUSH-01]

duration: 20min
completed: 2026-08-30
---

# Phase 69 Plan 01: Reminder Schedule + Badge Definitions + Schema Summary

**Чистые модули `reminderSchedule.ts`/`badgeDefinitions.ts` с тремя зелёными verify-скриптами, плюс Convex-таблицы `pushTokens`/`badges` и 5 новых опциональных полей профиля — фундамент для push-инфраструктуры, cron-напоминаний и бейджей следующих трёх планов.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-30T07:55:12Z (STATE.md session start)
- **Completed:** 2026-08-30T08:11:29Z
- **Tasks:** 3/3
- **Files modified:** 11

## Accomplishments
- Чистая логика расписания напоминаний (`getLocalParts`, `resolveDueMealPoint`, `isWeighInDue`, `isMealReminderDeduped`) покрыта двумя verify-скриптами, включая DST-кейс (летнее/зимнее смещение Europe/Berlin)
- Чистая логика порогов бейджей с идемпотентным `resolveNewBadges` (включая "догоняющее" начисление и защиту от двойной выдачи — T-69-04) покрыта verify-скриптом
- Схема Convex расширена таблицами `pushTokens` (индексы `byUserId`, `byExpoPushToken`) и `badges` (индексы `byUserId`, `byUserIdAndTypeAndThreshold`, `byUserIdAndSeenAt`) без изменения существующих запросов/мутаций
- Профиль пользователя получил 5 опциональных полей для напоминаний, ни один существующий документ не мигрируется

## Task Commits

Each task was committed atomically:

1. **Task 1: Чистая логика расписания напоминаний + два verify-скрипта** - `176338a` (feat)
2. **Task 2: Определения бейджей + verify-скрипт порогов** - `64d5f9f` (feat)
3. **Task 3: Таблицы pushTokens/badges и новые поля профиля** - `4a323f5` (feat)

**Plan metadata:** committed as part of this same summary/state commit (see final commit below)

## Files Created/Modified
- `lib/notifications/reminderSchedule.ts` - точки напоминаний о еде, интервал взвешивания, дедупликация — чистая функция
- `lib/badges/badgeDefinitions.ts` - 6 определений бейджей + идемпотентный `resolveNewBadges`
- `scripts/verifyWeighInReminder.ts` - 5 сценариев для `isWeighInDue`
- `scripts/verifyMealReminderWindows.ts` - все 3 точки, границы окна, DST-кейс
- `scripts/verifyBadgeThresholds.ts` - догоняющее начисление, идемпотентность, смешанный кейс
- `package.json` - 3 новых `script:verify*` записи
- `convex/tables/pushTokens.ts` - таблица Expo push-токенов
- `convex/tables/badges.ts` - таблица выданных бейджей
- `convex/tables/profiles.ts` - 5 новых опциональных полей верхнего уровня
- `convex/schema.ts` - регистрация `badges`/`pushTokens`
- `convex/_generated/api.d.ts` - обновлён `npx convex codegen`

## Decisions Made
- Все ключевые решения (пороги, точки дня, трактовка D-12) уже зафиксированы в PLAN.md как "Claude's Discretion" реализации D-06/D-11/D-12/D-15/D-16/D-17 — исполнены без отклонений от предписанных значений

## Deviations from Plan

None — план выполнен как написано. Единственная небольшая корректировка: изначальный текст комментария в `convex/tables/profiles.ts` случайно дублировал literal-подстроку `weightUpdatedAt` внутри поясняющего комментария, из-за чего `grep -c` возвращал 6 вместо ожидаемых 5 по acceptance criteria Task 3. Переформулировал комментарий, не меняя логику — это не относится ни к одному из Rules 1-4 (не баг, не отсутствующая функциональность, не блокер, не архитектурное решение), а обычная правка текста ради соответствия acceptance criteria plana.

## Issues Encountered

- `npx convex codegen` не переписывает `convex/_generated/dataModel.d.ts` буквальным текстом (в этой версии Convex 1.27.3 файл — статичный дженерик-шаблон, типы выводятся динамически через `DataModelFromSchemaDefinition<typeof schema>`), поэтому acceptance-criteria-грep `grep -c "pushTokens|badges" dataModel.d.ts` не находит совпадений в этом файле. Вместо этого подтверждено через `convex/_generated/api.d.ts`, где обе новые таблицы-модули (`tables/badges`, `tables/pushTokens`) появились после codegen, и через чистый `npx tsc --noEmit` (типы схемы транзитивно валидны). Функциональная цель acceptance criteria (типы новых таблиц доступны после codegen) достигнута, только не текстуально в указанном файле.
- Обнаружены pre-existing проблемы вне зоны плана (задокументированы в `.planning/phases/69-onboarding-gamification/deferred-items.md`, не исправлялись по Scope Boundary): 1 ошибка `tsc --noEmit` в `components/home/HomeHeader.tsx` (введена в 69-02) и 8 ошибок `eslint .` в `confirm-meal.tsx`/`confirm-phone.tsx`/`ConfirmMealItems.tsx` (введены в более ранних, не связанных коммитах). Ни один из этих файлов не входит в `files_modified` этого плана.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `lib/notifications/reminderSchedule.ts` и `lib/badges/badgeDefinitions.ts` готовы как контракты для планов 69-03 (push-инфраструктура), 69-04 (бейджи), 69-06/69-07 (cron-напоминания) — все экспорты из `<interfaces>` плана присутствуют
- `pushTokens`/`badges` таблицы и новые поля профиля доступны в типах Convex; никакие существующие функции не изменены
- Нет блокеров для следующего плана

---
*Phase: 69-onboarding-gamification*
*Completed: 2026-08-30*

## Self-Check: PASSED

All created files verified present on disk; all three task commit hashes (`176338a`, `64d5f9f`, `4a323f5`) verified present in `git log`.

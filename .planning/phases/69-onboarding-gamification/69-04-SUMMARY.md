---
phase: 69-onboarding-gamification
plan: 04
subsystem: gamification+database
tags: [convex, badges, streak, idempotent-mutation, ts-node]

requires:
  - phase: 69-onboarding-gamification (plan 01)
    provides: "lib/badges/badgeDefinitions.ts (BADGE_DEFINITIONS, resolveNewBadges), badges/pushTokens schema"
provides:
  - "Чистая функция подсчёта стрика без авторизационного контекста (convex/utils/streakDays.ts)"
  - "Серверное идемпотентное начисление бейджей при завершении блюда (convex/badges/checkAndAwardBadges.ts)"
  - "Три Convex-функции для UI: getUnseenBadge (реактивный запрос), markBadgeSeen (с проверкой владения), listBadges"
  - "Врезки вызова начисления в оба пайплайна завершения блюда (фото и штрихкод)"
affects: [69-05]

tech-stack:
  added: []
  patterns:
    - "Идемпотентное серверное начисление: чистая resolveNewBadges фильтрует по снимку awarded + повторная индексная проверка byUserIdAndTypeAndThreshold перед insert (двойная защита от гонки)"
    - "internalMutation вместо public mutation там, где вызов должен быть достижим только из доверенного серверного пайплайна"
    - "Реактивное обнаружение непоказанного состояния через индекс с eq(field, undefined), а не из ответа мутации"

key-files:
  created:
    - convex/utils/streakDays.ts
    - scripts/verifyStreakDays.ts
    - convex/badges/checkAndAwardBadges.ts
    - convex/badges/getUnseenBadge.ts
    - convex/badges/markBadgeSeen.ts
    - convex/badges/listBadges.ts
  modified:
    - convex/home/getStreak.ts
    - package.json
    - convex/meals/analyze/processDetectedItems.ts
    - convex/meals/analyze/analyzeMealBarcode.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "Смещение часового пояса для серверного начисления берётся из последнего сохранённого pushTokens.timezoneOffsetMinutes (0, если записи нет) — клиентского контекста в фоновом пайплайне нет"
  - "Форма проверки владения в markBadgeSeen скопирована дословно из updateMealInternal.ts (два отдельных if, не объединённых через ||) — так же и во избежание eslint no-confusing правил по optional chain"

patterns-established:
  - "Pattern: доменная арифметика (стрик) выносится из авторизованной query в чистый модуль convex/utils/**, чтобы быть переиспользуемой из internalMutation без ctx.auth"

requirements-completed: [BADGE-01]

duration: ~10min
completed: 2026-08-30
---

# Phase 69 Plan 04: Server-Side Badge Awarding + Streak Extraction Summary

**Серверное идемпотентное начисление бейджей (`checkAndAwardBadges` internalMutation) при завершении блюда в обоих пайплайнах (фото и штрихкод), плюс чистая `computeStreakFromMealTimes`, вынесенная из `getStreak` для использования вне авторизационного контекста.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-08-30T08:32:36Z (STATE.md session start)
- **Completed:** 2026-08-30T08:39:16Z
- **Tasks:** 3/3
- **Files modified:** 11

## Accomplishments
- `convex/utils/streakDays.ts` — дословный перенос алгоритма подсчёта стрика в чистую функцию, `getStreak.ts` делегирует ей без изменения публичного контракта
- `convex/badges/checkAndAwardBadges.ts` — internalMutation с двойной защитой от дублирования бейджей (чистый фильтр `resolveNewBadges` по снимку `awarded` + повторная индексная проверка `byUserIdAndTypeAndThreshold` перед `insert`)
- Врезки вызова начисления в оба пайплайна завершения блюда: `processDetectedItems.ts` (фото, фоновый `internalAction`) и `analyzeMealBarcode.ts` (штрихкод)
- Три Convex-функции для UI: `getUnseenBadge` (реактивный запрос по индексу `byUserIdAndSeenAt`), `markBadgeSeen` (проверка владения, `Forbidden` при чужом бейдже), `listBadges` (сырой список без склейки с определениями)

## Task Commits

Each task was committed atomically:

1. **Task 1: Вынести подсчёт стрика в общую чистую функцию** - `0e37a11` (feat)
2. **Task 2: Идемпотентное начисление бейджей и врезка в meal-пайплайн** - `f27dee0` (feat)
3. **Task 3: Запросы бейджей для UI** - `22221be` (feat)

**Plan metadata:** committed as part of this same summary/state commit (see final commit below)

## Files Created/Modified
- `convex/utils/streakDays.ts` - чистый `computeStreakFromMealTimes`, без `ctx`/`_generated`
- `convex/home/getStreak.ts` - делегирует расчёт `computeStreakFromMealTimes`, контракт не изменён
- `scripts/verifyStreakDays.ts` - 7 сценариев, включая сдвиг границы суток при `timezoneOffsetMinutes=-120`
- `convex/badges/checkAndAwardBadges.ts` - internalMutation, идемпотентное начисление
- `convex/meals/analyze/processDetectedItems.ts` - врезка `internal.badges.checkAndAwardBadges.default` после перевода в `done`
- `convex/meals/analyze/analyzeMealBarcode.ts` - та же врезка перед `return mealId`
- `convex/badges/getUnseenBadge.ts` - реактивный запрос непоказанного бейджа
- `convex/badges/markBadgeSeen.ts` - мутация отметки «показан» с проверкой владения
- `convex/badges/listBadges.ts` - список выданных бейджей текущего пользователя
- `package.json` - добавлен `script:verifyStreakDays`
- `convex/_generated/api.d.ts` - обновлён `npx convex codegen` (дважды, после Task 2 и Task 3)

## Decisions Made
- Все ключевые решения (источник часового пояса, форма защиты от гонки, форма проверки владения) уже предписаны планом как реализация D-16/D-17 и T-69-12/T-69-13 — исполнены без отклонений от предписанного

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Изменена форма проверки владения в `markBadgeSeen.ts`**
- **Found during:** Task 3 (проверка `npx eslint`)
- **Issue:** Объединённое условие `if (!badge || badge.userId !== userId) throw new Error("Forbidden")` триггерило `@typescript-eslint/prefer-optional-chain` — единственная линт-ошибка, введённая этим планом
- **Fix:** Разбито на два последовательных `if`, дословно повторяющих форму `updateMealInternal.ts` (`if (!badge) throw ...; if (badge.userId !== userId) throw ...`) — семантика идентична, acceptance-критерий (`grep -c "throw new Error(\"Forbidden\")"` ≥ 1) по-прежнему выполняется (значение 2)
- **Files modified:** convex/badges/markBadgeSeen.ts
- **Verification:** `npx eslint convex/badges/markBadgeSeen.ts` — чисто; `npx tsc --noEmit` — чисто
- **Committed in:** 22221be (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug/lint)
**Impact on plan:** Косметическая правка формы условия ради соответствия линтеру проекта, поведение идентично предписанному. Не затрагивает скоуп.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Все три Convex-функции `badges/*` доступны в сгенерированном `api.d.ts` — план 69-05 (витрина бейджей и модалка) может подключать `getUnseenBadge`/`markBadgeSeen`/`listBadges` напрямую
- Начисление уже происходит на сервере в обеих точках завершения блюда — план 69-05 не должен добавлять клиентских вызовов начисления
- Pre-existing eslint-ошибки в `confirm-meal.tsx`/`confirm-phone.tsx`/`ConfirmMealItems.tsx` (8 штук, вне `files_modified` этого плана) не тронуты — задокументированы ранее в 69-01-SUMMARY.md, не блокируют этот план

---
*Phase: 69-onboarding-gamification*
*Completed: 2026-08-30*

## Self-Check: PASSED

All created files verified present on disk; all three task commit hashes (`0e37a11`, `f27dee0`, `22221be`) verified present in `git log`.

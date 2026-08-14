---
phase: 01-observability
plan: 04
subsystem: infra
tags: [sentry, expo, eas, observability]

requires:
  - phase: 01-observability (01-02, 01-03)
    provides: Sentry SDK integration, logError registry wiring, hidden diagnostics section, local production build scripts
provides:
  - Подтверждённая работа диагностики на локальной production-сборке (Release-конфигурация)
affects: [phase-2-стабильный-запуск]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "Task 2 (сборка EAS production + загрузка sourcemaps) и Task 3 (сквозная проверка в TestFlight) сознательно отложены пользователем — план закрыт частично, чтобы не тратить 30-45 минут билд-цикла EAS прямо сейчас"

patterns-established: []

requirements-completed: [OBS-02, OBS-04]

duration: n/a (частичное выполнение)
completed: 2026-08-14
---

# Phase 1: Наблюдаемость продакшена — 01-04 Summary (частично)

**Локальная production-сборка (`npm run ios:prod`, конфигурация Release) подтверждённо отправляет события в Sentry с читаемым стеком; сборка EAS и проверка на TestFlight отложены**

## Performance

- **Tasks:** 1/3 выполнена (Task 1), 2 отложены (Task 2, Task 3)
- **Completed:** 2026-08-14

## Accomplishments

- Task 1 (checkpoint:human-verify) подтверждён пользователем: `npm run ios:prod` в конфигурации Release запускается на устройстве, оба тестовых события («Отправить тестовую ошибку», «Проверить logError») дошли до Sentry в окружении `local-release`
- Это закрывает OBS-04 (production-конфигурация воспроизводима локально) и OBS-02 (событие через `logError` отличимо по тегу источника — плановая проверка explicit для release-режима, где `__DEV__` равно `false`)

## Deviations from Plan

**Задачи 2 и 3 не выполнены — отложены по решению пользователя.**

Пользователь явно попросил пропустить Task 2 (сборка `eas build --platform ios --profile production`, проверка загрузки sourcemaps через `sentry-cli`, `eas submit` в TestFlight) и, соответственно, Task 3 (сквозная проверка на реальной TestFlight-сборке), чтобы не тратить 30–45 минут билд-цикла сейчас и продолжить движение к Phase 2.

**Важный факт, зафиксированный при обсуждении:** существующая сборка 1.2.1 (2), подтверждённая в TestFlight ранее (2026-08-05, 12:46), НЕ может служить заменой Task 3 — код Sentry (мониторинг и диагностика) был закоммичен позже в тот же день (19:10 и 19:38). В 1.2.1 (2) интеграции Sentry физически нет.

**Следствие:** OBS-01 и OBS-03 остаются непроверенными на настоящем релизном EAS-билде:
- OBS-01 частично: события с версией/платформой подтверждены только в локальной Release-сборке, не на подписанном EAS-бинарнике
- OBS-03 не проверено вовсе: загрузка и матчинг sourcemaps проверяется только через `sentry-cli` после реальной EAS-сборки (Task 2) — этот шаг не выполнялся

## Issues Encountered

None — блокер не технический, а решение пользователя отложить дорогостоящий (по времени) шаг.

## User Setup Required

None для выполненной части. Когда Task 2/3 будут возобновлены, потребуется: экспортированный `SENTRY_AUTH_TOKEN` в оболочке и доступ к `eas build`/`eas submit`.

## Next Phase Readiness

Phase 1 закрывается частично — OBS-01 и OBS-03 остаются в статусе Pending, задокументировано как backlog-пункт для возврата (см. `ROADMAP.md` → Backlog → Phase 999.1). Phase 2 может начинаться параллельно: она не зависит от завершения OBS-01/03 технически, но задокументированное решение проекта — «диагностика подключается до попытки чинить краш вслепую» — теряет часть страховки, пока Sentry не проверен на реальном TestFlight-билде. Rекомендуется вернуться к Task 2/3 до релиза в App Store.

---
*Phase: 01-observability*
*Completed: 2026-08-14 (partial — 1/3 tasks)*

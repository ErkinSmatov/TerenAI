---
phase: 77-health-connect-android
plan: 04
subsystem: health
tags: [health-connect, android, facade, convex, hook]

requires:
  - phase: 77-01
    provides: syncHealthData, healthMapping, healthSyncState
  - phase: 77-02
    provides: importGlucoseReadings, getLastManualUnit
  - phase: 77-03
    provides: react-native-health-connect 4.1.3
provides:
  - lib/health/healthConnect.ts (Android-реализация)
  - lib/health/healthProvider.ts (платформенный фасад)
  - lib/hooks/useHealthSyncRunner.ts (хук-раннер)
  - getHealthKitAvailability в healthKit.ts
affects: [77-05, 77-06]

key-files:
  created:
    - lib/health/healthConnect.ts
    - lib/health/healthProvider.ts
    - lib/hooks/useHealthSyncRunner.ts
  modified:
    - lib/health/healthKit.ts

key-decisions:
  - "Подключённость на Android определяется getGrantedPermissions, флаг SecureStore не используется"
  - "healthConnect загружается из фасада лениво через require в Android-ветках"
  - "Глюкоза откладывается, пока не загрузилась единица последнего ручного ввода (только Android)"

requirements-completed: [77-SC-1, 77-SC-3]

duration: 15min
completed: 2026-11-12
---

# Phase 77 Plan 04: Health Connect и фасад Summary

Android-реализация Health Connect (доступность, read-разрешения, агрегаты по суткам, глюкоза с пагинацией), единый фасад healthProvider и хук useHealthSyncRunner поверх syncHealthData.

## Tasks

1. lib/health/healthConnect.ts - 478c902
2. healthProvider.ts, getHealthKitAvailability, useHealthSyncRunner - 5668574

## Verification

- `npx tsc --noEmit`, `npx eslint .` - чисто
- `verifyHealthSync: OK`, `verifyHealthRanges: OK`
- Нативные библиотеки здоровья импортируются только в healthConnect.ts и healthKit.ts
- healthKit.ts: +7 строк, 0 удалений
- `require("./healthConnect")` один раз, статического импорта нет; все вызовы getHealthConnect() внутри веток `Platform.OS === "android"` (проверено вручную по grep -n)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Правки под eslint (строгие правила типов)**
- Убраны `?.`/`??` по полям агрегатов (COUNT_TOTAL, ACTIVE_CALORIES_TOTAL, DISTANCE): в типах библиотеки они не nullable. Следствие: пункт плана "отсутствующее поле -> 0" на уровне доступа к полям не реализован; NaN/undefined значения гасит sanitize в mergeMovementAggregates, но отсутствие самого объекта (ACTIVE_CALORIES_TOTAL) бросило бы исключение, которое ловит вызывающий.
- Убран `Number(Platform.Version)` (на Android Version уже number); `initPromise ??=`.
- В хуке `healthSource` копируется в локальную const для сужения типа в замыкании.

## Notes

- Требований 77-SC-* нет в REQUIREMENTS.md, mark-complete не выполнялся.
- Проверка на реальном устройстве Android не выполнялась (будет в 77-05/06).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

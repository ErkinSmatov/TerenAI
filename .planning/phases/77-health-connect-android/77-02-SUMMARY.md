---
phase: 77-health-connect-android
plan: 02
subsystem: convex
tags: [convex, glucose, health-connect, healthkit, import]

requires:
  - phase: 75-tester-feedback
    provides: lib/health/healthRanges.ts (isGlucoseValueValid)
provides:
  - source healthconnect в схеме glucoseReadings, индекс byUserIdAndSourceAndRecordedAt
  - convex/utils/importGlucoseBatch.ts (insertImportedGlucoseReadings, MAX_IMPORT_BATCH, MAX_EXTERNAL_ID_LENGTH)
  - мутация api.glucose.importGlucoseReadings (source + лимит пачки 500)
  - query api.glucose.getLastManualUnit
affects: [77-04, 77-05, 77-06]

key-files:
  created:
    - convex/utils/importGlucoseBatch.ts
    - convex/glucose/importGlucoseReadings.ts
    - convex/glucose/getLastManualUnit.ts
  modified:
    - convex/tables/glucoseReadings.ts
    - convex/glucose/importHealthKitReadings.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "Внешний id хранится в healthKitUuid (HealthKit как есть, Health Connect с префиксом hc:)"
  - "Невалидные показания и дубли пропускаются, а не валят пачку"
  - "importHealthKitReadings сохранила прежние аргументы, стала обёрткой"

requirements-completed: [77-SC-3]

completed: 2026-11-12
---

# Phase 77 Plan 02: Серверная часть импорта Summary

Convex принимает показания с источником healthkit или healthconnect через общий помощник с лимитом пачки 500, дедупом по внешнему id и валидацией значений и времени; старая iOS-мутация сохранена как обёртка.

## Tasks

1. Схема, помощник, importGlucoseReadings, обёртка старой мутации - 91f6a2e
2. Query getLastManualUnit, api.d.ts, деплой на dev - 75c6f84

## Verification

- `npx tsc --noEmit`, `npx eslint convex` - чисто
- `npx convex dev --once` (dev) - индекс glucoseReadings.byUserIdAndSourceAndRecordedAt добавлен, функции готовы
- Прод-деплой не выполнялся (его у проекта нет)
- Аргументы importHealthKitReadings не менялись (healthKitUuid: v.string())

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

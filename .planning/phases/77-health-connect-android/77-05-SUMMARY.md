---
phase: 77-health-connect-android
plan: 05
subsystem: health
tags: [health-connect, healthkit, hook, throttle, android]

requires:
  - phase: 77-04
    provides: useHealthSyncRunner, healthProvider (isHealthPlatformSupported)
provides:
  - lib/hooks/useHealthSync.ts (автосинхронизация вместо useHealthKitSync)
affects: [77-06]

key-files:
  created:
    - lib/hooks/useHealthSync.ts
  modified:
    - app/app/(tabs)/index.tsx
    - app/app/(home)/day/[date].tsx
    - app/app/(home)/glucoseLog.tsx
  deleted:
    - lib/hooks/useHealthKitSync.ts

key-decisions:
  - "Гейты движения на главной и в экране дня переведены с Platform.OS === ios на isHealthPlatformSupported"
  - "lastGlucoseSyncRef обновляется только при run.glucoseRan (отложенная глюкоза не блокируется троттлингом)"

requirements-completed: [77-SC-1, 77-SC-3]

duration: 8min
completed: 2026-11-12
---

# Phase 77 Plan 05: useHealthSync и снятие iOS-гейтов Summary

Хук useHealthSync (троттлинг 5 минут на канал, inFlightRef против параллельных запусков) заменил useHealthKitSync; движение на главной и в экране дня теперь запрашивается и на Android; журнал глюкозы подписывает источник " · Health Connect".

## Tasks

1. useHealthSync - a76e1aa
2. Удаление useHealthKitSync, гейты isHealthPlatformSupported, подпись источника - 8c17664

## Verification

- `npx tsc --noEmit`, `npx eslint .` - чисто после каждого коммита
- `verifyHealthSync: OK`
- Упоминаний useHealthKitSync в app/lib/components нет

## Deviations from Plan

None - plan executed exactly as written. Из index.tsx и day/[date].tsx убран ставший неиспользуемым импорт Platform.

## Notes

- STATE.md заголовок (Phase 74) не менялся; прогресс обновлён служебными командами.
- Проверка на реальном устройстве Android не выполнялась.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

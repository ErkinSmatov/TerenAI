---
phase: 77-health-connect-android
plan: 06
subsystem: health
tags: [health-connect, healthkit, ui, settings, onboarding-prompt]

requires:
  - phase: 77-04
    provides: healthProvider, useHealthSyncRunner
  - phase: 77-05
    provides: useHealthSync
provides:
  - Экран «Здоровье» для iOS и Android через фасад
  - HealthAccessPrompt - одноразовое предложение после онбординга
affects: []

key-files:
  created:
    - components/health/HealthAccessPrompt.tsx
  modified:
    - app/app/(settings)/health.tsx
    - app/app/(tabs)/settings.tsx
    - app/app/_layout.tsx

key-decisions:
  - "Предложение показывается один раз (markHealthPromptSeen при показе), уже подключённым и неподдерживаемым устройствам не показывается"
  - "Обновить данные и Подключить используют один handleConnect: connectHealth(isGlucometerTrack) строго до runner"

requirements-completed: [77-SC-1, 77-SC-2]

duration: 12min
completed: 2026-11-12
---

# Phase 77 Plan 06: Экран Здоровье и предложение после онбординга Summary

Экран «Здоровье» работает на iOS и Android через фасад (установка/обновление Health Connect, отказ, ссылка на настройки, политика конфиденциальности), пункт меню виден на Android, а HealthAccessPrompt в app/app/_layout.tsx один раз предлагает подключение после онбординга без правок онбординга.

## Tasks

1. Экран «Здоровье» и пункт меню - 8a9cd81
2. HealthAccessPrompt и подключение в layout - e92ab57

## Verification

- `npx tsc --noEmit`, `npx eslint .` чисто; `verifyHealthSync: OK`
- Onboarding.tsx и OnboardingContext.tsx без изменений
- Проверка на устройстве Android не выполнялась

## Deviations from Plan

- В health.tsx кнопка использует `onPress={() => void handleConnect()}` вместо `onPress={handleConnect}` (правило eslint no-misused-promises); поведение то же, grep-критерий буквально не совпадает.
- В HealthAccessPrompt флаг отмены вынесен в замыкание isCancelled() из-за правила no-unnecessary-condition.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

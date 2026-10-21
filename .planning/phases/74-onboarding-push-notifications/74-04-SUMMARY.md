---
phase: 74-onboarding-push-notifications
plan: 04
subsystem: onboarding
tags: [onboarding, goal, program, goalTrack]
requires: []
provides:
  - Порядок онбординга Цель (всем) -> Программа (программа -> тип диабета -> тренировки)
affects: [74-05]
key-files:
  modified:
    - components/onboarding/Onboarding.tsx
    - app/app/(settings)/generateMacroTargets.tsx
    - components/onboarding/steps/program/OnboardingGoalTrack.tsx
    - components/onboarding/steps/program/OnboardingTraining.tsx
  moved:
    - components/onboarding/steps/program/OnboardingGlucometerType.tsx
key-decisions:
  - "Выбор программы больше не перезаписывает goal/targetWeight/weightChangeRate; сбрасывается только glucometerType"
  - "Хранимое значение glucometer сохранено, в UI подпись «Диабет»"
requirements-completed: [ONB-GOAL, ONB-PROGRAM]
duration: 6min
completed: 2026-10-21
---

# Phase 74 Plan 04: порядок онбординга Summary

Цель спрашивается у всех (Похудеть/Поддерживать/Набрать, целевой вес и темп пропускаются при maintain), выбор программы и тип диабета перенесены в секцию «Программа» перед тренировками, принудительный goal=maintain удалён; тот же порядок в generateMacroTargets.

## Задачи

1. Перенос шагов программы и тексты — `0b340f9`
2. Новый порядок шагов в Onboarding.tsx и generateMacroTargets.tsx — `ed3c287`

## Верификация

`npx tsc --noEmit` без ошибок, `goal.check.mjs: OK`, `goalTrack !== "weightControl"` и «Глюкометр» в components/app не осталось. Секция «Основы» не менялась.

## Deviations from Plan

None - plan executed exactly as written.

Примечание: существующие пользователи Биохакинга/Диабета имеют goal = maintain; миграции нет, цель можно изменить через пересчёт. Незакоммиченные правки пользователя (health.tsx, ShareCodeCard, OnboardingSection, Paywall, DiagnosticsSection, SubscriptionContext) не затронуты.

## Known Stubs

None.

## Self-Check: PASSED

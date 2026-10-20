---
phase: 72-push-testflight-telegram-whatsapp-otp
plan: 08
subsystem: settings-goal
tags: [goal, onboarding, nutrition-targets, settings]
requires: [72-07]
provides:
  - Чистые функции цели (needsGoalDetails, normalizeGoalDetails, formatGoalSummary)
  - Экран смены цели /app/(settings)/changeGoal с превью «было → станет»
affects: [72-09]
key-files:
  created:
    - lib/goal/goalDetails.ts
    - scripts/checks/goal.check.mjs
    - app/app/(settings)/changeGoal.tsx
  modified: []
key-decisions:
  - "Сохранение через { ...profile.data, goal, targetWeight, weightChangeRate }: goalTrack и прочие поля не затираются (D-05)"
  - "Блокировка некорректной цели двойная: completed шага превью включает !needsGoalDetails, handleSave повторно проверяет условие"
requirements-completed: [WEIGH-02]
completed: 2026-10-20
---

# Phase 72 Plan 08: Экран смены цели Summary

Экран смены цели (похудеть / держать / набрать) с доспросом целевого веса и темпа, превью пересчёта норм и сохранением по подтверждению.

## Что сделано

- Task 1 (54ccc66): lib/goal/goalDetails.ts без runtime-импортов и scripts/checks/goal.check.mjs со всеми случаями из плана (вывод "goal: OK").
- Task 2: app/app/(settings)/changeGoal.tsx (335 строк), паттерн generateMacroTargets: OnboardingGoal, OnboardingTargetWeight, OnboardingWeightChangeRate, GoalChangePreview.

## Как закрыт D-06 (некорректная цель)

- Переход с шага цели: needsGoalDetails(data) определяет askDetails; при true до показа пикера значения нормализуются (normalizeGoalDetails).
- Превью: completed = computedTargets !== undefined && !goalDetailsMissing, поэтому кнопка «Сохранить» заблокирована; под превью подпись «Укажите целевой вес и темп» и кнопка «Указать» (возврат на шаг веса).
- handleSave начинается с проверки needsGoalDetails(data); при true — Toast и выход.
- Гидрация контекста один раз (hasHydratedRef), при размонтировании контекст возвращается к сохранённому профилю.

## Проверка

- node --experimental-strip-types --no-warnings scripts/checks/goal.check.mjs: OK
- npx tsc --noEmit: без ошибок
- npx eslint по lib/goal и changeGoal.tsx: без ошибок
- grep: нет completeOnboarding и goalTrack:; "...profile.data" есть; needsGoalDetails( встречается 3 раза
- Ручная проверка на устройстве не выполнялась (сценарий в 72-09).

## Отклонения от плана

- [Rule 3] steps строятся на каждом рендере без useMemo: eslint-disable для exhaustive-deps отключал React Compiler (ошибка react-compiler).
- Prettier применил форматирование (trailing commas) к файлам плана.

## Known Stubs

Нет. Экран пока не подключён ссылкой из настроек (вне files_modified; предположительно 72-09).

## Self-Check: PASSED

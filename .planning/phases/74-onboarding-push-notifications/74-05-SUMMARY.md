---
phase: 74-onboarding-push-notifications
plan: 05
subsystem: onboarding
tags: [onboarding, name, convex]
requires: [74-04]
provides:
  - Шаг «Как вас зовут?» между «Создать аккаунт» и пейволлом
affects: [74-08]
key-files:
  created:
    - convex/users/getNameStatus.ts
    - components/onboarding/steps/end/OnboardingName.tsx
  modified:
    - convex/users/updateUserName.ts
    - convex/_generated/api.d.ts
    - components/profile/EditNameSheet.tsx
    - context/OnboardingContext.tsx
    - components/onboarding/Onboarding.tsx
key-decisions:
  - "Имя хранится в контексте отдельно (nameDraft), не в data"
  - "Лимит имени 100 кодпоинтов на сервере (USER_NAME_MAX_LENGTH) и maxLength на клиенте"
requirements-completed: [ONB-NAME]
completed: 2026-10-21
---

# Phase 74 Plan 05: шаг «Имя» Summary

Шаг ввода имени показывается только вошедшим пользователям без имени (телефон, гость), имеет кнопку «Пропустить», сохраняет имя через updateUserName при уходе с шага; ошибка сохранения даёт Toast и не блокирует онбординг.

## Задачи

1. Серверная часть: getNameStatus, лимит длины, maxLength в EditNameSheet — `7939db0`
2. Шаг OnboardingName, контекст, встраивание в Onboarding — `c5f66c9`

## Верификация

`npx tsc --noEmit` без ошибок. Ручная проверка на устройстве в плане 74-08.

## Deviations from Plan

**1. [Rule 3 - Blocking] Ручное обновление convex/_generated/api.d.ts**
- Codegen без деплоймента недоступен, поэтому getNameStatus добавлен в api.d.ts вручную (в формате, который генерирует Convex), иначе tsc падал бы на api.users.getNameStatus.
- Commit: `7939db0`

## Deferred Issues

`npm run lint` падает на ошибках в lib/notifications/pushRules.ts (prefer-optional-chain, prefer-nullish-coalescing) — файл вне этого плана, не тронут.

## Known Stubs

None.

## Заметки

Незакоммиченные правки пользователя не затронуты (Onboarding.tsx и остальные файлы плана не содержали пользовательских изменений).

## Self-Check: PASSED

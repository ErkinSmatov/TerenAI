---
phase: 70-maps-page
plan: 03
subsystem: ui
tags: [observer, cleanup, maps-tab, human-verify]
requires: ["70-02"]
provides:
  - "Наблюдение доступно только из вкладки «Карты»; старые точки входа и экраны удалены"
affects: []
key-files:
  modified:
    - app/app/(tabs)/settings.tsx
    - components/home/HomeHeader.tsx
    - app/app/(tabs)/maps.tsx
  deleted:
    - app/app/(settings)/observerCode.tsx
    - app/app/(settings)/observedList.tsx
    - components/observer/ObserverListItem.tsx
key-decisions:
  - "Стиль observedList в maps.tsx переименован в observedCards, чтобы не путать с удалённым роутом"
requirements-completed: []
duration: 15min
completed: 2026-10-08
---

# Phase 70 Plan 03: Удаление старых точек входа и проверка Summary

Из Профиля убран пункт «Доступ наблюдателя», из шапки Главной — кнопка «Кого я наблюдаю» (кнопка серии осталась), удалены экраны observerCode/observedList и ObserverListItem. Пользователь проверил страницу «Карты» в приложении: **approved**, замечаний нет.

## Задачи

1. Убрать точки входа из Профиля и шапки Главной — 0b766aa
2. Удалить старые экраны и ObserverListItem — 6f3c15d
3. Human-verify checkpoint — approved пользователем («Отлично, закрываем фазу»)

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 - Blocking] Ложное срабатывание grep** — стиль `observedList` в maps.tsx переименован в `observedCards` (6f3c15d).

### Дополнения по ходу проверки (по просьбе пользователя, сверх плана, отдельные коммиты)

- 6ad6d30 — редизайн ObservedPatientCard по Figma 1338:1022: плитка «Глюкоза» вместо «Приём пищи», красное свечение при превышении калорий/глюкозы; в getObservedPatients добавлен distanceMeters.
- d04c98a — история наблюдаемого: convex/observers/getPatientHistory.ts, экран (settings)/observedHistory/[patientId].tsx, кнопка «История» и дата на экране наблюдаемого, исправлен NaN км.
- 0ee48ed — плитки целей помещаются в сетку 2x2, история показывает дистанцию рядом с шагами.

Эти дополнения затрагивают observedPatient/[patientId].tsx и convex/observers/*, которые план изначально не трогал; изменения сделаны по прямому запросу пользователя.

## Verification

`npx tsc --noEmit` чистый, `npx convex codegen` успешен, eslint: только 6 известных ошибок (confirm-meal.tsx, confirm-phone.tsx).

## Known Stubs

None.

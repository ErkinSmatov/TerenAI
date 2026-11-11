---
phase: 75-testflight
plan: 02
subsystem: observer-readonly-ui
tags: [observer, readOnly, home, empty-state]
requires: []
provides:
  - HomeEmptyState без href/onPress — неинтерактивный текст
  - HomeRecentlyLogged: проп targetCalories, пропуск запроса профиля в readOnly
affects: [observedPatient, day-screen, home]
key-files:
  modified:
    - components/home/HomeEmptyState.tsx
    - components/home/HomeGlucoseSummary.tsx
    - components/home/HomeBloodPressureSummary.tsx
    - components/home/HomeRecentlyLogged.tsx
    - app/app/(settings)/observedPatient/[patientId].tsx
    - app/app/(home)/day/[date].tsx
decisions:
  - "Тексты readOnly-пустых состояний: «Пока нет показаний» / «Пока нет блюд»"
metrics:
  completed: 2026-11-11
  tasks: 2
requirements: [75-SC-2]
---

# Phase 75 Plan 02: Режим только чтения у наблюдателя Summary

В readOnly пустые состояния Рациона, Сахара и Давления стали статичным текстом без иконки «добавить» и без перехода; кольца калорий блюд пациента считаются от целей пациента.

## Выполнено

1. HomeEmptyState без `href`/`onPress` рендерит `View` с текстом; Сахар и Давление в readOnly передают нейтральный текст и не передают href (commit ca011ac).
2. HomeRecentlyLogged: проп `targetCalories`, `useQuery(..., readOnly ? "skip" : {})`, пустое состояние «Пока нет блюд» в readOnly без `onAddPress`; экран пациента передаёт `data.targets?.calories`, экран дня — `profile?.targets.calories` (commit 6b5209e).

## Аудит экрана наблюдателя (observedPatient/[patientId])

Проверены: HomeRecentlyLogged/MealCard (в readOnly без Link на /app/(meal)/meal), HomeMacroSummary, HomeMicroSummary (в readOnly карточка без Link на nutrients), HomeNutrientGlowCard (необязательный onPress, HomeMicroSummary его не передаёт), HomeGlucoseSummary, HomeGlucoseHeroCard, HomeGlucoseRangeTile, SugarByHourChart, HomeBloodPressureSummary, BloodPressureLineChart. Действий записи не найдено. На самом экране единственный `router.push` — кнопка «История» (observedHistory, только чтение).

## Экран дня day/[date]

Не затронут по поведению: кнопка «+» и пустое состояние «Добавьте блюда за этот день…» по-прежнему открывают лист добавления (`onAddPress`/`canAdd` не менялись). Кольца считаются от собственного профиля через `targetCalories`. Нюанс: в readOnly-сводках Сахара/Давления на собственном прошлом дне теперь нейтральный текст вместо ссылки на добавление; добавление оттуда записало бы показание с текущим временем, а не за выбранный день, поэтому регрессией не считается. Если день в будущем и блюд нет, вместо ссылки на добавление показывается «Пока нет блюд».

## Проверки

`npx tsc --noEmit` и `npx eslint .` — без ошибок. Файлы пользователя из списка запретов не тронуты.

## Deviations from Plan

**1. [Rule 1 - Bug] Лишний optional chain** — `profile?.targets?.calories` вместо плана вызывал ошибку eslint (no-unnecessary-condition); использовано `profile?.targets.calories`. Из-за этого acceptance-grep `targetCalories={profile?.targets` совпадает (2).

**2. Форматирование prettier** — запуск prettier на day/[date].tsx дополнительно переформатировал несколько несвязанных строк (запятые, переносы); поведение не изменено.

## Служебное

STATE.md и ROADMAP.md не правились: по указанию заголовок STATE относится к Phase 74, запись о плане 75-02 не добавлялась вручную.

## Known Stubs

Нет.

## Self-Check: PASSED

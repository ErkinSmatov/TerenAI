# Phase 69: Онбординг, взвешивание, push-напоминания и геймификация - Research

**Researched:** 2026-08-30
**Domain:** Expo/React Native (SDK 54) + Convex — push-инфраструктура с нуля, расширение стрика бейджами, реструктуризация шапки главного экрана, аудит онбординга
**Confidence:** MEDIUM (push-инфраструктура — HIGH по официальным источникам, но "склейка" с конкретной бизнес-логикой проекта — MEDIUM/LOW, см. Open Questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Онбординг: аудит, не разработка
- **D-01:** Работа по онбордингу в этой фазе — это **аудит**, не активная разработка. Пользователь вручную проходит онбординг (как в Phase 68 human-verify), сверяет с ~15 однострочными пунктами в TODO.md (баги анимаций, обрезанный вес в кг, Reanimated-ошибка на экране онбординга, пикеры, плавность смены единиц измерения и т.д.) и закрывает те, что не воспроизводятся.
- **D-02:** Пользователь считает, что все TODO.md-пункты по онбордингу (включая два пункта про email-вход и два про «smooth measurement system change») уже неактуальны или исправлены. Пункты про email-вход закрываются несмотря на то, что email/OTP вне скоупа майлстоуна — потому что сама доработка уже считается сделанной, а не потому что email в скоупе.
- **D-03:** Если в ходе ручного прогона пользователем что-то из списка всё же воспроизведётся — точечный фикс исполнителем, а не переоткрытие полного аудита.
- **D-04:** Приёмка — ручной прогон онбординга пользователем (не автотесты, автотесты вне скоупа майлстоуна по PROJECT.md).
- **D-05:** Новый контент/шаги в онбординг в этой фазе НЕ добавляются — явно вне скоупа этой части фазы.

### Еженедельное взвешивание
- **D-06:** Напоминание — push-уведомление (не только визуальный бадж в приложении), отправляется каждые 7 дней от последнего ввода веса, повторяется постоянно (не разовый толчок).
- **D-07:** Тап по push сразу открывает новый лёгкий экран «только вес» — НЕ существующий 12-шаговый экран `generateMacroTargets.tsx` (Настройки → «Пересчитать цели»), который сейчас единственный способ обновить вес.
- **D-08:** После ввода нового веса цели по калориям/БЖУ (`computeNutritionTargets`) пересчитываются автоматически, без запроса подтверждения у пользователя.
- **D-09:** Напоминание можно отключить — отдельный тумблер в Настройках.
- **D-10:** Момент показа системного запроса push-разрешения (iOS) — на усмотрение исполнителя (техническая деталь).

### Push-напоминания о приёме пищи
- **D-11:** Напоминания привязаны к нескольким фиксированным точкам дня — условно «завтрак/обед/ужин» (не единое вечернее напоминание, не «умная» логика по истории приёмов пищи пользователя).
- **D-12:** Если пользователь уже записал блюдо в соответствующий приём пищи к моменту точки — push для этой точки пропускается (не дублируется).
- **D-13:** Текст push учитывает стрик/геймификацию (например, апелляция к сохранению стрика), а не нейтральный текст «не забудьте записать еду».
- **D-14:** Отдельный тумблер в Настройках — независимый от тумблера напоминания о взвешивании (D-09). Каждый push-канал управляется своим переключателем.
- **D-15:** Точное время точек завтрак/обед/ужин — на усмотрение исполнителя (пример из обсуждения: 9:00/14:00/20:00, не зафиксировано жёстко).

### Геймификация: направление и реализация
- **D-16:** Выбранное направление — **стрики + бейджи**. Расширяет существующий стрик (`convex/home/getStreak.ts`, отображается в `HomeHeader.tsx`), не вводит очки/уровни и не строит социальное сравнение через наблюдателей (Phase 6) в этой фазе.
- **D-17:** Источники бейджей: вехи стрика (например 7/30/100 дней подряд) И количество записанных блюд (например 10/50/100 приёмов) — оба источника, не один.
- **D-18:** Витрина бейджей — новый экран, доступный из раздела Профиль/Настройки (не всплывающее окно из шапки).
- **D-19:** При получении нового бейджа — моментальное празднование (анимированный экран/модалка в момент выполнения условия), не просто появление в витрине постфактум.
- **D-20:** Получение бейджа сопровождается моментальным опоражднованием в приложении — при этом push-канал для бейджей отдельно не обсуждался, добавлять не нужно если не будет отдельно решено.

### Объединение календаря и стрика (следствие направления геймификации)
- **D-21:** Существующая кнопка-календарь в шапке (`CalendarDaysIcon`, ведёт на месячную историю Phase 68 HIST-01/02) **удаляется** как отдельная кнопка.
- **D-22:** Существующая кнопка со стриком (пламя+число, `HomeHeader.tsx`) теперь ведёт на **новый объединённый экран**: число стрика сверху + календарь снизу (переиспользует UI/логику месячной истории из Phase 68). Даты, помеченные на этом календаре — **все дни с хотя бы одним записанным блюдом** (не только дни текущей непрерывной серии стрика).
- **D-23:** Тап по отмеченной дате на этом объединённом календаре ведёт на экран аналитики этого дня — то же поведение, что уже реализовано в Phase 68 (HIST-01/02), просто теперь этот вход — через кнопку стрика, а не через отдельную кнопку календаря.
- **D-24:** В шапку добавляется **новая отдельная кнопка** для перехода на экран «Кого я наблюдаю» (`observedList`, Phase 6) — раньше этот переход был побочным эффектом клика по кнопке стрика, что мешало стрику стать самостоятельной точкой входа.
- **D-25:** Итоговая раскладка шапки: 2 кнопки — (1) стрик → объединённый экран стрик+календарь+тап-по-дню→аналитика; (2) новая кнопка → список наблюдаемых.

### Claude's Discretion

- Точная формула бейджей (конкретные пороги: 7/30/100 дней, 10/50/100 блюд — примеры из обсуждения, не жёстко зафиксированы; можно скорректировать по итогам research/planning)
- Технические детали push-инфраструктуры (Expo push токены, регистрация устройства, backend-триггер из Convex, момент запроса iOS push-разрешения — D-10)
- Точное время push-точек завтрак/обед/ужин (D-15)
- Визуальный дизайн экрана «объединённый стрик+календарь», экрана «только вес», экрана «Достижения», анимации празднования бейджа
- Структура хранения бейджей в Convex-схеме (по существующим конвенциям `convex/tables/*.ts`)
- Нужен ли push-канал специально для «получен новый бейдж» — пользователь не поднимал этот вопрос отдельно, не блокирует фазу

### Deferred Ideas (OUT OF SCOPE)

- **Очки/уровни и социальный формат геймификации через наблюдателей** — рассмотрены как альтернативные направления, но не выбраны (D-16). Можно вернуться в будущей фазе, если стрики+бейджи окажется недостаточно
- **Push-канал специально для оповещения о новом бейдже** — не поднимался пользователем отдельно (см. D-20), не в скоупе этой фазы
- **История веса (график изменения по времени)** — не обсуждалась; сейчас `profiles.data.weight` — одно значение, перезаписывается. Если понадобится график/история — отдельная фаза

### Reviewed Todos (not folded)
None — `todo.match-phase` для Phase 69 вернул 0 совпадений (TODO.md-пункты по онбордингу использовались напрямую в дискуссии, но не через механизм `cross_reference_todos`, так как не были структурированы как отслеживаемые todo-записи).
</user_constraints>

## Summary

Фаза объединяет 4 независимых направления, три из которых — новая разработка поверх существующего Convex/Expo-стека, одно — ручной аудит без кода. Ядро технической сложности — push-инфраструктура (D-06..D-15): в проекте **нет вообще ничего** — `expo-notifications` не установлен, нет `convex/crons.ts`, нет таблицы токенов устройств. Обе push-фичи (напоминание о взвешивании раз в 7 дней, напоминания о еде в 3 фиксированные точки дня) должны опираться на одну общую инфраструктуру: клиентская регистрация Expo push-токена → таблица `pushTokens` в Convex → серверный cron (`convex/crons.ts`, `hourly` или чаще), который на каждом тике вычисляет для каждого пользователя, наступила ли для него локальная точка напоминания, и не пропущено ли условие «уже сделано» (взвешивание — по `weightUpdatedAt`, еда — по наличию `meals` в окне) → HTTP-вызов Expo Push API (`https://exp.host/--/api/v2/push/send`) либо через официальный Convex-компонент `@convex-dev/expo-push-notifications`.

Геймификация (D-16..D-20) технически проще: `convex/home/getStreak.ts` уже даёт живой (не хранимый) счётчик стрика; для бейджей нужна новая таблица `badges` (userId + type + threshold + earnedAt) и мутация, которая на событии «блюдо готово» (`processDetectedItems.ts` / `analyzeMealBarcode.ts`, где `status` становится `"done"`) пересчитывает стрик и число блюд и записывает новый бейдж, если порог пересечён. Мгновенное празднование (D-19) — главный архитектурный риск: обработка блюда часто идёт в фоне (`internalAction`, MEAL-03/04), пользователь может не смотреть в этот момент на экран, где мутация выполнилась — celebration-UI должен уметь показаться и при следующем открытии приложения, не только синхронно после действия пользователя.

Реструктуризация шапки (D-21..D-25) технически самая простая: существующий `app/app/(home)/calendar.tsx` уже помечает **все** дни с ≥1 блюдом (не только дни стрика подряд) — то есть логика D-22 уже реализована, нужно только перенести экран под кнопку стрика и добавить новую точку входа для `observedList`.

Один найденный кодовый факт критично меняет план для еженедельного взвешивания: `convex/profiles/updateProfile.ts` патчит поле `data` **целиком** (Convex `patch` не делает глубокое слияние вложенных объектов, а `partial()` из `convex-helpers` делает опциональными только верхнеуровневые поля). Наивный вызов `updateProfile({ profile: { data: { weight: X } } })` **сотрёт** все остальные поля профиля (рост, пол, цели и т.д.). Экран «только вес» обязан сначала прочитать текущий `profile.data`, склеить с новым весом на клиенте, и отправить полный объект `data` — ровно как это уже делает `generateMacroTargets.tsx` (`useEffect` со спредом `{...prev, ...profile.data}`).

**Primary recommendation:** реализовать push один раз как общую инфраструктуру (`pushTokens` таблица + `convex/crons.ts` + один общий Convex action, отправляющий через Expo Push HTTP API или через `@convex-dev/expo-push-notifications`), добавить `weightUpdatedAt` в схему профиля, переиспользовать `WeightPicker.tsx` (не `OnboardingWeight.tsx` целиком — он затирает `targetWeight`) для лёгкого экрана веса, расширить `SettingsItem` trailing-слотом под переключатели, и построить бейджи как отдельную таблицу с записью на событии завершения блюда, с UI-механизмом "непоказанный бейдж" (`seenAt: null`), а не с расчётом на клиенте в момент действия.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Регистрация push-токена устройства | Browser/Client (Expo app) | API/Backend (Convex mutation `recordPushToken`) | Токен получается только на устройстве через `expo-notifications`, но хранится и валидируется на сервере |
| Разрешение на push (iOS/Android permission prompt) | Browser/Client | — | Системный API, чисто клиентская операция |
| Определение "наступила ли точка напоминания" (7 дней / 9:00-14:00-20:00 локально) | API/Backend (Convex cron) | — | Должно работать без открытого клиента — единственный источник правды сервер |
| Отправка push-уведомления | API/Backend (Convex action → Expo Push API) | — | HTTP-вызов к внешнему сервису, секретов на клиенте нет |
| Пересчёт целей КБЖУ после нового веса | API/Backend (`computeNutritionTargets` query + `updateProfile` mutation) | — | Чистая бизнес-логика, уже существует на сервере |
| Начисление бейджа (пересечение порога) | API/Backend (Convex mutation, вызывается из meal-completion пайплайна) | — | Источники данных (стрик, число блюд) — серверные, начисление должно быть атомарным и идемпотентным |
| Показ celebration-модалки | Browser/Client | — | UI-анимация; решает, on-mount или по push-событию, что показать |
| Объединённый экран стрик+календарь | Browser/Client | API/Backend (переиспользует `getMonthMeals`, `getStreak`) | UI-компоновка на клиенте, данные уже приходят готовыми queries |
| Тумблеры push-каналов в Настройках | Browser/Client (UI) | API/Backend (флаг в `profiles` или отдельной таблице настроек) | Состояние должно быть серверным, чтобы cron его учитывал, а не только визуальным |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-notifications` | `~0.32.17` (bundled для Expo SDK 54; ставить через `npx expo install expo-notifications`, не хардкодить версию вручную) | Permission-flow, получение Expo push-токена, локальные и remote-уведомления | Официальный Expo-модуль, единственный поддерживаемый способ push в Expo-приложении [VERIFIED: npm registry — slopcheck OK, публикует Expo/EAS] |

Версия для SDK 54 подтверждена по `bundledNativeModules.json` ветки `sdk-54` официального репозитория `expo/expo` — `~0.32.17` [CITED: raw.githubusercontent.com/expo/expo/sdk-54/packages/expo/bundledNativeModules.json]. `npm view expo-notifications version` вернул `57.0.15` — это **последняя** версия пакета (соответствует Expo SDK 57), устанавливать её напрямую **нельзя**, разъедется с остальными `expo-*` зависимостями проекта (все `~`-запиненные под SDK 54). Обязательно `npx expo install expo-notifications`.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@convex-dev/expo-push-notifications` | `^0.3.1` | Официальный Convex-компонент: батчинг (до 100 сообщений/запрос), retry с backoff, автоочистка невалидных токенов (`DeviceNotRegistered`) | Рекомендуется как транспортный слой отправки — избавляет от ручной обработки ошибок Expo Push API. Требует `convex ^1.24.8` (в проекте `^1.27.3` — совместимо) [VERIFIED: npm registry — slopcheck OK, репозиторий `github.com/get-convex/expo-push-notifications`, пакет опубликован 2024-10-14, живой] |

**Альтернатива без компонента:** прямой `fetch` на `https://exp.host/--/api/v2/push/send` из Convex `action`/`internalAction` — не требует новой зависимости, но нужно вручную писать батчинг, retry и парсинг `DeviceNotRegistered` для очистки таблицы токенов. См. "Don't Hand-Roll" ниже — рекомендация в пользу компонента, а не самописного клиента.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@convex-dev/expo-push-notifications` (транспорт) | Прямой `fetch` к Expo Push API в собственном `internalAction` | Даёт полный контроль над форматом сообщения (нужно для персонализированного текста с упоминанием стрика, D-13) — компонент такой же контроль даёт через `notification: {...}` payload, разницы в гибкости нет; самописный вариант рискует хуже обработать `DeviceNotRegistered`/`MessageTooBig`/рейт-лимит 600/сек |
| Celebration-анимация через `react-native-fast-confetti` | Кастомная модалка на Reanimated + Skia (уже есть в проекте, см. `WeightPicker.tsx`) | `react-native-fast-confetti@2.0.2` требует peer `react-native-worklets >=0.7.0 <1`, в проекте запинен `0.5.1` (см. Package Legitimacy Audit) — версия 2.x **не установится** без апгрейда worklets. Кастомная анимация — ноль риска несовместимости, но больше ручной работы |
| Хранение флагов "push включён/выключен" в `profiles.data` | Отдельная таблица `notificationSettings` | `profiles.data` — вложенный объект с `union`-полями онбординга; добавление туда булевых флагов push смешивает домены. Отдельная таблица чище с точки зрения Convex-конвенции "domain per table", но требует джойна при чтении в Settings-экране |

**Installation:**
```bash
npx expo install expo-notifications
npm install @convex-dev/expo-push-notifications
```

**Version verification:** обе команды проверены в этой исследовательской сессии:
```bash
npm view expo-notifications version          # 57.0.15 (latest, НЕ ставить напрямую — см. выше)
npm view @convex-dev/expo-push-notifications version   # 0.3.1
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads (нед.) | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------------|-------------|-----------|-------------|
| `expo-notifications` | npm | Годы (официальный Expo-модуль) | 4 458 499/нед | `github.com/expo/expo` | [OK] | Approved |
| `@convex-dev/expo-push-notifications` | npm | Создан 2024-10-14 | 38 204/нед | `github.com/get-convex/expo-push-notifications` | [OK] | Approved |
| `react-native-fast-confetti` (рассмотрен, НЕ рекомендован) | npm | v2.0.2, активно поддерживается | 63 765/нед | `github.com/AlirezaHadjar/react-native-fast-confetti` | [OK] | **Approved с оговоркой** — peer `react-native-worklets >=0.7.0 <1` конфликтует с текущим `0.5.1` в проекте; `npm install` реально упал с `ERESOLVE` при проверке в этой сессии. Планировщик должен либо не использовать библиотеку (рекомендуемый путь — кастомная анимация), либо явно решить апгрейд `react-native-worklets`/`react-native-reanimated` как отдельную задачу с рисками |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none (все три пакета прошли `[OK]`; `react-native-fast-confetti` не рекомендован не из-за slopcheck, а из-за подтверждённого peer-dependency конфликта, обнаруженного прямой попыткой установки)

**Процедурная заметка:** в ходе проверки `slopcheck install expo-notifications @convex-dev/expo-push-notifications` фактически выполнил `npm install` и добавил обе записи в `package.json`/`package-lock.json` (сайд-эффект самой команды `slopcheck install`, не намеренное действие исследователя). Изменения немедленно отменены (`git checkout -- package.json package-lock.json`) до записи этого документа — рабочее дерево не содержит незапрошенных изменений. Планировщик должен явно включить `npx expo install expo-notifications` и `npm install @convex-dev/expo-push-notifications` как задачи выполнения (с правильной версией через `expo install`, не через `slopcheck install`/`npm install <pkg>` напрямую — иначе получится `expo-notifications@57.x`, несовместимая с SDK 54).

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────── Client (Expo app) ───────────────────────┐
│                                                                    │
│  App launch / Settings toggle ON                                  │
│         │                                                          │
│         ▼                                                          │
│  expo-notifications.requestPermissionsAsync()                     │
│         │ granted                                                  │
│         ▼                                                          │
│  getExpoPushTokenAsync({ projectId })                              │
│         │                                                          │
│         ▼                                                          │
│  useMutation(recordPushToken) ──────────────┐                     │
│                                              │                     │
│  Push tap → deep link → лёгкий экран веса   │                     │
│  Push tap → deep link → home                │                     │
└──────────────────────────────────────────────┼─────────────────────┘
                                                 ▼
┌─────────────────────── Convex Backend ───────────────────────────┐
│                                                                    │
│  pushTokens table  ◄── recordPushToken (mutation, userId из auth) │
│         ▲                                                          │
│         │ читает                                                   │
│  convex/crons.ts ── interval/hourly ──► internalAction:            │
│    checkWeighInReminders                                           │
│      для каждого профиля: now - weightUpdatedAt >= 7d?              │
│         │ да, и push-флаг включён                                  │
│         ▼                                                          │
│    checkMealReminders                                              │
│      для каждого юзера: локальное время в окне 9:00/14:00/20:00?   │
│      есть ли meals в этом окне (done, не deleted)?                  │
│         │ нет meals в окне, и push-флаг включён                    │
│         ▼                                                          │
│    sendPushNotification (action)                                   │
│      → @convex-dev/expo-push-notifications.sendPushNotification    │
│        (или прямой fetch на exp.host/--/api/v2/push/send)          │
│      текст учитывает getStreak (D-13)                              │
│                                                                    │
│  ──────────────────────────────────────────────────────────────   │
│                                                                    │
│  processDetectedItems / analyzeMealBarcode                         │
│    meal.status = "done"                                            │
│         │                                                          │
│         ▼                                                          │
│  checkAndAwardBadges (mutation, вызывается из action)               │
│    getStreak() + подсчёт meals(status=done) юзера                  │
│    если streak/mealCount пересёк порог и бейдж ещё не выдан         │
│         │                                                          │
│         ▼                                                          │
│  badges table: insert { userId, type, threshold, earnedAt,          │
│                          seenAt: null }                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────── Client (Home / любой экран) ───────────────┐
│  useQuery(getUnseenBadge) — реактивно, срабатывает даже если       │
│  бейдж начислен фоновым action, пока юзер был на другом экране     │
│         │ есть непоказанный бейдж                                  │
│         ▼                                                          │
│  Celebration-модалка (Reanimated) → markBadgeSeen (mutation)       │
└──────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
convex/
├── tables/
│   ├── pushTokens.ts        # НОВОЕ: userId, expoPushToken, platform, updatedAt
│   └── badges.ts            # НОВОЕ: userId, type ("streak"|"mealCount"), threshold, earnedAt, seenAt
├── notifications/           # НОВЫЙ домен
│   ├── recordPushToken.ts   # mutation, userId из getAuthUserId
│   ├── sendPushNotification.ts  # internalAction — обёртка над Expo Push API/компонентом
│   ├── checkWeighInReminders.ts # internalAction, вызывается из crons.ts
│   └── checkMealReminders.ts    # internalAction, вызывается из crons.ts
├── badges/                  # НОВЫЙ домен
│   ├── checkAndAwardBadges.ts   # internalMutation, вызывается из meal-completion пайплайна
│   ├── getUnseenBadge.ts        # query
│   └── markBadgeSeen.ts         # mutation
├── crons.ts                 # НОВЫЙ файл — hourly() тик для обеих проверок напоминаний
└── profiles/
    └── updateProfile.ts     # без изменений API, но вызывающий код должен мержить data вручную

components/
├── notifications/
│   └── NotificationsProvider.tsx  # регистрирует токен на маунте, слушает deep-link по тапу
├── badges/
│   ├── BadgeCelebrationModal.tsx
│   └── BadgeShowcase.tsx
└── home/
    └── HomeHeader.tsx        # 2 кнопки вместо текущих 2 (замена целей, не количества)

app/app/(home)/
└── streak.tsx                # НОВЫЙ объединённый экран (стрик сверху + переехавший календарь снизу)

app/app/(settings)/
├── weeklyWeighIn.tsx          # НОВЫЙ лёгкий экран "только вес"
├── notificationSettings.tsx   # НОВЫЙ экран с двумя тумблерами (D-09, D-14)
└── badges.tsx                 # НОВАЯ витрина достижений (D-18)
```

### Pattern 1: Server-authoritative таймзона для cron-логики

**What:** Cron не имеет клиентского запроса — единственный способ узнать локальное время пользователя это хранить его на сервере, а не полагаться на паттерн `timezoneOffsetMinutes`, который сейчас передаётся клиентом при каждом вызове (`getStreak.ts`, `getMonthMeals.ts` берут его как аргумент query).

**When to use:** Любая cron-логика, завязанная на "локальное время пользователя" (обе push-фичи).

**Example:**
```typescript
// При регистрации push-токена клиент обязан прислать текущий offset —
// это единственный момент, когда у сервера есть свежий контекст клиента
// без периодического опроса.
const recordPushToken = mutation({
  args: {
    token: v.string(),
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, { token, timezoneOffsetMinutes }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    // upsert по userId — обновлять offset при каждом открытии приложения,
    // не только при первой регистрации (пользователь может переехать/DST)
  },
});
```
Источник паттерна: существующий `timezoneOffsetMinutes` в `convex/home/getStreak.ts` и `convex/meals/getMonthMeals.ts` [VERIFIED: код проекта]. Cron-адаптация — [ASSUMED], не найдена в проекте, стандартный подход для серверных напоминаний без клиента.

### Pattern 2: Полное слияние `profiles.data` перед патчем

**What:** `updateProfile` мутация патчит `profiles.data` целиком через `ctx.db.patch(profile._id, args.profile)` — вложенный `v.object` не мержится частично Convex-ом, только опциональность верхнеуровневых полей обеспечена `partial(profilesFields)`.

**When to use:** Любое место, где нужно поменять одно поле внутри `data` (вес — этот кейс), не только полный онбординг-flow.

**Example:**
```typescript
// Source: convex/profiles/updateProfile.ts (прочитан в этой сессии) +
// паттерн мержа из app/app/(settings)/generateMacroTargets.tsx
const profile = useQuery(api.profiles.getProfile.default);
const updateProfile = useMutation(api.profiles.updateProfile.default);
const computeTargets = useQuery(api.nutrition.computeNutritionTargets.default, {
  ...profile.data,
  weight: newWeight,
});

await updateProfile({
  profile: {
    data: { ...profile.data, weight: newWeight }, // ПОЛНЫЙ объект, не { weight }
    targets: computeTargets,
  },
});
```

### Anti-Patterns to Avoid

- **Переиспользование `OnboardingWeight.tsx` "как есть" для экрана взвешивания:** компонент при каждом изменении веса пишет и `weight`, и `targetWeight` в `data` (см. `setData((prev) => ({ ...prev, weight: nextWeight, targetWeight: nextWeight }))`). Для еженедельного лёгкого экрана это перезапишет пользовательскую цель по весу каждый раз. Нужно переиспользовать `WeightPicker.tsx` напрямую с собственным `onChange`, не оборачивающий его `OnboardingWeight.tsx`.
- **Публичная (не internal) мутация отправки push:** `sendPushNotification` не должна быть вызываемой напрямую с клиента — иначе любой авторизованный юзер сможет слать произвольные push произвольным пользователям, зная их `userId`. Только `internalAction`/`internalMutation`, триггерится cron-ом или meal-пайплайном.
- **Расчёт "новый бейдж" только на клиенте в момент действия:** т.к. `meal.status = "done"` часто выставляется в фоновом `internalAction` (MEAL-03/04), пользователь может быть не на экране в момент пересечения порога. Начисление бейджа должно быть server-side и идемпотентным (не по факту рендера, а по факту записи в БД), а UI обязан явно опрашивать "непоказанные" бейджи, а не полагаться на колбэк из мутации, вызванной пользователем.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Отправка push с retry/батчингом/обработкой невалидных токенов | Самописный `fetch`-клиент к Expo Push API с ручным retry-логиком | `@convex-dev/expo-push-notifications` | Официальный компонент уже решает батчинг до 100 сообщений/запрос, exponential backoff, парсинг `DeviceNotRegistered` для очистки БД токенов — руками это десятки строк edge-case-кода ради экономии одной npm-зависимости [VERIFIED: официальная страница convex.dev/components/push-notifications] |
| Celebration-конфетти-анимация | Полноценная частичная физика частиц на Reanimated с нуля | Либо `react-native-fast-confetti` (после решения peer-конфликта worklets — см. Alternatives), либо более простая spring/scale-модалка на существующем Reanimated-стеке (прецедент `WeightPicker.tsx`) | Полноценный конфетти-движок — избыточная сложность для D-19, которая явно не требует физики частиц, только "мгновенное празднование" |
| Определение "уже наступила локальная точка 9:00/14:00/20:00" с учётом DST | Ручной парсинг timezone-строк на сервере | Хранить `timezoneOffsetMinutes` (числовой, как уже делает `getStreak`/`getMonthMeals`) и обновлять его при каждом открытии приложения, а не полагаться на IANA-таймзону + библиотеку конвертации | Проект уже выбрал этот паттерн для недельных/месячных границ (`lib/utils/getLocalWeekBounds.ts`, `getLocalMonthBounds.ts`) — числовой offset проще, чем таскать `date-fns-tz`/`Intl`, консистентно с существующим кодом |

**Key insight:** инфраструктура для "серверного знания о времени пользователя" в проекте уже есть (`timezoneOffsetMinutes`), но она текла только в одну сторону — от клиента к query на момент запроса. Push-cron ломает эту модель, т.к. нет запроса в момент отправки. Единственное реальное новое архитектурное решение в этой фазе — сделать `timezoneOffsetMinutes` **хранимым**, а не только query-параметром.

## Common Pitfalls

### Pitfall 1: `updateProfile` затирает `data` целиком
**What goes wrong:** Патч `{ profile: { data: { weight: 80 } } }` удаляет рост, пол, цели и т.д. из профиля.
**Why it happens:** `partial(profilesFields)` из `convex-helpers` делает опциональными только поля верхнего уровня объекта `profilesFields`; `data` как единое целое — один из этих полей, а не набор отдельных патчибельных полей.
**How to avoid:** Всегда читать текущий `profile.data` через `useQuery(getProfile)`, спредить и переопределять только нужные поля перед вызовом `updateProfile`, как уже делает `generateMacroTargets.tsx`.
**Warning signs:** После сохранения нового веса пользователь видит сброшенные настройки роста/цели/goalTrack.

### Pitfall 2: `meals` не хранят тип приёма пищи (завтрак/обед/ужин)
**What goes wrong:** D-12 буквально требует "если блюдо уже записано в соответствующий приём пищи — пропустить push для этой точки", но в схеме `meals` (`convex/tables/meals.ts`) нет поля вроде `mealType`. Прочитанные `status`/`confirmedItems`/`totalMacros` не дают классификации по приёму пищи.
**Why it happens:** Фичи MEAL-01..05 (Phase 7) проектировались без понятия "тип приёма пищи" — это временная сегментация, которую пользователь придаёт блюду неявно, по времени записи.
**How to avoid:** Не вводить новое обязательное поле `mealType` (это расширило бы скоуп за пределы push-фичи и потребовало бы UI-изменений в flow создания блюда, что не обсуждалось и не входит в D-06..D-15). Вместо этого трактовать "точку" как временное окно: для 14:00-точки условие "уже поел" = есть ли `meals` (status `done`, не `deleted`) с `_creationTime` после предыдущей точки (9:00) и до текущей (14:00). Это реализуемо без изменения схемы `meals` и достаточно близко к духу D-11/D-12.
**Warning signs:** Если планировщик выберет буквальную трактовку "приём пищи" и попытается ретроактивно классифицировать существующие блюда по времени — это лишний скоуп, стоит явно проговорить на этапе плана.

### Pitfall 3: Синхронное празднование бейджа не сработает для фоново завершённых блюд
**What goes wrong:** Если celebration-модалка триггерится только из ответа мутации, вызванной действием пользователя (например, подтверждение блюда), она не покажется, когда обработка блюда (детект/поиск кандидатов/КБЖУ) идёт асинхронно в `internalAction` и завершается уже после того, как пользователь ушёл с экрана (штатный сценарий MEAL-03/04).
**Why it happens:** Двухэтапный пайплайн блюда (Phase 7) явно разносит "подтверждение" и "завершение" по времени и по execution context (action vs. клиентский запрос).
**How to avoid:** Начисление бейджа — чисто серверная идемпотентная операция (проверка "уже выдан ли бейдж такого типа/порога этому юзеру" перед insert). UI — отдельный реактивный `useQuery(getUnseenBadge)` на верхнем уровне приложения (например, в `RootLayoutProvider`/на Home), который сам обнаруживает непоказанный бейдж при любом ремаунте/фокусе экрана, независимо от того, где и когда бейдж был начислен.
**Warning signs:** Пользователь никогда не видит celebration-модалку для бейджей, начисленных, пока приложение было свёрнуто или на другом экране.

### Pitfall 4: `expo-notifications` требует правильную SDK-версию, а не latest
**What goes wrong:** `npm view expo-notifications version` даёт `57.0.15` — если поставить его напрямую (`npm install expo-notifications`), версия окажется от Expo SDK 57, а проект зафиксирован на SDK 54 (`"expo": "^54.0.21"`, все остальные `expo-*` пакеты запинены `~`-диапазонами под 54).
**Why it happens:** npm registry `version`-запрос всегда возвращает latest тег, не "совместимую с текущим проектом" версию.
**How to avoid:** Ставить строго через `npx expo install expo-notifications` — эта команда читает `expo` версию из `package.json` и резолвит правильный `expo-notifications@~0.32.x`.
**Warning signs:** `expo-doctor`/`npx expo install --check` сообщает о рассинхроне версий; краши на build, характерные для несовместимых native-модулей.

### Pitfall 5: peer-конфликт `react-native-fast-confetti` vs. запиненный `react-native-worklets`
**What goes wrong:** `npm install react-native-fast-confetti` (latest, `2.0.2`) падает с `ERESOLVE`, т.к. библиотека требует `react-native-worklets >=0.7.0 <1`, а проект использует `0.5.1` (парный с `react-native-reanimated@^4.1.3`).
**Why it happens:** Подтверждено прямой попыткой установки в этой исследовательской сессии (см. Package Legitimacy Audit).
**How to avoid:** Либо не использовать эту библиотеку (рекомендация — кастомная Reanimated-анимация), либо явно завести отдельную задачу на апгрейд `react-native-worklets`/`react-native-reanimated` с оценкой риска для остального приложения (WeightPicker, онбординг-анимации уже завязаны на текущие версии).
**Warning signs:** `npm install` без `--legacy-peer-deps` фейлится сразу на этапе установки зависимости.

## Code Examples

### Регистрация push-токена на клиенте (стандартный Expo-паттерн)
```typescript
// Source: docs.expo.dev/push-notifications/push-notifications-setup/ (CITED)
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId; // уже есть в app.config.ts
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}
```

### Convex cron для ежечасной проверки напоминаний
```typescript
// Source: docs.convex.dev/scheduling/cron-jobs (CITED), адаптировано под домены проекта
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check weigh-in and meal reminders",
  { minutes: 30 }, // грануларность ниже часа — точки 9:00/14:00/20:00 не всегда попадут ровно на границу часа для всех offset-ов
  internal.notifications.checkAllReminders.default
);

export default crons;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Push через Expo Go | Push работает только в dev-client/production сборках | Deprecated в SDK 52, удалено в SDK 53 (Android) | Не блокирует проект — приложение уже требует custom dev client (`@kingstinct/react-native-healthkit`, native-плагины в `app.config.ts`), Expo Go не используется |

**Deprecated/outdated:** нет находок, относящихся напрямую к этой фазе — стек (Expo SDK 54, Reanimated 4, Convex 1.27) достаточно свежий.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | Cron-логику для 9:00/14:00/20:00 лучше реализовать через хранимый `timezoneOffsetMinutes`, обновляемый при каждом открытии приложения, а не через IANA-таймзону | Pattern 1, Don't Hand-Roll | Если пользователь путешествует между таймзонами и не открывает приложение днями, offset устареет и напоминания придут не в то локальное время — приемлемая деградация, не блокер |
| A2 | Трактовка "уже записан приём пищи" как временного окна между точками, а не по явному `mealType` | Pitfall 2 | Если продукт ожидает явную классификацию завтрак/обед/ужин (например, для будущей аналитики), это решение придётся пересматривать вместе со схемой `meals` |
| A3 | `@convex-dev/expo-push-notifications` — правильный выбор транспорта, а не прямой `fetch` | Standard Stack, Don't Hand-Roll | Компонент 2024 года, относительно новый (down to earth: 38K скачиваний/нед, не топ-tier), при недокументированном поведении (retry-политика, лимиты) может потребовать чтения исходников; в худшем случае — замена на прямой `fetch`-клиент без потери архитектуры (интерфейс send остаётся тем же) |
| A4 | Начисление бейджей и стрик-майлстоуны — без отдельного push-канала (per D-20/Claude's Discretion) | Architecture | Явно решено в CONTEXT.md как discretion, не риск |
| A5 | `expo-device`/`Device.isDevice` не обязателен для регистрации токена (официальные доки SDK допускают симулятор/эмулятор) | Code Examples | Если планировщик всё же захочет отсекать симуляторы явно — понадобится добавить `expo-device`, минорная доработка |

**Если таблица пуста:** не применимо — есть 5 позиций, требующих подтверждения на этапе планирования/обсуждения деталей реализации.

## Open Questions

1. **Хранить ли историю веса или только последнее значение?**
   - What we know: CONTEXT.md явно отмечает (Deferred), что история веса не обсуждалась; `profiles.data.weight` — единственное значение, перезаписывается.
   - What's unclear: нужен ли отдельный `weightUpdatedAt` как новое поле схемы (для расчёта "7 дней с последнего ввода") — это минимальное расширение, не полная история, но всё равно требует миграции схемы.
   - Recommendation: добавить `weightUpdatedAt: v.optional(v.number())` в `profilesFields.data` (или top-level) — только таймстемп последнего обновления, без хранения предыдущих значений. Для существующих профилей поле будет `undefined`; cron должен трактовать `undefined` как "напоминание должно сработать" (или взять `profile._creationTime` как fallback-точку отсчёта — на усмотрение планировщика).

2. **Где хранить булевы флаги "push включён" — в `profiles` или отдельной таблице?**
   - What we know: два независимых тумблера (D-09, D-14), должны читаться и клиентом (UI Settings), и cron-ом (backend).
   - What's unclear: `profiles.data` — плотно типизированный union-объект онбординга; логично ли туда добавлять несвязанные с онбордингом флаги.
   - Recommendation: добавить как top-level опциональные поля в `profilesFields` (не внутрь `data`) — например, `weighInRemindersEnabled: v.optional(v.boolean())`, `mealRemindersEnabled: v.optional(v.boolean())`. Так патчить можно точечно через `updateProfile` без риска Pitfall 1 (эти поля не вложены в `data`).

3. **Нужна ли отдельная проверка "не отправлять push дважды за одну и ту же точку", если cron тикает каждые 30 минут, а окно точки шире?**
   - What we know: cron с интервалом < 60 минут может "поймать" одну и ту же локальную точку 9:00 дважды при неудачном совпадении границ.
   - What's unclear: точный механизм дедупликации не определён исследованием.
   - Recommendation: хранить `lastMealReminderSentAt`/`lastWeighInReminderSentAt` (timestamp) рядом с флагами в profiles или в `pushTokens`, и cron должен сверяться с ним перед отправкой (идемпотентность на уровне "не чаще раза в N часов"), а не полагаться на точное совпадение минуты.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| `expo-notifications` | Push weigh-in + push meal reminders (D-06..D-15) | ✗ не установлен | — (ставить `~0.32.17` через `npx expo install`) | нет — это ядро фичи, блокирующая зависимость |
| `@convex-dev/expo-push-notifications` | Транспорт отправки push | ✗ не установлен | `0.3.1` доступен на npm | Fallback: прямой `fetch` к Expo Push API из `internalAction` |
| `convex/crons.ts` | Периодическая проверка напоминаний | ✗ файла нет в проекте | — | нет фолбэка — это единственный механизм серверного планирования в Convex |
| EAS `projectId` (для `getExpoPushTokenAsync`) | Получение push-токена | ✓ уже есть | `616f0145-400b-4a1e-99d8-efea2681653f` в `app.config.ts` `extra.eas.projectId` | — |
| Custom dev client / EAS build (не Expo Go) | Push работает только вне Expo Go с SDK 53+ | ✓ проект уже требует custom dev client (`@kingstinct/react-native-healthkit`, кастомные config-плагины) | — | — |

**Missing dependencies with no fallback:**
- `expo-notifications`, `convex/crons.ts` — обязательны, без них push-фичи (D-06..D-15) невозможны технически.

**Missing dependencies with fallback:**
- `@convex-dev/expo-push-notifications` — можно заменить самописным HTTP-клиентом, но не рекомендуется (см. Don't Hand-Roll).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Нет формального фреймворка (Jest/Vitest отсутствуют — подтверждено: нет `jest.config.*`/`vitest.config.*`, нет `*.test.ts`, `package.json` не содержит `"test"` script) |
| Config file | none |
| Quick run command | `npx ts-node -r tsconfig-paths/register scripts/verify<Name>.ts` — установившийся в проекте паттерн (`scripts/verifyWeekBucketing.ts`, `verifyMonthBucketing.ts`, `verifyGlucoseEstimate.ts`), использует `node:assert/strict` |
| Full suite command | Нет единого раннера — каждый `verify*.ts` запускается отдельным npm-скриптом (`npm run script:verifyWeekBucketing` и т.д.) |

**Важно:** REQUIREMENTS.md (`v2 QA-01/02`) и PROJECT.md явно относят автотесты к v2/вне скоупа майлстоуна; D-04 в CONTEXT.md явно исключает автотесты для онбординг-аудита. Это не отменяет `nyquist_validation` для **новой чистой бизнес-логики** (расчёт даты следующего напоминания, определение точки дня, порог бейджа) — для неё уместен тот же ad-hoc `ts-node`/`assert` паттерн, что уже используется для timezone-логики, а не полноценный test framework.

### Phase Requirements → Test Map

| Req (черновой ID) | Behavior | Test Type | Automated Command | File Exists? |
|--------------------|----------|-----------|---------------------|--------------|
| WEIGH-01 | Напоминание срабатывает через 7 дней от `weightUpdatedAt`, повторяется | unit (pure fn) | `npx ts-node -r tsconfig-paths/register scripts/verifyWeighInReminder.ts` | ❌ Wave 0 |
| MEALPUSH-01 | Правильная точка дня (9:00/14:00/20:00) определяется по `timezoneOffsetMinutes`, с учётом DST-перехода | unit (pure fn) | `npx ts-node -r tsconfig-paths/register scripts/verifyMealReminderWindows.ts` | ❌ Wave 0 |
| MEALPUSH-02 | Push пропускается, если в окне уже есть `meals` (status done, не deleted) | integration (Convex query против тестовых данных) | ручная проверка (нет Convex test harness в проекте) — задокументировать как manual-only | ❌ Wave 0, manual-only оправдан отсутствием Convex test runner |
| BADGE-01 | Бейдж начисляется один раз при пересечении порога (7/30/100 дней; 10/50/100 блюд), повторный вызов идемпотентен | unit (pure fn на входных стрик/count данных) | `npx ts-node -r tsconfig-paths/register scripts/verifyBadgeThresholds.ts` | ❌ Wave 0 |
| ONBOARD-01 | Все ~15 пунктов TODO.md по онбордингу не воспроизводятся | manual-only (per D-04) | ручной прогон пользователем | n/a |

### Sampling Rate
- **Per task commit:** соответствующий `ts-node`-скрипт для затронутой чистой логики (если применимо)
- **Per wave merge:** прогон всех новых `verify*.ts` скриптов + ручная проверка через Convex dashboard/dev-клиент для cron-логики (нет автотестового harness для Convex actions в проекте)
- **Phase gate:** ручной прогон онбординга (D-04) + ручная проверка push на реальном устройстве (push нельзя протестировать в симуляторе Android/iOS без реального APNs/FCM для полного end-to-end, хотя `getExpoPushTokenAsync` формально работает и в эмуляторах с Google Play Services)

### Wave 0 Gaps
- [ ] `scripts/verifyWeighInReminder.ts` — покрывает WEIGH-01
- [ ] `scripts/verifyMealReminderWindows.ts` — покрывает MEALPUSH-01, включая DST-кейс (по прецеденту `scripts/verifyWeekBucketing.ts`, который уже тестирует переход на летнее/зимнее время)
- [ ] `scripts/verifyBadgeThresholds.ts` — покрывает BADGE-01
- [ ] Framework install: не требуется — используется существующий `ts-node`/`tsconfig-paths` паттерн

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V2 Authentication | Косвенно | Все новые mutations/actions обязаны получать `userId` через `getAuthUserId(ctx)`, никогда не принимать `userId` как аргумент от клиента (существующий паттерн во всех проверенных файлах — `getStreak.ts`, `updateProfile.ts`, `getMonthMeals.ts`) |
| V4 Access Control | Да | Таблицы `pushTokens` и `badges` должны фильтроваться по `userId` из auth-контекста при чтении/записи; отправка push — только `internalAction`, недостижима напрямую с клиента (см. Anti-Patterns) |
| V5 Input Validation | Да | Формат Expo push-токена (`ExponentPushToken[...]`) должен проверяться перед сохранением/пересылкой в Expo Push API; вес в лёгком экране должен использовать те же границы, что и `OnboardingWeight.tsx` (30-300 кг / 70-700 lbs), проверяемые и на клиенте, и на сервере |
| V6 Cryptography | Нет | Новых криптографических операций фаза не вводит |

### Known Threat Patterns for Expo/Convex push-инфраструктуры

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Публично вызываемая мутация отправки push с произвольным `userId`/токеном | Spoofing / Denial of Service | Отправка — только `internalAction`/`internalMutation`, триггерится исключительно cron-ом или серверным пайплайном, никогда не экспортируется как публичная Convex-функция |
| IDOR на `badges`/`pushTokens` (юзер A читает/удаляет записи юзера B) | Tampering / Information Disclosure | `userId` всегда из `getAuthUserId(ctx)`, никогда из аргументов запроса — прямое повторение паттерна, уже закреплённого в Phase 6 fix (`revokeLink`, проверка обоих полей участия) |
| Некорректный/поддельный push-токен, отправленный на сервер (не формата `ExponentPushToken[...]`) | Tampering | Валидация формата токена в `recordPushToken` перед записью в БД — предотвращает трату батч-квоты Expo Push API (600/сек лимит) на заведомо невалидные записи |
| Гость (anonymous auth) регистрирует push-токен, затем данные "утекают" при повторной установке / смене гостя | Information Disclosure (низкий риск) | Тот же паттерн, что уже принят проектом для гостевого режима (см. STATE.md Blockers) — не специфичен для push, наследуется как принятый риск майлстоуна |

## Sources

### Primary (HIGH confidence)
- `docs.convex.dev/scheduling/cron-jobs` — синтаксис `cronJobs()`, `interval()`/`daily()`/`cron()`, поддержка `internalMutation`/`internalAction`
- `docs.expo.dev/push-notifications/overview/`, `docs.expo.dev/push-notifications/sending-notifications/`, `docs.expo.dev/push-notifications/push-notifications-setup/`, `docs.expo.dev/versions/latest/sdk/notifications/` — permission flow, `getExpoPushTokenAsync`, HTTP API формат, батчинг/rate-limit
- `raw.githubusercontent.com/expo/expo/sdk-54/packages/expo/bundledNativeModules.json` — точная версия `expo-notifications` для SDK 54 (`~0.32.17`)
- `convex.dev/components/push-notifications`, `github.com/get-convex/expo-push-notifications` — API компонента (`recordToken`, `sendPushNotification`), установка `convex.config.ts`
- Прямое чтение кода проекта: `convex/home/getStreak.ts`, `convex/tables/profiles.ts`, `convex/profiles/updateProfile.ts`, `convex/profiles/completeOnboarding.ts`, `convex/nutrition/computeNutritionTargets.ts`, `components/home/HomeHeader.tsx`, `app/app/(home)/calendar.tsx`, `components/weight/WeightPicker.tsx`, `components/onboarding/steps/basics/OnboardingWeight.tsx`, `app/app/(settings)/generateMacroTargets.tsx`, `app/app/(settings)/health.tsx`, `app/app/(tabs)/settings.tsx`, `components/settings/SettingsItem.tsx`, `convex/tables/meals.ts`, `convex/meals/getMonthMeals.ts`, `convex/meals/analyze/processDetectedItems.ts`, `convex/meals/analyze/processDetectedItemsAction.ts`, `app.config.ts`, `package.json`
- Прямая проверка `npm view`/`slopcheck install` в этой сессии для `expo-notifications`, `@convex-dev/expo-push-notifications`, `react-native-fast-confetti` (включая обнаруженный peer-конфликт)

### Secondary (MEDIUM confidence)
- WebSearch, кросс-проверенный официальными источниками: сравнение версий `expo-notifications` для SDK 54, обзор конфетти-библиотек (сами библиотеки после верифицированы через `npm view`/`slopcheck`)

### Tertiary (LOW confidence)
- Нет находок только из WebSearch без верификации, оставленных в финальном документе как факты — все спорные моменты вынесены в Assumptions Log / Open Questions

## Metadata

**Confidence breakdown:**
- Standard stack (push): HIGH — оба ключевых пакета верифицированы через официальные источники + npm + slopcheck
- Architecture (push cron + timezone): MEDIUM — паттерн cron стандартный (Convex docs), но "склейка" с хранимым offset — экстраполяция существующего в проекте паттерна, не найдена готовой в коде
- Геймификация/бейджи: MEDIUM — модель данных прямолинейна, но конкретные пороги и точный UX celebration — discretion пользователя, не зафиксированы жёстко
- Pitfalls: HIGH — все 5 pitfalls подтверждены прямым чтением кода или прямой попыткой установки пакета в этой сессии, не догадки
- Онбординг-аудит: HIGH — весь список TODO.md-пунктов сверен построчно с CONTEXT.md, полное совпадение

**Research date:** 2026-08-30
**Valid until:** 30 дней (стек Expo/Convex обновляется быстро; версии `expo-notifications`/`@convex-dev/expo-push-notifications` желательно перепроверить прямо перед началом реализации, если планирование отложится)

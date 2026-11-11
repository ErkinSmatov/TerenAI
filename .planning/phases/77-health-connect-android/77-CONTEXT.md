# Phase 77: Health Connect для Android и запрос доступа к здоровью - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning (исследование РЕКОМЕНДОВАНО: новая нативная зависимость)
**Source:** Замечание пользователя + разбор кода в сессии 2026-11-11 (решения приняты пользователем в диалоге)

<domain>
## Phase Boundary

Замечание пользователя (срочно): «при входе через Android у меня не спросило синхронизации с Google Fit или какие у них приложения, нужно поправить срочно».

Две части:
1. **Android: интеграция через Health Connect.** Сейчас её нет совсем (см. причины). Нужно по образцу iOS: подключение, разрешения, синхронизация шагов, активной энергии, дистанции и (для трека с глюкометром) глюкозы.
2. **Запрос доступа к здоровью на обеих платформах.** Решение пользователя: и в Настройки → Здоровье, и предложение сразу после онбординга (iOS и Android). Автоматического предложения сейчас нет и на iOS.

Вне объёма: запись данных в Health Connect/Apple Health (приложение только читает), Google Fit REST/SDK (выводится из эксплуатации), носимые устройства и другие типы данных (сон, пульс, вес), редизайн экрана «Здоровье».
</domain>

<decisions>
## Implementation Decisions

### Причины (подтверждены чтением кода)
- `lib/health/healthKit.ts`: все функции начинаются с `if (Platform.OS !== "ios") return …` (`isHealthKitConnected`, `connectHealthKit`, `fetchRecentMovement`, `fetchRecentGlucoseSamples`); единственная нативная библиотека — `@kingstinct/react-native-healthkit` (`package.json`).
- `lib/hooks/useHealthKitSync.ts` вызывается на главной (`app/app/(tabs)/index.tsx`, `useHealthKitSync(isGlucometerTrack)`), синхронизирует только если `isHealthKitConnected()` (флаг в SecureStore `healthkit_connected`).
- `app/app/(settings)/health.tsx`: на Android показывает «Интеграция со здоровьем пока доступна только на iOS»; запрос доступа на iOS возникает только по кнопке «Подключить Apple Health» (`connectHealthKit`). Вызовов `connectHealthKit` в онбординге нет.
- `app.config.ts`: есть плагин `@kingstinct/react-native-healthkit` с `NSHealth*UsageDescription`, но нет Android-плагинов и разрешений для здоровья; `android/app/src/main/AndroidManifest.xml` содержит только CAMERA, INTERNET, READ/WRITE_EXTERNAL_STORAGE, RECORD_AUDIO, SYSTEM_ALERT_WINDOW, VIBRATE. Каталоги `ios/` и `android/` закоммичены (prebuild-workflow): осторожно с `expo prebuild --clean`.

### Android: Health Connect
- Использовать **Health Connect**, не Google Fit (Google Fit API закрыт для новых приложений и выводится из эксплуатации; подтвердить актуальным источником на этапе исследования).
- Данные (как на iOS): шаги (`Steps`), активная энергия (`ActiveCaloriesBurned`), дистанция (`Distance`), глюкоза (`BloodGlucose`, только для трека с глюкометром, `hasHealthBlocks(goalTrack)`). Только чтение.
- Библиотека и конфиг-плагин: выбрать на исследовании (кандидат — `react-native-health-connect` с Expo-плагином). Обязательно проверить совместимость с Expo SDK 54, React Native 0.81, New Architecture (`newArchEnabled: true`) и `minSdkVersion`.
- Требования Health Connect, которые нельзя забыть: разрешения в манифесте (`android.permission.health.READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_DISTANCE`, `READ_BLOOD_GLUCOSE`), activity/intent-filter экрана объяснения доступа (rationale) и обработка отсутствия приложения Health Connect (на Android ≤ 13 его нужно установить из Play Маркета; на Android 14+ он встроен в систему), запрос на фоновое/историческое чтение при необходимости, декларация использования данных здоровья в Play Console (внешняя работа пользователя).
- Единая платформенная абстракция в `lib/health/`: общий интерфейс (`isConnected`, `connect`, `fetchRecentMovement`, `fetchRecentGlucoseSamples`) с реализациями HealthKit (iOS) и Health Connect (Android); хук синхронизации и экран «Здоровье» вызывают абстракцию, а не конкретную библиотеку. Переименовать `useHealthKitSync` допустимо, если нужно.

### Сервер
- Источник данных различать: у `glucoseReadings.source` сейчас `v.union("manual", "healthkit")` (`convex/tables/glucoseReadings.ts`), добавить значение `healthconnect` (аддитивное изменение схемы, миграция не нужна); поле идентификатора образца `healthKitUuid` и индекс `byUserIdAndHealthKitUuid` переиспользовать или ввести нейтральное имя — решение планировщика с учётом дедупликации.
- Новый путь импорта обязан быть устойчивым: **батчи** (не более ~200–500 показаний на одну мутацию, лимит записей Convex 8192) и **инкрементальная выборка** (запоминать время последней синхронизации, а не запрашивать каждый раз 30 дней). Сейчас `lib/hooks/useHealthKitSync.ts` отправляет все показания за 30 дней одной мутацией `convex/glucose/importHealthKitReadings.ts` — для пользователей CGM это превышает лимиты (найдено аудитом 2026-11-04). Исправить это для обеих платформ в рамках фазы.
- Валидация диапазонов глюкозы уже есть (`lib/health/healthRanges.ts`, фаза 75): нереальные значения при импорте пропускаются. Сохранить это поведение для Health Connect.
- `convex/movement/syncDays.ts`: источник движения не различается; дата `YYYY-MM-DD` считается по локальному времени устройства (как на iOS).

### Запрос доступа после онбординга (iOS и Android)
- Предложение подключить данные здоровья сразу после онбординга: экран или модальное окно с объяснением, зачем нужны данные («шаги и активность на главной, глюкоза для трека с глюкометром»), кнопки «Подключить» и «Не сейчас». Отказ не блокирует приложение; подключить можно позже в Настройки → Здоровье.
- Показывать один раз (флаг в MMKV через `AppContext`/`zod/schemas/AppDataSchema.ts` или SecureStore), не повторять навязчиво.
- Онбординг (`components/onboarding/Onboarding.tsx`, `context/OnboardingContext.tsx`) помечен в аудите как хрупкий: изменять осторожно, лучше показывать предложение после завершения онбординга, на главном экране или в конце потока, а не вставлять новый шаг в сложную анимированную цепочку. Тексты на русском; название приложения «Teren».
- Для трека без глюкометра запрашивать только шаги/активность/дистанцию; глюкозу — только для `hasHealthBlocks`.

### Общие ограничения
- Базовая линия: `npx tsc --noEmit` и `npx eslint .` без ошибок и после каждого плана; тестового раннера нет, вручную проверять на устройстве; для чистых функций (маппинг, батчи) — verify-скрипты в стиле `scripts/verify*.ts`.
- Требуется нативная пересборка Android (dev-сборка / EAS) — выкатка через OTA невозможна для нативных изменений. Деплой Convex на dev (`npx convex dev --once`); отдельного prod-деплоя у проекта нет (TestFlight/сборки смотрят на `keen-meerkat-110`).
- Комментарии и сообщения на русском (CLAUDE.md). Конвенции проекта: `type` вместо `interface`, `logError` в обработчиках, цвета через `getColor` с подпиской на тему (см. Phase 76).
- Не затрагивать iOS-поведение без необходимости: HealthKit должен продолжать работать как сейчас.

### Claude's Discretion
- Выбор конкретной библиотеки Health Connect и вида абстракции в `lib/health/`.
- Разбиение на планы и волны (рекомендация: план 1 — исследование и нативная конфигурация Android (плагин, разрешения, rationale); план 2 — абстракция `lib/health/` + реализация Health Connect; план 3 — сервер (схема, батчи, инкрементальность) + хук синхронизации; план 4 — экран «Здоровье» и предложение после онбординга; план 5 — проверка на устройстве Android и iOS, checkpoint).
- Тексты предложения и объяснений разрешений.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `lib/health/healthKit.ts` — текущая iOS-интеграция (образец функций)
- `lib/hooks/useHealthKitSync.ts` — синхронизация при возврате в приложение, троттлинг 5 минут
- `app/app/(settings)/health.tsx` — экран «Здоровье»
- `app/app/(tabs)/index.tsx` — вызов синхронизации на главной
- `convex/glucose/importHealthKitReadings.ts`, `convex/movement/syncDays.ts`, `convex/tables/glucoseReadings.ts`, `convex/tables/movementData.ts` — серверная часть
- `lib/health/healthRanges.ts`, `scripts/verifyHealthRanges.ts` — валидация диапазонов (фаза 75)
- `lib/profile/hasHealthBlocks.ts` — когда нужна глюкоза
- `app.config.ts`, `plugins/withHealthkitSwiftCompileFix.js`, `plugins/withIosMinDeploymentTarget.js` — конфиг и плагины сборки
- `android/app/src/main/AndroidManifest.xml` — текущие разрешения Android
- `components/onboarding/Onboarding.tsx`, `context/OnboardingContext.tsx`, `context/AppContext.tsx`, `zod/schemas/AppDataSchema.ts` — онбординг и локальные флаги
- `.planning/phases/68-apple-health/` — материалы фазы Apple Health (контекст и решения для iOS)
- `.planning/ROADMAP.md` (Phase 77), `CLAUDE.md`
</canonical_refs>

<specifics>
## Specific Ideas

- Формулировка пользователя: «при входе через андроид у меня не спросило синхронизации с google fit или какие у них приложения, нужно поправить срочно».
- Ожидание: приложение само предлагает подключить данные здоровья, как это ожидается от приложения для питания и глюкозы.
</specifics>

<deferred>
## Deferred Ideas

- Запись данных в Health Connect / Apple Health (питание, вес) — не обсуждалось.
- Другие типы данных (пульс, сон, вес, давление из Health Connect) — отдельной фазой.
- Фоновая синхронизация без открытия приложения — отдельной фазой.
</deferred>

---

*Phase: 77-health-connect-android*
*Context gathered: 2026-11-11*

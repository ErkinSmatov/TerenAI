# Phase 77: Health Connect для Android и запрос доступа к здоровью - Research

**Researched:** 2026-11-11
**Domain:** Android Health Connect в Expo SDK 54 / RN 0.81 (New Architecture) + платформенная абстракция здоровья + устойчивый импорт в Convex
**Confidence:** MEDIUM-HIGH (API и ограничения Health Connect подтверждены официальной документацией и чтением исходников библиотеки; совместимость библиотеки с RN 0.81 + New Arch подтверждается только сборкой на устройстве, см. Open Questions)

## Summary

Google Fit больше нельзя использовать как основу: по официальной странице Android Developers Google Fit APIs (включая REST) «будут выведены из эксплуатации в 2026 году», регистрация новых разработчиков закрыта с 1 мая 2024 г.; точной даты отключения в официальном тексте нет [CITED: developer.android.com/health-and-fitness/guides/health-connect/migrate/fit-apis-end-of-service]. Рекомендованная замена для Android-приложения: Health Connect (данные на устройстве, один набор разрешений). Решение пользователя (Health Connect) подтверждено.

Библиотека: `react-native-health-connect` 4.1.3 (npm, 2026-08-06). Начиная с v4.0.0 Expo-интеграция входит в сам пакет (config plugin `app.plugin.js` + Expo-модуль, регистрирующий permission delegate), отдельный пакет `expo-health-connect` объявлен deprecated и его ставить нельзя (двойные классы ломают сборку) [VERIFIED: npm view expo-health-connect deprecated; исходники пакета 4.1.3]. Плагин добавляет только rationale-intent-filter на MainActivity и `activity-alias ViewPermissionUsageActivity`; разрешения `READ_*` плагин НЕ добавляет — их надо объявить через `android.permissions` в `app.config.ts`. `<queries>` для пакета Health Connect приходит из манифеста самой библиотеки (merge). Нужны `minSdkVersion 26` (у Expo SDK 54 по умолчанию 24, поэтому через `expo-build-properties` поднять) и `compileSdk 36` (уже по умолчанию, `connect-client 1.1.0` требует compileSdk 36 и AGP ≥ 8.9.1; у RN 0.81 AGP 8.11.0).

Главные «подводные камни» для планировщика, найденные в коде проекта: (1) `android/` и `ios/` в `.gitignore` (`git ls-files android` пусто), вопреки формулировке CONTEXT «закоммичены»: источник правды — `app.config.ts` + prebuild, ручные правки `AndroidManifest.xml` бессмысленны; (2) Android скрыт в четырёх местах за `Platform.OS === "ios"`: пункт «Здоровье» в `app/app/(tabs)/settings.tsx:135` (пользователь Android до экрана вообще не доходит), запрос движения на главной `app/app/(tabs)/index.tsx:86`, `app/app/(home)/day/[date].tsx:100,127`; (3) лимиты Convex на самом деле такие: массив в аргументе ≤ 8 192 элемента и ≤ 4 096 вызовов `db.get`/`db.query` на транзакцию, поэтому текущий импорт (по одному `db.query` на показание) падает уже на ~4 096 показаниях CGM; батч 200 безопасен.

**Primary recommendation:** Поставить `react-native-health-connect@4.1.3` (+ `android.permissions` и `expo-build-properties.android.minSdkVersion: 26` в `app.config.ts`), вынести платформенную абстракцию `lib/health/healthProvider.ts` с реализациями HealthKit/Health Connect, читать движение через `aggregateGroupByPeriod` (DAYS, локальное время), глюкозу через `readRecords` с пагинацией, отправлять на сервер батчами по 200 в новую мутацию с аргументом `source`, хранить время последней синхронизации в MMKV по пользователю; предложение подключить здоровье показывать компонентом в `app/app/_layout.tsx` после онбординга (без правок `Onboarding.tsx`).

## Project Constraints (from CLAUDE.md)

- Отвечать и писать комментарии/сообщения на русском языке [CITED: /Users/smatov/GitLab/CalYo/CLAUDE.md].
- Из CONTEXT: `type` вместо `interface`, `logError` в обработчиках, цвета через `getColor` с подпиской на тему (Phase 76), название приложения в UI «Teren».
- Базовая линия: `npx tsc --noEmit` и `npx eslint .` без ошибок после каждого плана. Тестового раннера нет. Комментарии/сообщения на русском.
- Не ломать iOS-поведение HealthKit.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Использовать **Health Connect**, не Google Fit (подтверждено исследованием, см. ниже).
- Данные (как на iOS): шаги (`Steps`), активная энергия (`ActiveCaloriesBurned`), дистанция (`Distance`), глюкоза (`BloodGlucose`, только для трека с глюкометром, `hasHealthBlocks(goalTrack)`). Только чтение.
- Требования Health Connect: разрешения в манифесте (`READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_DISTANCE`, `READ_BLOOD_GLUCOSE`), activity/intent-filter экрана объяснения доступа (rationale), обработка отсутствия приложения Health Connect (Android ≤13 нужно ставить из Play, на 14+ встроено), запрос фонового/исторического чтения при необходимости, декларация в Play Console (внешняя работа пользователя).
- Единая платформенная абстракция в `lib/health/`: общий интерфейс (`isConnected`, `connect`, `fetchRecentMovement`, `fetchRecentGlucoseSamples`) с реализациями HealthKit и Health Connect; хук синхронизации и экран «Здоровье» вызывают абстракцию. Переименовать `useHealthKitSync` допустимо.
- Сервер: `glucoseReadings.source` расширить литералом `healthconnect` (аддитивно, миграция не нужна); поле `healthKitUuid`/индекс `byUserIdAndHealthKitUuid` переиспользовать или ввести нейтральное имя — решение планировщика с учётом дедупликации.
- Импорт обязан быть устойчивым: батчи (≤ ~200–500 показаний на мутацию) и инкрементальная выборка (запоминать время последней синхронизации). Исправить для обеих платформ.
- Валидация диапазонов глюкозы (`lib/health/healthRanges.ts`) сохранить для Health Connect.
- `convex/movement/syncDays.ts`: источник движения не различается; дата `YYYY-MM-DD` по локальному времени устройства.
- Предложение подключить здоровье сразу после онбординга (iOS и Android): экран/модалка с объяснением, кнопки «Подключить» и «Не сейчас», показывать один раз (флаг в MMKV через `AppContext`/`AppDataSchema` или SecureStore), отказ не блокирует; повторно — из Настройки → Здоровье. Онбординг (`Onboarding.tsx`, `OnboardingContext.tsx`) хрупкий — не вставлять новый шаг, показывать после завершения. Тексты на русском. Для трека без глюкометра запрашивать только шаги/активность/дистанцию.
- Нативная пересборка Android (dev-сборка/EAS), OTA невозможна. Деплой Convex на dev (`npx convex dev --once`); отдельного prod нет (`keen-meerkat-110`).
- Не затрагивать iOS без необходимости.

### Claude's Discretion
- Выбор библиотеки Health Connect и вида абстракции в `lib/health/`.
- Разбиение на планы и волны (рекомендация: план 1 — исследование и нативная конфигурация Android; план 2 — абстракция + Health Connect; план 3 — сервер + хук; план 4 — экран «Здоровье» и предложение после онбординга; план 5 — проверка на устройстве, checkpoint).
- Тексты предложения и объяснений разрешений.

### Deferred Ideas (OUT OF SCOPE)
- Запись данных в Health Connect / Apple Health.
- Другие типы данных (пульс, сон, вес, давление из Health Connect).
- Фоновая синхронизация без открытия приложения.
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Доступность Health Connect, запрос разрешений, чтение данных | Клиент (нативный модуль RN) | — | Данные лежат на устройстве, доступ только через Android SDK |
| Нативная конфигурация (разрешения, rationale, queries, minSdk) | Сборка (Expo config plugins/prebuild) | — | `android/` в gitignore, генерируется prebuild |
| Агрегация по дням, маппинг единиц, валидация диапазонов | Клиент (чистые функции `lib/health/`) | Сервер (повторная валидация диапазонов) | Дата по локальному времени устройства; сервер — защитный рубеж |
| Батчирование и инкрементальная синхронизация | Клиент (хук + MMKV) | Сервер (идемпотентность по внешнему id) | Клиент знает, что уже отправлено; сервер обязан быть идемпотентным |
| Дедупликация показаний | Сервер (индекс `byUserIdAndHealthKitUuid`) | Клиент (дедуп внутри пачки) | Единственная точка истины |
| Предложение подключить здоровье после онбординга | Клиент (компонент в `app/app/_layout.tsx`) | MMKV (флаг «показано») | После `hasCompletedOnboarding`; без правок онбординга |
| Декларация данных здоровья, политика конфиденциальности | Play Console (внешняя работа) | Приложение (ссылка на политику) | Требование Google Play |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native-health-connect` | 4.1.3 (2026-08-06) [VERIFIED: npm view] | Чтение Health Connect + Expo config plugin + permission delegate | Де-факто стандарт RN для Health Connect (~390 тыс. загрузок/нед., создан в 2022, репозиторий matinzd/react-native-health-connect, MIT); Expo-модуль включён с v4 |
| `expo-build-properties` | ~1.0.10 (уже в проекте) | `android.minSdkVersion: 26` (+ явно `compileSdkVersion/targetSdkVersion: 36`) | Официальный способ в Expo для перекрытия SDK-версий |
| `androidx.health.connect:connect-client` | 1.1.0 (транзитивно через библиотеку) [VERIFIED: android/build.gradle пакета] | Нативный SDK Health Connect | Требует compileSdk 36 и AGP ≥ 8.9.1 [CITED: developer.android.com get-started] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-mmkv` | ^3.3.1 (есть) | Хранение времени последней синхронизации и флага «предложение показано» | Не секрет, быстрый синхронный доступ; `lib/storage/mmkv.ts` |
| `expo-secure-store` | ~15.0.7 (есть) | Флаг «подключено» (как сейчас `healthkit_connected`) | Сохранить ключ iOS без изменений |
| `@kingstinct/react-native-healthkit` | ^14.0.2 (есть) | iOS | Не менять |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-native-health-connect` | `expo-health-connect` 0.1.1 | Deprecated, слит в v4, вызывает дубликат классов — НЕ использовать |
| `react-native-health-connect` | Собственный Expo-модуль на Kotlin | Лишняя нативная поддержка; нет смысла |
| Health Connect | Google Fit / Google Health API (облачный, привязан к аккаунту) | Fit закрывается; Google Health API — отдельный облачный продукт с OAuth, вне объёма |

**Installation:**
```bash
npm install react-native-health-connect@4.1.3
# expo-build-properties уже установлен; expo-health-connect НЕ ставить
```

**Version verification:** `npm view react-native-health-connect version` → 4.1.3, modified 2026-08-06; peerDependencies `expo: *`, `react-native: *`, `@expo/config-plugins >= 6.0.2` (опциональные) [VERIFIED: npm registry, 2026-11-11]. Релизы: 4.0.0 (2026-08-01, Expo bundled, breaking), 4.1.0 (connect-client 1.1.0 stable), 4.1.1 (period aggregation через локальный фильтр — критично для суточной агрегации), 4.1.3 (2026-08-06) [CITED: github.com/matinzd/react-native-health-connect/releases]. Пинить не ниже 4.1.1; рекомендовано точно `4.1.3`.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| react-native-health-connect | npm | ~4.5 лет (создан 2022-05-11) | ~390k/нед. (2026-11-04..10) | github.com/matinzd/react-native-health-connect | не запускался (установка slopcheck отклонена средой) | [ASSUMED] по правилам протокола; ручные признаки легитимности хорошие: нет `postinstall`, распаковка tarball и чтение исходников 4.1.3 не выявили сетевых вызовов, на него ссылается deprecation-сообщение `expo-health-connect` |
| expo-health-connect | npm | — | — | — | — | НЕ УСТАНАВЛИВАТЬ (deprecated, дубль классов) |

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck не выполнялся)
**Packages flagged as suspicious [SUS]:** none; но по протоколу пакет помечен `[ASSUMED]` — планировщик добавляет короткий `checkpoint:human-verify` перед `npm install` (пользователь сверяет страницу npm/репозиторий).

## Architecture Patterns

### System Architecture Diagram

```
Вход приложения (home) / кнопка в Настройки → Здоровье / предложение после онбординга
        |
        v
 lib/health/healthProvider.ts  (Platform.OS → iOS: healthKit.ts ; Android: healthConnect.ts)
        |-- getAvailability()  → ok | needsInstall | unsupported   (Android: getSdkStatus)
        |-- isConnected()      → флаг SecureStore И (Android) getGrantedPermissions содержит READ_STEPS
        |-- connect(includeGlucose) → requestAuthorization (iOS) / initialize+requestPermission (Android)
        |-- fetchRecentMovement(days) → MovementDay[]  (aggregateGroupByPeriod DAYS ×3 / HK statistics)
        |-- fetchGlucoseSamples(since) → HealthGlucoseSample[] (readRecords + pageToken / HK query)
        v
 useHealthSync (бывш. useHealthKitSync): троттлинг 5 мин, AppState "active"
        |-- движение: 8 дней → syncDays (1 вызов, ≤ 8 элементов)
        |-- глюкоза: since = max(lastSync − 24ч, now − 30д) → дедуп в пачке → chunk(200)
        |        → последовательно importGlucoseReadings({source, readings}) ; после ВСЕХ пачек пишет lastSync в MMKV
        v
 Convex: importGlucoseReadings (v.array ≤ 8192; 1 db.query на показание ≤ 4096)
        |-- getAuthUserId → isGlucoseValueValid → индекс byUserIdAndHealthKitUuid → insert (source: healthkit | healthconnect)
```

### Recommended Project Structure
```
lib/health/
├── healthProvider.ts      # публичный фасад: единый интерфейс, выбор по Platform.OS
├── healthTypes.ts         # MovementDay, HealthGlucoseSample, Availability (type, без RN-импортов)
├── healthKit.ts           # iOS (существует; подогнать под общий тип, поведение не менять)
├── healthConnect.ts       # Android: react-native-health-connect
├── healthMapping.ts       # ЧИСТЫЕ функции: ключ даты, маппинг агрегатов, единицы, chunk, расчёт since (для verify-скрипта)
├── healthSyncState.ts     # MMKV: lastSync по userId, флаг "предложение показано"
├── healthRanges.ts        # (есть)
└── logHealthKitSync.ts    # (есть; переиспользовать, category можно сделать нейтральной)
components/health/HealthAccessPrompt.tsx   # модалка-предложение после онбординга
scripts/verifyHealthSync.ts                # verify-скрипт чистых функций
```

### Pattern 1: Конфигурация Expo (app.config.ts)
**What:** добавить плагин библиотеки, разрешения Android и minSdk.
**Example:**
```ts
// Source: README react-native-health-connect (Expo installation) + исходники app.plugin.js 4.1.3
android: {
  // ...существующие поля
  permissions: [
    "android.permission.health.READ_STEPS",
    "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
    "android.permission.health.READ_DISTANCE",
    "android.permission.health.READ_BLOOD_GLUCOSE",
  ],
},
plugins: [
  // ...
  "react-native-health-connect",
  ["expo-build-properties", {
    ios: { deploymentTarget: "16.0" },
    android: { minSdkVersion: 26, compileSdkVersion: 36, targetSdkVersion: 36 },
  }],
],
```
Плагин сам добавляет: intent-filter `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` в MainActivity и `<activity-alias android:name="ViewPermissionUsageActivity" ... START_VIEW_PERMISSION_USAGE>` с `VIEW_PERMISSION_USAGE` + категорией `HEALTH_PERMISSIONS` [VERIFIED: исходник app.plugin.js 4.1.3]. Expo-модуль регистрирует `HealthConnectPermissionDelegate` в `onCreate` ReactActivity автоматически — `MainActivity.kt` править не надо [VERIFIED: исходник HealthConnectPermissionReactActivityHandler.kt]. `<queries><package android:name="com.google.android.apps.healthdata"/></queries>` добавляется манифестом библиотеки при merge [VERIFIED: android/src/main/AndroidManifest.xml пакета; проверить в merged manifest].

### Pattern 2: Доступность и разрешения
```ts
// Source: исходники src/index.tsx и constants.ts пакета 4.1.3; Android get-started
import {
  getSdkStatus, initialize, requestPermission, getGrantedPermissions,
  openHealthConnectSettings, SdkAvailabilityStatus,
} from "react-native-health-connect";

const status = await getSdkStatus(); // 1 UNAVAILABLE, 2 PROVIDER_UPDATE_REQUIRED, 3 AVAILABLE
if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return "needsInstallOrUpdate"; // см. Pitfall 5
await initialize();                    // обязателен до чтения/запроса
const granted = await requestPermission([
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
  { accessType: "read", recordType: "Distance" },
  ...(includeGlucose ? [{ accessType: "read", recordType: "BloodGlucose" } as const] : []),
]);
const connected = granted.some((p) => p.recordType === "Steps");
```
Права можно выдать частично; считать подключённым, если выдан хотя бы один из трёх базовых; перед каждой синхронизацией сверять `getGrantedPermissions()` (права можно отозвать в любой момент) [CITED: developer.android.com get-started, «Because users can grant or revoke permissions at any time…»].

### Pattern 3: Суточная агрегация движения (локальные даты)
```ts
// Source: исходники пакета: getTimeRangeFilterLocal + ReactStepsRecord.parseAggregationResultGroupedByPeriod
// Время передавать как ISO-инстант (Instant.parse); библиотека сама переводит в LocalDateTime
// по ZoneId.systemDefault(); результат startTime — LocalDateTime.toString(), напр. "2026-11-10T00:00"
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const anchor = new Date(startOfToday); anchor.setDate(anchor.getDate() - (days - 1));
const range = { operator: "between", startTime: anchor.toISOString(), endTime: now.toISOString() } as const;
const slicer = { period: "DAYS", length: 1 } as const;
const [steps, energy, dist] = await Promise.all([
  aggregateGroupByPeriod({ recordType: "Steps", timeRangeFilter: range, timeRangeSlicer: slicer }),
  aggregateGroupByPeriod({ recordType: "ActiveCaloriesBurned", timeRangeFilter: range, timeRangeSlicer: slicer }),
  aggregateGroupByPeriod({ recordType: "Distance", timeRangeFilter: range, timeRangeSlicer: slicer }),
]);
// ключ даты: g.startTime.slice(0, 10)  (YYYY-MM-DD, локальная дата — без Date-конвертаций)
// значения: g.result.COUNT_TOTAL ; g.result.ACTIVE_CALORIES_TOTAL.inKilocalories ; g.result.DISTANCE.inMeters
```
Не использовать `dataOriginFilter` для шагов (см. Pitfall 6). `aggregateGroupByDuration` с `DAYS` — фиксированные 24 ч от начала диапазона и игнорирует переход на летнее время; для календарных суток использовать `aggregateGroupByPeriod` [CITED: комментарий в src/types/base.types.ts пакета; Android docs: период для `LocalDateTime`-фильтра].

### Pattern 4: Чтение глюкозы с пагинацией
```ts
// Source: src/types/records.types.ts, results.types.ts (BloodGlucoseRecordResult), Android read-data docs
let pageToken: string | undefined;
do {
  const res = await readRecords("BloodGlucose", {
    timeRangeFilter: { operator: "between", startTime: since.toISOString(), endTime: new Date().toISOString() },
    ascendingOrder: false, pageSize: 1000, pageToken,
  });
  for (const r of res.records) {
    // r.level = { inMillimolesPerLiter, inMilligramsPerDeciliter } (на ЧТЕНИИ, не {value, unit})
    // r.time (ISO), r.metadata?.id (стабильный id записи HC), r.metadata?.dataOrigin (пакет-источник)
  }
  pageToken = res.pageToken ? res.pageToken : undefined; // "" тоже означает конец (Android 12/13)
} while (pageToken);
```
Единицы: Health Connect хранит значение независимо от единицы показа и отдаёт оба представления. Для совместимости с iOS-веткой (там берётся предпочтительная единица пользователя) на Android выбрать единицу по локали/профилю: рекомендация — `mmol/L` с округлением до 0.1 (`Math.round(x*10)/10`), `mg/dL` — только если в проекте уже определена настройка единиц (поиск по коду глюкозного блока не нашёл настройки `glucoseUnit` — решение планировщика/пользователя, см. Open Questions). Значения, не прошедшие `isGlucoseValueValid`, отбрасывать до отправки (как сейчас на сервере).

### Pattern 5: Предложение после онбординга (без правок онбординга)
После завершения онбординга `Onboarding.tsx:274` делает `router.replace("/app")`, а `app/app/_layout.tsx` рендерится только когда `isAuthenticated && hasCompletedOnboarding`. Это естественная точка: добавить `<HealthAccessPrompt />` рядом с `<MealCompletionWatcher />`. Компонент: читает флаг MMKV `health_prompt_seen_v1`; если не показывали, платформа поддерживает здоровье (iOS `isHealthDataAvailable` / Android `getSdkStatus`), здоровье ещё не подключено — показывает `AlertDialog`/`BottomSheet` (есть в `components/ui`) с текстом и кнопками «Подключить» / «Не сейчас»; флаг ставится при любом исходе (показ = один раз). Профиль (`goalTrack`) уже загружен к этому моменту (`isProfileLoading` гейтится в layout), поэтому `hasHealthBlocks` доступен для решения о запросе глюкозы. Существующие пользователи (уже прошедшие онбординг) тоже увидят предложение один раз — приемлемо, пропускать если уже подключено. [ASSUMED: UX-выбор; соответствует решению CONTEXT].

### Pattern 6: Батчи и инкрементальность
- `chunk(array, 200)` + последовательные `await` мутаций (не `Promise.all`, чтобы не создавать пик нагрузки и сохранять порядок).
- `since = max(lastSyncAt − 24ч, now − 30д)`; первый запуск: 30 дней. `lastSyncAt` = момент начала успешной синхронизации (не `max(recordedAt)`, чтобы не зависеть от лагающих источников), пишется ТОЛЬКО после успешной отправки всех пачек. Перекрытие 24 ч — страховка от опоздавших записей CGM, дубли гасит серверный индекс.
- Ключ MMKV с userId: `health_glucose_last_sync_<userId>` (иначе при смене аккаунта на том же устройстве показания нового пользователя будут пропущены). userId брать из профиля/`AuthContext`.
- Ограничение 30 дней: без `READ_HEALTH_DATA_HISTORY` чтение старше 30 дней до первой выдачи разрешения даёт ошибку [CITED: developer.android.com read-data]. Окно `[now − 30д, now]` после выдачи разрешения всегда внутри допустимого (граница «30 дней до первой выдачи» левее). Историческое/фоновое разрешение не запрашивать (минимальный набор типов для ревью Play; фоновая синхронизация — deferred).

### Anti-Patterns to Avoid
- **Суммировать `readRecords` по шагам/калориям:** двойной счёт при нескольких источниках; официальная рекомендация — `aggregate*` (дедуплицирует по приоритету источников) [CITED: read-data docs].
- **Править `android/AndroidManifest.xml` руками:** каталог в `.gitignore`, перезапишется prebuild/EAS.
- **Ставить `expo-health-connect` вместе с `react-native-health-connect@4`:** duplicate class.
- **Вызывать `revokeAllPermissions()` как «Отключить»:** отзыв вступает в силу только после перезапуска процесса; отключать флагом в приложении и вести в системные настройки (`openHealthConnectSettings`) [CITED: JSDoc пакета].
- **Отправлять 30 дней глюкозы одной мутацией:** падает по лимитам Convex.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Дедупликация шагов/калорий/дистанции между источниками | Свой алгоритм по `readRecords` | `aggregateGroupByPeriod` | Платформа применяет приоритеты источников |
| Мост JS↔Health Connect, ActivityResult для запроса прав | Свой Expo-модуль | `react-native-health-connect` (+ bundled Expo delegate) | Права запрашиваются через Activity result contract |
| rationale-activity и alias для Android 14 | Ручные правки манифеста | Плагин `react-native-health-connect` | Уже реализован и идемпотентен |
| Переход на локальные сутки | Ручной пересчёт таймзон | Период `DAYS` + `startTime.slice(0,10)` | Локальный `LocalDateTime` из нативного слоя |
| Валидация диапазонов глюкозы | Новые пороги | `isGlucoseValueValid` (`lib/health/healthRanges.ts`) | Фаза 75, единый источник |
| Дедуп показаний | Клиентская таблица «что отправлено» | Серверный индекс по внешнему id | Идемпотентность при повторах/сбоях |

**Key insight:** вся сложность — в правильной агрегации/лимитах/идемпотентности, а не в самих вызовах API.

## Runtime State Inventory

Не rename/refactor-фаза; раздел не применим. Но для переименования/расширения серверной части: **Stored data** — существующие записи `glucoseReadings` имеют `source: "manual" | "healthkit"`, расширение union литералом `healthconnect` аддитивно, миграция не нужна. **Build artifacts** — локальный `android/` (gitignored) нужно перегенерировать `npx expo prebuild --platform android` (без `--clean`, если важно сохранить локальные правки; плагины идемпотентны) либо собирать через EAS (prebuild на сервере).

## Common Pitfalls

### Pitfall 1: `android/` не в git
**What goes wrong:** CONTEXT говорит «закоммичены», но `.gitignore` содержит `/android/` и `/ios/`, `git ls-files android` пуст [VERIFIED: git check-ignore].
**Why:** prebuild-workflow без хранения нативных папок; EAS генерирует их заново.
**How to avoid:** всё нативное только через `app.config.ts`/плагины. Локально после правок конфига: `APP_VARIANT=development npx expo prebuild --platform android` (скрипт `npm run prebuild`), затем `npm run android`/EAS dev-build.
**Warning signs:** в `AndroidManifest.xml` нет `READ_STEPS`/`ViewPermissionUsageActivity` после правок конфига.

### Pitfall 2: Android скрыт гейтами `Platform.OS === "ios"`
Места: `app/app/(tabs)/settings.tsx:135` (пункт «Здоровье»), `app/app/(tabs)/index.tsx:86` (`getWeekMovement`), `app/app/(home)/day/[date].tsx:100` и `:127` (`getMonthMovement`, `stillLoading`), `app/app/(settings)/health.tsx:81` (заглушка). Заменить на проверку «платформа поддерживает здоровье» из фасада. Иначе на Android данные синхронизируются, но не показываются.

### Pitfall 3: Лимиты Convex
Реальные лимиты: массив в аргументе ≤ 8 192; ≤ 4 096 вызовов `db.get`/`db.query`; 16 000 записанных документов; 32 000 прочитанных; 1 с пользовательского кода [CITED: docs.convex.dev/production/state/limits]. Текущая мутация делает по `db.query` на показание → падает уже на 4 097-м; 30 дней CGM (~8 640 показаний при шаге 5 мин) нарушают и массив, и query-лимит. Пачка 200 → ≈200 query + ≤200 insert, безопасно. В CONTEXT «лимит записей 8192» — это на деле лимит длины массива.

### Pitfall 4: Тип `level` при чтении глюкозы
В `BloodGlucoseRecord` тип `level` — `{value, unit}` (для записи), а при чтении возвращается `{inMillimolesPerLiter, inMilligramsPerDeciliter}`; использовать `ReadRecordsResult<"BloodGlucose">` (там корректный `BloodGlucoseRecordResult`) [VERIFIED: исходники results.types.ts и ReactBloodGlucoseRecord.kt].

### Pitfall 5: Доступность Health Connect
`getSdkStatus`: 1 `SDK_UNAVAILABLE`, 2 `SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED`, 3 `SDK_AVAILABLE`. На Android ≤13 без приложения — установка из Play (`com.google.android.apps.healthdata`); на 14+ это модуль платформы, установка не нужна; `SDK_UNAVAILABLE` на 14+ означает неподдерживаемое устройство [CITED: developer.android.com get-started]. Приложение Health Connect поддерживает Android 9+ (API 28), SDK — Android 8+ (API 26), т.е. на Android 8 подключение невозможно [CITED там же]. Для кнопки установки открыть `market://details?id=com.google.android.apps.healthdata` через `Linking.openURL` [ASSUMED: конкретный URI; страница Play приведена в доках]. `<queries>` нужен для видимости пакета (приходит из манифеста библиотеки).

### Pitfall 6: Источники шагов и июньское обновление 2026
С июньского обновления Health Connect 2026 встроенные шаги телефона атрибутируются синтетическому пакету (`com.android.healthconnect.phone.<hash>`), а не `android`; агрегация без `dataOriginFilter` их включает автоматически, фильтр по источнику — нет [CITED: developer.android.com/health-and-fitness/health-connect/read-data]. Поэтому не фильтровать по `dataOrigin`. Встроенный счётчик шагов включается только когда хотя бы одному приложению выдан `READ_STEPS` (Android 14+, SDK extension ≥ 20): у нового пользователя шаги до подключения могут отсутствовать — показать подсказку «если нет данных, включите запись в Google Fit/Samsung Health/Fitbit и т.п. в Health Connect».

### Pitfall 7: Блокировка запроса прав
Если пользователь дважды отклонил запрос, система больше не показывает диалог (приложение «заблокировано») [CITED: matinzd.github.io/react-native-health-connect/docs/intro]. UI: если `requestPermission` вернул пусто — показать подсказку и кнопку `openHealthConnectSettings()` (ручная выдача в Health Connect).

### Pitfall 8: Rationale-активность = MainActivity
Плагин направляет `ACTION_SHOW_PERMISSIONS_RATIONALE`/`VIEW_PERMISSION_USAGE` на `MainActivity` (singleTask): по ссылке «Политика конфиденциальности» в диалоге Health Connect откроется приложение, а не политика. Официально требуется Activity с той же политикой, что в Play [CITED: get-started «Show your app's privacy policy dialog»]. Для MVP достаточно плагина + в приложении ссылка на политику (уже есть в `Paywall.tsx:276`, Google Docs) и блок «Как используются данные» на экране «Здоровье»; полноценный экран политики по intent — отдельное улучшение (Open Questions).

### Pitfall 9: Новая нативная сборка и New Architecture
Библиотека заявляет поддержку old/new arch [CITED: docs intro]; под RN 0.81 она собирается против проектного RN (peer `*`), но в её `package.json` dev-стек RN 0.86 — явных подтверждений сборки на SDK 54 не найдено (поиск по issue ничего не дал). Считать первую dev-сборку Android обязательным gate-checkpoint; при падении: сверить `HealthConnect_*`-gradle-свойства, kotlin 2.1.20 и откатиться на 3.5.3 (Expo-модуль тогда — отдельный `expo-health-connect@0.1.1`) [ASSUMED: путь отката].

### Pitfall 10: Квоты чтения Health Connect
Есть периодический и суточный лимиты вызовов, в фоне строже [CITED: …/plan/rate-limiting]. Держать троттлинг 5 мин, 3 агрегата + 1 пагинированное чтение за синхронизацию; при `IllegalStateException`/`SERVICE_UNAVAILABLE` — `logError` и пропустить цикл, не ретраить в цикле.

### Pitfall 11: Старые iOS-сборки
Уже установленные сборки (TestFlight) вызывают `api.glucose.importHealthKitReadings.default` без `source`. Не удалять и не менять сигнатуру старой мутации несовместимо: оставить её рабочей (можно сделать тонкой оберткой над общей функцией), новую мутацию добавить рядом.

## Code Examples

### Чистые функции для verify-скрипта (без RN-импортов)
```ts
// lib/health/healthMapping.ts — шаблон; Source: проектные соглашения + выводы выше
export const GLUCOSE_BATCH_SIZE = 200;
export const MAX_LOOKBACK_DAYS = 30;
export const OVERLAP_MS = 24 * 60 * 60 * 1000;

export function chunk<T>(items: readonly T[], size: number): T[][] { /* ... */ }

export function computeSince(lastSyncAt: number | null, nowMs: number): number {
  const floor = nowMs - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  return lastSyncAt === null ? floor : Math.max(lastSyncAt - OVERLAP_MS, floor);
}

export function dateKeyFromLocalDateTime(startTime: string): string {
  return startTime.slice(0, 10); // "2026-11-10T00:00" → "2026-11-10"
}
```

### Серверная мутация (схема)
```ts
// convex/tables/glucoseReadings.ts
source: v.union(v.literal("manual"), v.literal("healthkit"), v.literal("healthconnect")),
// healthKitUuid и индекс byUserIdAndHealthKitUuid переиспользуются под внешний id (HC metadata.id)
// convex/glucose/importGlucoseReadings.ts (новая): args { source: union(healthkit, healthconnect), readings: v.array(...) }
// клиент: for (const batch of chunk(readings, 200)) await importGlucoseReadings({ source, readings: batch });
```
Дедуп-индекс: пространства UUID HealthKit и `metadata.id` Health Connect не пересекаются практически, но при желании можно хранить с префиксом `hc:` — решение планировщика; без префикса достаточно, т.к. индекс по паре (userId, id) и на одном пользователе редко смешиваются обе платформы.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Fit APIs | Health Connect / Android Health APIs | Fit: регистрация закрыта 2024-05-01, вывод в 2026 [CITED] | Только Health Connect |
| `expo-health-connect` + `react-native-health-connect` | Expo-интеграция внутри `react-native-health-connect` ≥4.0 | 2026-08-01 | Один пакет, `expo-health-connect` удалить/не ставить |
| Google Form для запроса доступа к HC | Declaration form «Health apps» в Play Console → App content | 2024–2025 (дедлайн для старых заявок 2025-01-22) [CITED] | Оформлять в Play Console |
| Шаги атрибутируются пакету `android` | Синтетический пакет SPN | Июнь 2026 [CITED] | Не фильтровать по dataOrigin |

**Deprecated/outdated:** Google Fit REST/SDK; `expo-health-connect`; упоминание в README библиотеки о выводе Google Form 3 сентября 2026 — не подтверждено официальными страницами Google (Play Console Help упоминает только declaration form), считать LOW.

## Play Console (внешняя работа пользователя)

Требуется для всех публикаций, использующих Health Connect (новое приложение и каждое обновление с другим набором типов) [CITED: developer.android.com/health-and-fitness/guides/health-connect/publish/declare-access]:
1. Опубликовать политику конфиденциальности на странице приложения в Play; тот же текст показывать из приложения (rationale).
2. Раздел Data safety: указать сбор данных о здоровье/фитнесе.
3. Play Console → Policy → App content → **Health apps** declaration form: выбрать функции (для Teren подходят «Activity and fitness», «Nutrition and weight management», для глюкозы — «Diseases and conditions management» [ASSUMED: категория]); для каждого типа (Steps, Active calories, Distance, Blood glucose) дать подробное обоснование пользовательской пользы; запрашивать только нужное. Расплывчатые формулировки типа «needed for app functionality» отклоняются [CITED: support.google.com/googleplay/android-developer/answer/12991134].
4. Без декларации в публичном релизе пользователи видят диалог «не удаётся получить доступ к Health Connect»; на dev/internal-сборках разрешения можно проверять до одобрения [ASSUMED: поведение до публикации — проверить на устройстве]. Срок ревью в официальных страницах не указан (README библиотеки: до 7 дней + 5–7 рабочих дней на распространение — LOW).
5. Запрещённые применения: реклама на основе данных здоровья, решения о кредите/страховке/найме — убедиться, что в политике это отражено.
Подавать декларацию нужно до первого релиза в продакшн/closed-testing с этим функционалом; завести в план отдельную задачу `checkpoint:human-action`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-native-health-connect` легитимен (slopcheck не запускался) | Package Legitimacy | Установка нежелательного пакета; снижение риска — human-verify checkpoint |
| A2 | Сборка 4.1.3 с RN 0.81 + New Arch проходит без правок | Pitfall 9 | Потеря времени на dev-сборку; путь отката 3.5.3 + `expo-health-connect@0.1.1` не проверен |
| A3 | URI `market://details?id=com.google.android.apps.healthdata` для установки HC | Pitfall 5 | Кнопка установки не работает; запасной вариант — https-ссылка на Play |
| A4 | Категория Play «Diseases and conditions management» подходит для глюкозы | Play Console | Отклонение декларации; уточнить при заполнении |
| A5 | До одобрения декларации разрешения работают в dev/internal сборках | Play Console | Нельзя протестировать на реальных данных до одобрения |
| A6 | Единица глюкозы на Android: mmol/L по умолчанию | Pattern 4 | Неверная единица отображения; нужен выбор пользователя/локали |
| A7 | Показ предложения существующим пользователям один раз допустим | Pattern 5 | Раздражение; можно ограничить новыми пользователями |
| A8 | Доля устройств Android 7.x (minSdk 24→26) пренебрежимо мала | Standard Stack | Потеря малой части аудитории; проверить в Play Console |

## Open Questions

1. **Единица глюкозы на Android**
   - Известно: HC отдаёт оба значения; на iOS единица берётся из настроек Apple Health.
   - Неясно: есть ли в приложении пользовательская настройка единиц (в коде `glucoseUnit` не найдено).
   - Рекомендация: брать единицу последнего ручного показания пользователя, иначе mmol/L; согласовать с пользователем.
2. **Rationale-экран**
   - Плагин ведёт rationale на MainActivity. Рекомендация MVP: оставить, показать политику на экране «Здоровье»; если ревью Play потребует — отдельная Activity/экран через intent (вне плана или отдельным планом).
3. **Идентификатор пользователя для ключа lastSync**
   - Брать `profile.userId` (из `getProfile`) или из `AuthContext`; уточнить при проектировании `healthSyncState.ts`.
4. **Реальная сборка на SDK 54** (см. Pitfall 9) — только dev-сборка на устройстве снимет вопрос.
5. **Один Convex-«dev» деплой для всех сборок** — схема меняется аддитивно, старые iOS-сборки совместимы при сохранении старой мутации.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node / npm | установка, verify-скрипты | ✓ | v22.22.1 / 10.9.4 | — |
| Java (JDK) | локальная сборка Android | ✓ | /usr/bin/java | EAS-сборка |
| Android SDK / adb | локальный `expo run:android`, установка на устройство | ✓ | ~/Library/Android/sdk, platform-tools | EAS dev-build + ручная установка APK |
| EAS CLI | облачная сборка | ✓ | /Users/smatov/.nvm/.../eas | — |
| Физическое устройство Android (или эмулятор с Health Connect) | проверка на устройстве | ? не проверялось | — | Эмулятор с Play Services (API 34+ имеет HC встроенный); нужен пользователь |
| ctx7 CLI / slopcheck | документация / аудит пакетов | ✗ | — | WebFetch/исходники пакета; slopcheck — человеческая проверка |
| Play Console доступ | декларация | внешне (пользователь) | — | — |

**Missing dependencies with no fallback:** доступ пользователя к Play Console для декларации (блокирует только публикацию, не разработку).
**Missing dependencies with fallback:** slopcheck → `checkpoint:human-verify`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Нет раннера; `tsc`, `eslint`, ts-node verify-скрипты (`node:assert/strict`), ручная проверка на устройствах |
| Config file | `package.json` scripts `script:verify*` (стиль `ts-node -r tsconfig-paths/register scripts/verifyX.ts`) |
| Quick run command | `npx tsc --noEmit && npx eslint lib/health convex/glucose` |
| Full suite command | `npx tsc --noEmit && npx eslint . && npm run script:verifyHealthSync && npm run script:verifyHealthRanges` (последний — если скрипт есть в package.json; иначе `ts-node -r tsconfig-paths/register scripts/verifyHealthRanges.ts`) |

### Phase Requirements → Test Map
У фазы нет REQ-ID; привязка к Success Criteria из ROADMAP.

| SC | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| SC3 | `chunk` (200), `computeSince`, дедуп внутри пачки, ключ даты, фильтр диапазонов | unit-скрипт | `TZ=Europe/Berlin ts-node -r tsconfig-paths/register scripts/verifyHealthSync.ts` | ❌ Wave 0 |
| SC3 | Сервер: мутация с `source`, дедуп, batch ≤ 200 | ручной (dev Convex) + `npx convex dev --once` для типов | деплой + вызов из приложения | — |
| SC1 | Android: подключение, разрешения, данные на главной | manual device | dev-build, `adb logcat \| grep -i healthconnect` | — |
| SC2 | Предложение после онбординга (iOS+Android), «Не сейчас», повтор из настроек | manual device | сценарий на чистом аккаунте | — |
| SC4 | Сборка + tsc + eslint | build | `npx tsc --noEmit`, `npx eslint .`, `npm run prebuild` затем `npm run android` | — |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` + eslint по затронутым каталогам.
- **Per wave merge:** полный набор + verify-скрипты.
- **Phase gate:** tsc/eslint чисты, `verifyHealthSync` зелёный, ручная проверка на Android (шаги/энергия/дистанция/глюкоза, отзыв прав, нет HC, повторная синхронизация без дублей) и регрессия на iOS.

### Wave 0 Gaps
- [ ] `lib/health/healthMapping.ts` (чистые функции) + `scripts/verifyHealthSync.ts` + запись в `package.json` (`script:verifyHealthSync`, `TZ=Europe/Berlin`)
- [ ] Ручной чек-лист устройства Android: Android ≤13 без HC (установка), Android 14+, отзыв прав в HC, двойной отказ, пустые данные, CGM-объём (≥ 8 000 показаний → 40+ пачек без ошибки), повторный запуск (0 новых записей)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | да (косвенно) | Мутации через `getAuthUserId` (уже в проекте) |
| V3 Session Management | нет | — |
| V4 Access Control | да | Запись только под своим `userId`; индекс (userId, id) |
| V5 Input Validation | да | Convex validators `v.*`; серверная `isGlucoseValueValid`; ограничить длину массива пачки (≤ 500) и длину `healthKitUuid` |
| V6 Cryptography | нет | — |
| V8 Data Protection | да | Данные здоровья — чувствительные: не логировать значения в Sentry (логировать только счётчики, как `logHealthKitSync`); политика конфиденциальности; только чтение |

### Known Threat Patterns for {Expo + Health Connect + Convex}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Подмена/переполнение пачки показаний (DoS на деплоймент) | Tampering/DoS | Серверный лимит размера пачки + троттлинг клиента 5 мин (T-68-01) |
| Утечка данных здоровья в логи/аналитику | Information disclosure | Sentry breadcrumbs без значений |
| Лишние разрешения (запрос глюкозы без нужды) | Elevation of privilege (политика) | Запрашивать глюкозу только для `hasHealthBlocks`; в манифесте объявлено, в runtime запрос по условию |
| Манифест: экспорт rationale activity | Spoofing | `activity-alias` защищён `START_VIEW_PERMISSION_USAGE` (плагин) |

## Sources

### Primary (HIGH confidence)
- developer.android.com/health-and-fitness/guides/health-connect/migrate/fit-apis-end-of-service — статус Google Fit (deprecated в 2026, регистрация закрыта 2024-05-01)
- developer.android.com/health-and-fitness/health-connect/get-started — разрешения, rationale, queries, getSdkStatus, Android 13/14, compileSdk 36, 30-дневное ограничение
- developer.android.com/health-and-fitness/health-connect/read-data — агрегация vs чтение, pageToken (`""`), история 30 дней, фон, атрибуция шагов (июнь 2026)
- developer.android.com/health-and-fitness/guides/health-connect/publish/declare-access — декларация в Play Console
- developer.android.com/health-and-fitness/guides/health-connect/plan/rate-limiting — квоты
- docs.convex.dev/production/state/limits — лимиты транзакции
- Исходники `react-native-health-connect@4.1.3` (npm pack, распакован и прочитан: app.plugin.js, android-expo, android/build.gradle, манифесты, src/index.tsx, типы, Kotlin-парсеры)
- npm registry (`npm view`, downloads API), GitHub releases библиотеки
- Код проекта: `lib/health/healthKit.ts`, `lib/hooks/useHealthKitSync.ts`, `app.config.ts`, `convex/...`, `.gitignore`, `node_modules/react-native/gradle/libs.versions.toml` (minSdk 24, compileSdk 36, AGP 8.11.0, Kotlin 2.1.20)

### Secondary (MEDIUM confidence)
- github.com/matinzd/react-native-health-connect README и matinzd.github.io/react-native-health-connect/docs/intro (Expo-установка, блокировка после двух отказов)
- support.google.com/googleplay/android-developer/answer/12991134 (политика Health Connect)

### Tertiary (LOW confidence)
- Утверждение README библиотеки о выводе Google Form 2026-09-03 и сроках ревью (не подтверждено Google)
- Сторонние статьи о Google Fit (sahha.ai и др.): «поддерживается до конца 2026» — официально точной даты нет

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — версия и состав плагина проверены по реестру и исходникам
- Architecture: MEDIUM-HIGH — вызовы API проверены по исходникам; фактическая сборка на RN 0.81 + New Arch не выполнялась
- Pitfalls: HIGH — основаны на официальной документации и коде проекта
- Play Console: MEDIUM — процесс подтверждён, сроки и категория глюкозы нет

**Research date:** 2026-11-11
**Valid until:** ~2026-12-11 (библиотека и политика Health Connect/Play меняются быстро)

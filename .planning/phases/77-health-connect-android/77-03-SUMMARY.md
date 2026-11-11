---
phase: 77-health-connect-android
plan: 03
subsystem: android-config
tags: [android, health-connect, expo, config-plugin, build]

requires:
  - phase: 77-health-connect-android
    provides: 77-01 (verify-скрипт синхронизации), 77-02 (серверная часть)
provides:
  - пакет react-native-health-connect 4.1.3 (точная версия, без expo-health-connect)
  - app.config.ts: 4 разрешения READ_* для здоровья, плагин, expo-build-properties (minSdk 26, compile/target 36)
  - npm-скрипт script:verifyHealthSync
  - подтверждённая сборка debug-APK и запуск на устройстве (gate совместимости SDK 54 + New Architecture пройден)
affects: [77-04, 77-05, 77-06, 77-07]

key-files:
  modified:
    - package.json
    - package-lock.json
    - app.config.ts

decisions:
  - "Пакет react-native-health-connect@4.1.3 подтверждён пользователем (human-verify), установлен --save-exact"
  - "expo-health-connect не устанавливается: deprecated, дубль классов при v4"
  - "Разрешения только на чтение: READ_STEPS, READ_ACTIVE_CALORIES_BURNED, READ_DISTANCE, READ_BLOOD_GLUCOSE; READ_HEALTH_DATA_HISTORY и фоновое чтение не запрашиваются"

metrics:
  completed: 2026-11-12
  tasks: 3
  commits: 1

requirements: [77-SC-1, 77-SC-4]
---

# Phase 77 Plan 03: Пакет Health Connect и конфигурация Android Summary

Пакет установлен, Android сконфигурирован через `app.config.ts`, сборка и запуск на устройстве подтверждены.

## Выполнено

1. **Task 1 (human-verify пакета).** Метаданные из реестра npm показаны пользователю: версия 4.1.3 (`latest`), MIT, репозиторий `github.com/matinzd/react-native-health-connect`, нет скриптов preinstall/install/postinstall. Пользователь подтвердил («approved»).
2. **Task 2.** Установка `react-native-health-connect@4.1.3` (`--save-exact`); в `app.config.ts` четыре разрешения `android.permission.health.READ_*`, плагин `react-native-health-connect`, `expo-build-properties` для Android (minSdk 26, compileSdk 36, targetSdk 36; iOS `deploymentTarget` 16.0 не тронут); в `package.json` скрипт `script:verifyHealthSync`. Коммит 09332f1. Проверки: grep по строке с кавычкой `"android.permission.health.READ_` равен 4, `WRITE_` нет, `expo config --type prebuild` даёт `minSdkVersion: 26`.
3. **Task 3 (gate первой dev-сборки).** `APP_VARIANT=development npx expo prebuild --platform android --no-install` (без `--clean`) и `cd android && ./gradlew :app:assembleDebug`: BUILD SUCCESSFUL за 9 минут 23 секунды, конфликтов Kotlin/AGP нет, откат по Pitfall 9 не потребовался. Merged manifest содержит `queries` на `com.google.android.apps.healthdata`, `android:minSdkVersion="26"` и четыре разрешения READ_*; `ViewPermissionUsageActivity` защищена `START_VIEW_PERMISSION_USAGE` (T-77-11). Пользователь запустил приложение на устройстве: запуск прошёл нормально.

## Отклонения

Один пункт acceptance Task 2 (`npm run script:verifyHealthSync`) исполнитель при Task 2 не запускал: сам скрипт создан планом 77-01, регистрация в `package.json` выполнена. Скрипт проверялся отдельно в 77-01 и проходит (`verifyHealthSync: OK`).

## Заметки

- Каталоги `android/` и `ios/` в `.gitignore` и не коммитятся; артефакты сборки лежат локально (APK `android/app/build/outputs/apk/debug/app-debug.apk`).
- Экран «Здоровье» на Android пока заглушка, это ожидаемо (его делает план 77-06).
- Совместимость с Expo SDK 54 и New Architecture, помеченная в исследовании как [ASSUMED], подтверждена сборкой и запуском на устройстве.

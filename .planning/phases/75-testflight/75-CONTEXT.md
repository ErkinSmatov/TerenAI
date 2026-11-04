# Phase 75: Замечания тестера (TestFlight) - Context

**Gathered:** 2026-11-04
**Status:** Ready for planning
**Source:** Замечания тестера + разбор кода в сессии 2026-11-04 (решения приняты пользователем и Claude в диалоге)

<domain>
## Phase Boundary

Фаза-контейнер для исправления замечаний тестера по TestFlight-сборке. Приоритет выше бэклога аудита кода.
В объёме на 2026-11-04 три замечания:

1. WhatsApp OTP: экран кода открывается, код не приходит (AUTH-07).
2. Наблюдатель в режиме «только чтение» видит кнопки добавления.
3. Поле сахара принимает нереальные значения (например, 80 ммоль/л).

Новые замечания тестера будут добавляться в эту же фазу отдельными планами (`/gsd-plan-phase 75 --gaps` или добавление планов).

Вне объёма: остальной бэклог аудита (лимиты AI, deleteUser, HealthKit-батчи, индексы профилей и т.д.), изменение дизайна экранов, новые экраны.
</domain>

<decisions>
## Implementation Decisions

### Замечание 1 — WhatsApp OTP (диагностика, код НЕ менять до результата)
- **Решение пользователя:** «Сначала диагностика». Пользователь сам проверяет логи Twilio/Convex.
- Факты из кода: `signIn("whatsapp-otp", { phone })` не вернул ошибку, значит Twilio Verify ответил 2xx (`convex/WhatsAppOTP.ts`), а доставка WhatsApp-сообщения сорвалась уже после приёма запроса. В Phase 72-10 записано: у Twilio нет WhatsApp Sender и Meta WABA, аккаунт trial, `custom_code_enabled` не проверен.
- Где смотреть: логи Convex (`WhatsAppOTP send error`, маркер `CUSTOM_CODE_REJECTED`), Twilio Console → Monitor → Logs → Verify, статус Verification (pending/failed), код ошибки доставки (63015/63016/63003/60242 и др.).
- План для этого пункта — отдельный план с `autonomous: false` (checkpoint:human-action): шаги диагностики для пользователя + развилка решения (A: настроить Twilio/Meta, код не меняется; B: скрыть кнопку WhatsApp на `app/auth/phone-sign-in.tsx` флагом; C: оставить кнопку и показывать честное предупреждение). Правка кода только после выбора пользователя. Пункт не блокирует остальные планы фазы.

### Замечание 2 — Наблюдатель в режиме только чтения
- Причина (подтверждена чтением кода): `HomeEmptyState` остаётся кликабельным в `readOnly`-режиме и ведёт на экраны добавления: `HomeRecentlyLogged` (`/app/(add)/describe`), `HomeGlucoseSummary` (`/app/(add)/glucose`), `HomeBloodPressureSummary` (`/app/(add)/bloodPressure`). Записи создаются в аккаунте самого наблюдателя (все мутации берут `userId` из сессии; чужие данные записать нельзя — серверную защиту НЕ менять, она корректна).
- Исправление только на клиенте: в `readOnly`-режиме пустое состояние неинтерактивное, нейтральный текст без призыва добавить (например «Пока нет записей за сегодня»), иконка «добавить» не показывается.
- Сопутствующий баг: `HomeRecentlyLogged` в `readOnly` берёт `targetCalories` из профиля НАБЛЮДАТЕЛЯ (`useQuery(api.profiles.getProfile.default)`), кольца калорий блюд пациента считаются от чужих целей. Нужно передавать цель пациента (`data.targets?.calories` из `getPatientToday`) пропом и не подписываться на свой профиль в `readOnly` (по образцу `HomeMacroSummary`, где запрос пропускается через `"skip"`).
- Аудит всего экрана `app/app/(settings)/observedPatient/[patientId].tsx`: ни один элемент не должен вести к добавлению, редактированию или удалению (проверить также `HomeGlucoseHeroCard`, `SugarByHourChart`, `HomeNutrientGlowCard`, `HomeCalorieOverviewCard`, `BloodPressureLineChart` на ссылки и обработчики нажатий). Экран `observedHistory/[patientId].tsx` уже только для чтения.
- Осторожно: `readOnly` также используется в `app/app/(home)/day/[date].tsx` для СОБСТВЕННЫХ прошлых дней (там у `HomeRecentlyLogged` есть явный `onAddPress`, это осознанное поведение и его нельзя сломать). Поведение пустых состояний сахара/давления на экране дня исполнитель сверяет сам и не допускает регрессии добавления блюда за день.

### Замечание 3 — Валидация диапазонов измерений
- Причина: клиент проверяет только `value > 0` (`app/app/(add)/glucose.tsx`, `app/app/(add)/bloodPressure.tsx`), сервер вообще не проверяет (`convex/glucose/createReading.ts`, `convex/bloodPressure/createReading.ts`, `convex/glucose/importHealthKitReadings.ts`). `v.number()` пропускает NaN, Infinity и отрицательные.
- **Диапазоны (приняты, диапазон типичного глюкометра):**
  - Сахар: 1.1–33.3 ммоль/л; 20–600 мг/дл.
  - Давление: систолическое 50–300, диастолическое 30–200 (мм рт. ст.), систолическое строго больше диастолического.
  - Пульс (необязательный): 20–250 уд/мин.
  - Все значения — конечные числа (`Number.isFinite`).
- Одна общая чистая функция валидации в `lib/` (без импорта React/Convex), которую вызывают И клиентский экран, И Convex-мутации (в проекте `convex/` уже импортирует из `@/lib/...`).
- Клиент: понятное сообщение под полем (например «Значение вне допустимого диапазона: 1.1–33.3 ммоль/л»), кнопка «Сохранить» недоступна при невалидном значении; подсказка может учитывать выбранную единицу (при 80 ммоль/л не молча сохранять).
- Сервер: `createReading` (глюкоза и давление) бросает ошибку при невалидном значении (защита от прямого вызова мутации). Ошибки Convex в проде маскируются, поэтому клиентская проверка обязательна и дублирует серверную.
- `importHealthKitReadings`: нереальные образцы молча пропускаются (не валят весь батч), корректные импортируются; количество пропущенных не должно приводить к ошибке.
- `convex/glucose/createReading.ts` оборачивается в `try/catch` + `logError` по конвенции проекта, если ещё не обёрнут.
- Проверка без тестового раннера: новый скрипт `scripts/verifyHealthRanges.ts` в стиле существующих `scripts/verify*.ts` (`node:assert/strict`, импорт через `@/lib/...`) + npm-скрипт `script:verifyHealthRanges` в `package.json` (по образцу `script:verifyPushRules`). Граничные значения: 1.1/33.3 допустимы, 1.0/33.4/80 нет; 20/600 допустимы мг/дл, 19/601 нет; NaN, Infinity, отрицательные, 0 — нет.

### Общие ограничения
- Не трогать незакоммиченные файлы пользователя (переименование TerenAI → Teren): `app/app/(settings)/health.tsx`, `components/observer/ShareCodeCard.tsx`, `components/onboarding/OnboardingSection.tsx`, `components/paywall/Paywall.tsx`, `components/settings/DiagnosticsSection.tsx`, `context/SubscriptionContext.tsx`, `.gitignore`.
- Базовая линия: `npx tsc --noEmit` и `npx eslint .` проходят без ошибок на 2026-11-04 и должны проходить после каждого плана. Автотестов нет.
- Конвенции (`.planning/codebase/CONVENTIONS.md` частично устарел, но конвенции верны): `type` вместо `interface`, комментарии на русском, `try/catch` + `logError` + rethrow в Convex-функциях, одна функция на файл с `export default`, стили через `StyleSheet.create`/`useThemedStyles`, цвета через `getColor`.
- После правок Convex-кода нужен деплой (`npx convex dev --once` для dev); деплой в prod — решение пользователя, отдельным checkpoint, не автоматически.
- Ответы пользователю и комментарии в коде — на русском языке (CLAUDE.md).

### Claude's Discretion
- Точные тексты сообщений об ошибках и пустых состояний (на русском, нейтральные).
- Имя и расположение общего модуля валидации в `lib/` (рекомендация: `lib/health/` или `lib/validation/`).
- Разбиение на планы и волны. Рекомендация: план A (валидация + скрипт проверки), план B (readOnly наблюдателя), план C (диагностика WhatsApp, checkpoint); A и B независимы и могут идти в одной волне.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Наблюдатель (замечание 2)
- `app/app/(settings)/observedPatient/[patientId].tsx` — экран наблюдателя, передаёт `readOnly`
- `components/home/HomeEmptyState.tsx` — кликабельное пустое состояние (источник проблемы)
- `components/home/HomeRecentlyLogged.tsx` — `MealCard`, `targetCalories` из своего профиля
- `components/home/HomeGlucoseSummary.tsx`, `components/home/HomeBloodPressureSummary.tsx` — пустые состояния с `href` на экраны добавления
- `components/home/HomeMacroSummary.tsx` — образец правильной обработки `readOnly` (`"skip"` для запроса профиля)
- `app/app/(home)/day/[date].tsx` — другой потребитель `readOnly` (свои прошлые дни), регрессии недопустимы
- `convex/observers/getPatientToday.ts` — источник данных, возвращает `targets` пациента
- `convex/utils/observerAuth.ts` — серверный шлюз доступа (не менять)

### Валидация измерений (замечание 3)
- `app/app/(add)/glucose.tsx`, `app/app/(add)/bloodPressure.tsx` — экраны ввода
- `convex/glucose/createReading.ts`, `convex/bloodPressure/createReading.ts`, `convex/glucose/importHealthKitReadings.ts` — серверные точки записи
- `config/glucoseConfig.ts` — единицы и контексты измерения
- `convex/tables/glucoseReadings.ts`, `convex/tables/bloodPressureReadings.ts` — схема
- `lib/health/healthKit.ts`, `lib/hooks/useHealthKitSync.ts` — источник образцов HealthKit
- `scripts/verifyPushRules.ts`, `package.json` (раздел scripts) — образец verify-скрипта и его регистрации

### WhatsApp (замечание 1)
- `convex/WhatsAppOTP.ts`, `convex/utils/otpErrors.ts` — провайдер и классификация ошибок Twilio
- `app/auth/phone-sign-in.tsx`, `app/auth/confirm-phone.tsx` — экран входа и подтверждения
- `.planning/phases/72-push-testflight-telegram-whatsapp-otp/72-RESEARCH.md` — раздел про Twilio, CustomCode, Open Question 4
- `.planning/STATE.md` (строка про AUTH-07), `.planning/REQUIREMENTS.md` (AUTH-07)

### Проект
- `CLAUDE.md` — отвечать по-русски
- `.planning/ROADMAP.md` — раздел Phase 75
</canonical_refs>

<specifics>
## Specific Ideas

- Формулировка тестера: «Наблюдатель может добавлять, редактировать и удалять записи владельца. Кнопки доступны, запись добавляется, редактирование работает» — фактически записи уходят в аккаунт наблюдателя, но для тестера это выглядит как правка данных владельца; исправление должно убрать сами элементы управления, а не только заблокировать запись.
- Формулировка тестера: «Поле сахара принимает значение 80 ммоль/л и любые другие нереальные значения».
- Формулировка тестера: «Код подтверждения не приходит в WhatsApp, переход на экран кода выполняется».
</specifics>

<deferred>
## Deferred Ideas

- Остальной бэклог аудита кода 2026-11-04 (память: project-audit-backlog-2026-11): подбор кода наблюдателя, батчи импорта HealthKit, лимиты `confirmMeal`, `deleteUser` и др. — отдельные фазы после замечаний тестера.
- Настройка WhatsApp Sender / Meta WABA в Twilio — внешняя инфраструктурная работа пользователя.
- Рефакторинг дубликатов (итоги блюда, week/month-запросы) — отдельная фаза.
</deferred>

---

*Phase: 75-testflight*
*Context gathered: 2026-11-04*

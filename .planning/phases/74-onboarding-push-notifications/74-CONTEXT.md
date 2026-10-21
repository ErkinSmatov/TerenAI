# Phase 74: Онбординг: цель, программа и имя; push: дубли и настройки уведомлений - Context

**Gathered:** 2026-10-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Два блока в одной фазе.

1. **Онбординг.** Шаги «Основы» без изменений. Цель всегда выбирается среди Похудеть / Поддерживать вес / Набрать вес. Новый выбор «Программа» (Биохакинг / Диабет / Контроль веса) влияет только на UI. В конце онбординга после входа или регистрации спрашивается имя, оно показывается в Профиле.
2. **Push-уведомления.** Исправить дубли (по 4 одинаковых уведомления на устройство в одно время) и добавить новые уведомления с включением/выключением и выбором времени.

Подписка (73), OTP-каналы и дистрибуция (67) вне фазы.

</domain>

<decisions>
## Implementation Decisions

### Онбординг: структура
- **D-01:** Секция «Основы» остаётся полностью без изменений.
- **D-02:** Секция «Цель» содержит выбор цели Похудеть / Поддерживать вес / Набрать вес, а при Похудеть/Набрать остаются шаги «Целевой вес» и «Как быстро вы хотите достичь цели?» (при «Поддерживать» пропускаются, как сейчас). Выбор программы из «Цели» уходит.
- **D-03:** Выбор цели теперь спрашивается у всех программ (сейчас у Биохакинг и Глюкометр цель принудительно «maintain», вес и темп обнуляются; эту принудительную логику из `OnboardingGoalTrack.tsx` убрать).
- **D-04:** Выбор программы (Биохакинг / Диабет / Контроль веса) переезжает в секцию «Программа». Порядок: Цель → Программа (выбор программы → при «Диабет» подшаг типа диабета → тип тренировок).
- **D-05:** Вопрос «Какой тип тренировок вы будете выполнять по этой программе?» переименовывается в «Какой тип тренировок вы предпочитаете?» (`components/onboarding/steps/program/OnboardingTraining.tsx`).

### Программа и UI
- **D-06:** Программа влияет только на UI: какие блоки показывать, чтобы не перегружать экраны. На расчёт норм не влияет (кроме существующего влияния типа диабета, см. D-08).
- **D-07:** Распределение блоков: **Диабет и Биохакинг** показывают блоки сахара и давления (Главная, пункты «Сахар/Давление» в меню «+», экран «Здоровье», отчёты), **Контроль веса** их не показывает. Сейчас это условие `goalTrack === "glucometer"` (isGlucometerTrack) и должно распространиться на `biohacking`.
- **D-08:** Шаг «Что из этого вам подходит?» (Диабет 2 / Диабет 1 / Контроль сахара, поле `glucometerType`, влияет на расчёт норм в `generateMacroTargets`) остаётся подшагом программы «Диабет». Для Биохакинга и Контроля веса пропускается.
- **D-09:** В UI «Глюкометр» переименовывается в «Диабет». Хранимое значение `goalTrack` остаётся `glucometer`, схему БД и существующие профили не мигрируем (рекомендация Claude, пользователь не возражал; уточнить при планировании).

### Имя пользователя
- **D-10:** Шаг «Имя» в конце онбординга, после входа/регистрации (когда уже есть userId). Показывается только тем, у кого имени нет (вход по телефону, гость); у Google/Apple имя приходит от провайдера, шаг для них пропускается.
- **D-11:** У шага есть кнопка «Пропустить»; имя можно задать позже в Профиле.
- **D-12:** Имя отображается в Профиле. В коде уже есть `convex/users/updateUserName.ts` и `components/profile/EditNameSheet.tsx`, их переиспользовать.

### Push-уведомления
- **D-13:** Исправить дубли и добавить новые уведомления с включением/выключением и выбором времени. Детали (стратегия фикса дублей, список новых типов, способ выбора времени, текст и тон) пользователь отдал на усмотрение исследования и планировщика.

### Claude's Discretion
- Стратегия исправления дублей (см. данные в specifics).
- Какие новые уведомления добавлять, хранение настроек, UI выбора времени. Согласовать с пользователем при планировании, если выбор неочевиден.
- Точное место шага имени среди шагов «Результатов» (рядом с «Создать аккаунт», до пейволла).
- Новые поля профиля и миграции, если понадобятся.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Онбординг
- `components/onboarding/Onboarding.tsx` — список секций и шагов (`sections`), правила `skip` и `completed`
- `components/onboarding/steps/goal/OnboardingGoalTrack.tsx` — текущий выбор программы (goalTrack) и принудительная логика, которую убираем
- `components/onboarding/steps/goal/OnboardingGoal.tsx`, `OnboardingTargetWeight.tsx`, `OnboardingWeightChangeRate.tsx` — шаги цели
- `components/onboarding/steps/goal/OnboardingGlucometerType.tsx` — тип диабета (glucometerType)
- `components/onboarding/steps/program/` — секция «Программа» и `OnboardingTraining.tsx`
- `components/onboarding/steps/end/OnboardingCreateAccount.tsx` — вход/регистрация в конце онбординга
- `context/OnboardingContext.tsx` — данные онбординга, `isOnboardingDataComplete`
- `convex/tables/profiles.ts` — схема профиля (goalTrack, glucometerType, mealRemindersEnabled, weighInRemindersEnabled)

### Влияние программы на UI (все места с goalTrack)
- `app/app/(tabs)/index.tsx`, `components/tabs/TabsAddOptions.tsx`, `app/app/(settings)/health.tsx`, `app/app/(settings)/generateMacroTargets.tsx`, `app/app/(home)/day/[date].tsx`
- `convex/observers/getPatientToday.ts`, `convex/observers/getObservedPatients.ts`, `convex/reports/getMonthlyReport.ts`, `lib/reports/buildMonthlyReportHtml.ts`

### Имя
- `convex/users/updateUserName.ts`, `components/profile/EditNameSheet.tsx`

### Push
- `convex/notifications/checkMealReminders.ts`, `checkWeighInReminders.ts`, `sendPushNotification.ts`, `recordPushToken.ts`, `checkPushReceipts.ts`
- `convex/crons.ts` — крон каждые 30 минут
- `convex/tables/pushTokens.ts` — таблица токенов
- `lib/notifications/reminderSchedule.ts` — точки дня 9:00, 14:00, 20:00 и окно 30 минут
- `app/app/(settings)/notificationSettings.tsx` — текущие переключатели
- `components/notifications/NotificationsProvider.tsx` — регистрация токена на клиенте
- `.planning/phases/72-push-testflight-telegram-whatsapp-otp/72-REVIEW.md` — замечание WR-05 про токены (привязка к userId)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Select` и шаблон шага из `OnboardingGoalTrack.tsx`: для нового места выбора программы.
- `updateUserName` и `EditNameSheet`: уже реализованное редактирование имени.
- `notificationSettings.tsx` с `SettingsToggleItem`: готовый паттерн переключателей уведомлений.
- `reminderSchedule.ts`: логика точек дня и окон с учётом часового пояса.

### Established Patterns
- Шаги онбординга описаны массивом `sections` с `completed`/`skip` на данных контекста.
- Флаги уведомлений (`mealRemindersEnabled`, `weighInRemindersEnabled`) лежат в профиле, `undefined` трактуется как «включено».
- Крон проходит по ВСЕМ строкам `pushTokens`, для каждой читает профиль и шлёт сообщение; дедупликация по `profile.lastMealReminderSentAt`.

### Integration Points
- Условие `goalTrack === "glucometer"` в 5+ файлах UI и 4 серверных файлах (отчёты, наблюдатель) надо расширить на `biohacking` (D-07).
- Принудительное `goal: "maintain"` для не-weightControl живёт в `OnboardingGoalTrack` и в `isOnboardingDataComplete`; затрагивает расчёт норм.

</code_context>

<specifics>
## Specific Ideas

**Причина дублей push (подтверждена данными на dev, 2026-10-21).** На скриншоте пользователя 4 одинаковых уведомления «Не забудьте позавтракать» в 09:33. В таблице `pushTokens` на dev один и тот же токен устройства записан у 16 разных `userId`, другой у 5. Токен привязан к userId и не удаляется при смене аккаунта (гость, тестовые и реальные входы создают новые userId на том же устройстве). Крон шлёт сообщение по каждой строке, а дедупликация идёт по профилю, а не по токену, поэтому каждое устройство получает по сообщению на каждого «старого» userId. Данных по prod нет, нужно проверить. Предлагаемые направления для планировщика: токен уникален на устройство (при регистрации отвязывать от прежних userId), чистка при выходе, удаление старых записей, дедупликация по `expoPushToken` при отправке.

**Формулировка пользователя:** «Данный выбор будет влиять только на UI приложения, отображать или не показывать некоторые блоки, чтобы не перегружать страницу пользователя».

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Список новых уведомлений и способ выбора времени намеренно оставлены планировщику.)

</deferred>

---

*Phase: 74-onboarding-push-notifications*
*Context gathered: 2026-10-21*

## Addendum (plan-phase, 2026-10-21): scope push-уведомлений

Источник: `docs/TEREN_Push_Notifications.xlsx` (63 уведомления + 17 общих правил, лист «Правила»). Решения пользователя:

- **Объём Phase 74:** фундамент + 4–5 уведомлений. Остальные строки xlsx — в отложенное (Phase 75+).
- **Новые типы (по умолчанию, можно скорректировать до execute):** FOOD-01 (пропуск приёма пищи), HLT-14 (еженедельное взвешивание), RET-01 (3 дня без входа), RET-02 (7 дней), RET-03 (14 дней). Тексты/заголовки/частоту/условия брать из xlsx.
- **Выбор времени уведомлений НЕ делаем** (решение пользователя). Только вкл/выкл по каждому типу; текущее время напоминаний остаётся как есть.
- **Фундамент из «Правил» (минимально необходимое):** дедуп токенов (баг 4 одинаковых push), лимит классов C/D 3 в день, тихие часы 22:00–08:00 (дефолт), отмена по факту, ротация текстов 1–3 без повтора подряд, длина заголовка ≤40 / текста ≤140, один эмодзи в конце.
- **Вне объёма:** наблюдатель (OBS), подписки (SUB), SYS, критичные алерты по сахару/давлению (HLT-04/05/12, Critical Alerts iOS), NUT, пауза «Не беспокоить», аналитика доставки, казахская локализация.
- **UI-SPEC:** не создаётся (планировать без него).
- **Research:** `74-RESEARCH.md` (ключевое: фикс дублей в 4 слоях; `notificationPrefs` optional-объект в `profiles`; helper `hasHealthBlocks`; шаг имени после `OnboardingCreateAccount`).

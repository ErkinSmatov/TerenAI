# Phase 74: Онбординг (цель, программа, имя) и push (дубли, настройки) - Research

**Researched:** 2026-10-21
**Domain:** Expo / React Native онбординг на массиве `sections`, Convex (push-токены, cron-напоминания)
**Confidence:** HIGH (весь анализ по коду репозитория; внешних библиотек нет)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Секция «Основы» без изменений.
- D-02: Секция «Цель»: выбор Похудеть / Поддерживать вес / Набрать вес; при Похудеть/Набрать остаются «Целевой вес» и «Как быстро...»; при «Поддерживать» пропускаются. Выбор программы из «Цели» уходит.
- D-03: Цель спрашивается у всех программ; принудительную логику (goal=maintain, targetWeight=weight, weightChangeRate=0 для не-weightControl) из `OnboardingGoalTrack.tsx` убрать.
- D-04: Выбор программы (Биохакинг / Диабет / Контроль веса) переезжает в секцию «Программа». Порядок: Цель -> Программа (выбор программы -> при «Диабет» подшаг типа диабета -> тип тренировок).
- D-05: Вопрос про тренировки: «Какой тип тренировок вы предпочитаете?» (`OnboardingTraining.tsx`).
- D-06: Программа влияет только на UI (какие блоки показывать); на расчёт норм не влияет (кроме типа диабета, D-08).
- D-07: Диабет и Биохакинг показывают блоки сахара и давления (Главная, меню «+», экран «Здоровье», отчёты); Контроль веса их не показывает. Условие `goalTrack === "glucometer"` расширить на `biohacking`.
- D-08: «Что из этого вам подходит?» (`glucometerType`, влияет на `generateMacroTargets`) остаётся подшагом программы «Диабет»; для остальных пропускается.
- D-09: В UI «Глюкометр» -> «Диабет». Хранимое `goalTrack` остаётся `glucometer`, схему и профили не мигрируем (уточнить при планировании).
- D-10: Шаг «Имя» в конце онбординга после входа/регистрации (есть userId); только тем, у кого имени нет (телефон, гость); у Google/Apple пропускается.
- D-11: Кнопка «Пропустить»; имя можно задать позже в Профиле.
- D-12: Имя отображается в Профиле; переиспользовать `convex/users/updateUserName.ts` и `components/profile/EditNameSheet.tsx`.
- D-13: Исправить дубли push и добавить новые уведомления с вкл/выкл и выбором времени; детали отданы исследованию и планировщику.

### Claude's Discretion
- Стратегия исправления дублей; какие новые уведомления, хранение настроек, UI выбора времени (согласовать с пользователем, если неочевидно).
- Точное место шага имени среди шагов «Результатов» (рядом с «Создать аккаунт», до пейволла).
- Новые поля профиля и миграции, если нужны.

### Deferred Ideas (OUT OF SCOPE)
- None. (Список новых уведомлений и способ выбора времени намеренно оставлены планировщику.) Подписка (73), OTP-каналы и дистрибуция (67) вне фазы.
</user_constraints>

<phase_requirements>
## Phase Requirements

ID требований для фазы не заданы (TBD). Планировщику рекомендуется ввести внутренние ID: ONB-GOAL (D-02/03), ONB-PROGRAM (D-04..09), ONB-NAME (D-10..12), PUSH-DEDUP (D-13 часть 1), PUSH-SETTINGS (D-13 часть 2).
</phase_requirements>

## Summary

Фаза состоит из двух независимых потоков. Онбординг целиком реализован массивом `sections` в `components/onboarding/Onboarding.tsx` с функциями `completed`/`skip`; изменения сводятся к перестановке шагов, правке `skip`-условий, удалению принудительных значений и расширению проверки `goalTrack === "glucometer"` на `biohacking` в 9 файлах. Важная находка: список шагов продублирован в `app/app/(settings)/generateMacroTargets.tsx` (пересчёт целей из настроек), его нужно менять синхронно, иначе поведение разойдётся.

Дубли push подтверждены чтением кода: `recordPushToken` ищет строку только по `userId` (`byUserId`), не трогая строки с тем же `expoPushToken` у других пользователей; при выходе токен не удаляется (`settings.tsx` вызывает только `signOut()`); оба cron (`checkMealReminders`, `checkWeighInReminders`) делают `collect()` по всей таблице и шлют по сообщению на каждую строку. Каждый гостевой/тестовый userId на том же устройстве даёт ещё одну строку и ещё одно сообщение; дедуп по `profile.lastMealReminderSentAt` работает по профилю, а не по токену, поэтому не срабатывает. Чинить надо в трёх слоях: запись (переназначение), выход (удаление), отправка (дедуп по `expoPushToken`), плюс разовая чистка существующих дублей.

Имя в Профиле уже отображается (`ProfileHeader` показывает `userName ?? "Гость"` и содержит `EditNameSheet`), `updateUserName` готова. Нужен только новый шаг онбординга и условие показа.

**Primary recommendation:** (1) Сначала push-фикс с миграцией дублей и дедупом в cron; (2) онбординг через правку `sections` + общий helper `hasHealthBlocks(goalTrack)`; (3) новые уведомления через единый объект настроек в профиле и один универсальный cron-проход с шагом времени 30 минут.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Порядок шагов, skip-правила онбординга | Browser/Client (RN) | — | Чистая клиентская навигация по `sections` |
| Показ блоков по программе | Client | API (observers, reports) | UI-флаг; серверные ответы отдают `isGlucometerTrack` для наблюдателя и отчётов |
| Привязка токена к устройству, чистка | API / Backend (Convex mutation) | Client (вызов при signOut) | Инвариант «токен уникален» держит только сервер |
| Дедуп отправки | API (cron internalMutation) | — | Последняя линия защиты на отправке |
| Хранение настроек и времени уведомлений | Database (profiles) | Client (экран настроек) | Cron читает профиль; клиент меняет через `updateProfile` |
| Выбор времени | Client (WheelPicker) | — | Локальное время, конвертация через `timezoneOffsetMinutes` токена |
| Шаг «Имя» | Client | API (`updateUserName`) | Условие показа по `users.name` |

## Standard Stack

Новых зависимостей не требуется. Всё уже в проекте. [VERIFIED: codebase grep, package.json]

| Библиотека | Версия | Назначение |
|---|---|---|
| convex | ^1.27.3 | мутации, cron, scheduler |
| @convex-dev/auth | ^0.0.90 | `getAuthUserId` |
| expo-notifications | ~0.32.17 | токен, обработчики на клиенте |
| `components/ui/WheelPicker.tsx` (in-repo) | — | выбор времени (часы/минуты) |
| `SettingsToggleItem`, `SettingsGroup` (in-repo) | — | переключатели |
| `convex-helpers` `partial` | ^0.1.104 | уже используется в `updateProfile` |

## Package Legitimacy Audit

Фаза не устанавливает внешних пакетов. Slopcheck не требовался. **Removed:** none. **Flagged:** none.

## Architecture Patterns

### Поток push (до и после)

```
Клиент (NotificationsProvider) --recordPushToken(token,tz)--> pushTokens (byUserId)
   ДО: ищет по userId, чужие строки с тем же token остаются
   ПОСЛЕ: удалить все строки с token у других userId, затем upsert своей

cron 30 мин -> checkMealReminders / checkWeighInReminders
   collect(pushTokens) -> по строке: profile -> окно времени -> дедуп по профилю -> messages[]
   ПОСЛЕ: collect -> группировка по expoPushToken (оставить самую свежую по updatedAt)
          -> дедуп сообщений по token на этапе сборки -> sendPushNotification

signOut (settings.tsx) -> ПОСЛЕ: сначала removePushToken(token устройства), затем signOut
deleteUser -> уже трогает pushTokens (проверить, что удаляет все строки пользователя)
```

### Рекомендуемые изменения по файлам

```
convex/notifications/recordPushToken.ts   # reassign: collect byExpoPushToken, удалить чужие
convex/notifications/removePushToken.ts   # NEW mutation: удалить строки (userId + token) при выходе
convex/notifications/sendPushNotification.ts  # deleteInvalidToken: collect() и удалить все
convex/notifications/dedupeTokens.ts      # NEW internalMutation: разовая чистка prod/dev
convex/notifications/checkMealReminders.ts, checkWeighInReminders.ts  # дедуп по токену
convex/tables/profiles.ts                 # + настройки новых уведомлений (optional)
app/app/(tabs)/settings.tsx               # вызвать removePushToken до signOut (2 места)
```

### Pattern 1: Инвариант «один токен = одна строка»
**What:** при регистрации токена удалить все строки с тем же `expoPushToken`, принадлежащие другим пользователям, и обновить/вставить строку текущего. Индекс `byExpoPushToken` уже есть. [CITED: 72-REVIEW.md WR-05; VERIFIED: convex/tables/pushTokens.ts]
```ts
const sameToken = await ctx.db
  .query("pushTokens")
  .withIndex("byExpoPushToken", (q) => q.eq("expoPushToken", expoPushToken))
  .collect();
for (const row of sameToken) {
  if (row.userId !== userId) await ctx.db.delete(row._id);
}
```
Кроме того у одного userId может быть несколько токенов (смена токена), а код берёт `.first()` по `byUserId`, то есть держит одну строку на пользователя; это допустимо, но при двух устройствах у одного пользователя второе вытесняет первое. Решение по мульти-устройствам отдельное (см. Open Questions).

### Pattern 2: Дедуп в cron по токену (страховка)
Перед циклом сгруппировать `tokens` по `expoPushToken` и оставить строку с максимальным `updatedAt` (последний вошедший владелец). Дополнительно `Set<string>` отправленных токенов в рамках тика. Это защищает от дублей даже до выполнения чистки и при гонках.

### Pattern 3: Шаги онбординга
Сейчас порядок: Цель-секция: GoalTrack, GlucometerType, Goal, TargetWeight, ChangeRate; Программа: Training. Новый порядок:
- «Цель»: GoalSection, Goal (skip: никогда), TargetWeight, ChangeRate (skip: `goal === "maintain"`, без проверки goalTrack).
- «Программа»: ProgramSection, GoalTrack (переименовать/переиспользовать как выбор программы, заголовок например «Какую программу выбрать?»), GlucometerType (skip: `goalTrack !== "glucometer"`), Training.
- Все те же правки в `generateMacroTargets.tsx` (там дублированный список; он плоский, без секций).

### Pattern 4: Единый признак блоков здоровья
Заменить 9 разрозненных сравнений на helper, например `lib/profile/hasHealthBlocks.ts`: `goalTrack === "glucometer" || goalTrack === "biohacking"`. Места: `app/app/(tabs)/index.tsx:56`, `app/app/(home)/day/[date].tsx:80`, `app/app/(settings)/health.tsx:32` (файл уже изменён в рабочем дереве, git status M), `components/tabs/TabsAddOptions.tsx:64`, `convex/observers/getPatientToday.ts:116`, `convex/observers/getObservedPatients.ts:141`; отчёты: `convex/reports/getMonthlyReport.ts:339` + `lib/reports/buildMonthlyReportHtml.ts` (там только подпись режима `goalTrackNames` — переименовать «Глюкометр» в «Диабет», а условие показа блоков сахара/давления в отчёте проверить отдельно, в grep по `goalTrack` его нет). Серверный helper нужно положить туда, откуда импортируют и клиент, и convex (путь `@/lib/...` уже используется в convex, пример `@/lib/notifications/reminderSchedule`). `useHealthKitSync(isGlucometerTrack)` тоже должен получать расширенный флаг (подтягивает данные Apple Health).

### Pattern 5: Шаг «Имя»
Размещение: секция «Результаты» после `OnboardingCreateAccount` и до `OnboardingPaywall`. `skip: ({isAuthenticated}) => !isAuthenticated || hasName`. Данные о наличии имени в `OnboardingContext` сейчас нет: источник — тот же query, который использует `ProfileHeader` для `rawUserName` (проверить какой, см. `components/profile/ProfileHeader.tsx`). Важно: пока query имени грузится (`undefined`), `skip` не должен возвращать false, иначе шаг мелькнёт у Google-пользователей; трактовать «загрузка» как skip=true до готовности нельзя навсегда — нужен явный loading-guard. Отдельный нюанс: `Onboarding.tsx` имеет `useEffect`, который автопереходит при `skip`, и `completed` для шага имени должен быть `() => true` (есть кнопка «Пропустить»). Мутация `updateUserName` бросает на пустую строку — кнопка «Продолжить» при пустом вводе должна работать как «Пропустить» без вызова мутации. Ошибку мутации показывать через `Toast` и не блокировать онбординг (паттерн `tryCatch` + `Toast`, как в `OnboardingCreateAccount`).

### Pattern 6: Новые уведомления и время
Рекомендация (требует подтверждения пользователя): хранить в `profiles` один optional-объект, чтобы не плодить колонки:
```ts
notificationPrefs: v.optional(v.object({
  // минуты от локальной полуночи; шаг 30 (совпадает с интервалом cron)
  weighIn:  v.optional(v.object({ enabled: v.boolean(), minutes: v.number() })),
  breakfast: ..., lunch: ..., dinner: ...,
  water / dailySummary / streakRisk / sugarPressure: ...
}))
```
Существующие `mealRemindersEnabled` / `weighInRemindersEnabled` оставить как fallback (`undefined` = включено, дефолтные времена 9:00/14:00/20:00/10:00), без миграции данных. Время выбирать `WheelPicker` (часы 0-23 x минуты 00/30). Cron работает окном 30 минут (`MEAL_REMINDER_WINDOW_MINUTES`), поэтому произвольные минуты (например 9:17) он не поймает без смены интервала — либо ограничить шаг 30 минутами (рекомендуется, ноль изменений в cron), либо перевести cron на 15/5 минут и параметризовать окно.
Кандидаты новых типов (предложение, не решение): вечерняя сводка дня (калории/БЖУ), риск потери стрика (стрик уже считается `computeStreakFromMealTimes`), вода — нет данных в схеме, пропустить; для программ Диабет/Биохакинг — «измерьте сахар» и «измерьте давление» (имеет смысл только если `hasHealthBlocks`). Какие именно — вопрос к пользователю.
Единый обобщённый обработчик: `lib/notifications/reminderSchedule.ts` расширить функцией `isLocalTimeInWindow(now, tz, minutesOfDay)` и использовать её для всех типов вместо жёстко зашитых точек; существующий verify-скрипт (`script:verifyMealReminderWindows`) расширить кейсами.

### Anti-Patterns
- **Фиксить только клиент (чистка при signOut):** выход приложения убитым, смена аккаунта без явного signOut, гость и reinstall оставляют строки. Нужны серверная переназначаемость и дедуп в cron.
- **Дедуп только по профилю:** сломан по построению (см. выше).
- **Менять `goalTrack` в БД ради переименования:** не нужно, D-09.
- **Менять только `Onboarding.tsx`:** `generateMacroTargets.tsx` держит свою копию списка шагов.

## Don't Hand-Roll

| Проблема | Не делать | Использовать | Почему |
|---|---|---|---|
| Выбор времени | Свой пикер | `components/ui/WheelPicker.tsx` | Уже есть и используется в онбординге (дата/рост) |
| Переключатели | Новые компоненты | `SettingsToggleItem` + `SettingsGroup` | Паттерн `notificationSettings.tsx` |
| Редактирование имени | Новая мутация/форма | `updateUserName`, `EditNameSheet` (или тот же `TextInput`) | Уже готово |
| Часовые пояса | Intl/библиотеки | `getLocalParts` из `reminderSchedule.ts` | Единая конвенция `getTimezoneOffset()` |
| Отправка push | Прямые fetch в мутациях | `sendPushNotification` через `scheduler.runAfter` | Мутации не могут делать fetch; уже есть батчи и receipts |

## Runtime State Inventory

(Применимо частично: фикс данных push и переименование отображаемого названия.)

| Категория | Найдено | Действие |
|---|---|---|
| Stored data | dev: один токен у 16 userId, другой у 5 [по CONTEXT.md, подтверждено пользователем]; prod не проверялся | Data migration: `internalMutation` дедупа (оставить по одной строке на токен с максимальным `updatedAt`), запустить на dev и prod. Это отдельная задача от кода `recordPushToken`. |
| Live service config | Expo Push API: не хранит привязок | None |
| OS-registered state | Токены на устройствах пользователей не меняются | None |
| Secrets/env vars | Нет | None |
| Build artifacts | Нет. `goalTrack` значение `glucometer` в существующих профилях остаётся валидным (D-09) | None; но существующие `biohacking`-пользователи с принудительным `goal: maintain` останутся как есть, новый выбор цели для них не запрашивается ретроактивно |

## Common Pitfalls

### Pitfall 1: Пропавшие данные цели у старых пользователей
**What goes wrong:** у существующих biohacking/glucometer профилей `goal = maintain`, `targetWeight = weight`. После D-03 новые пользователи этих программ получают реальную цель, старые нет. **Avoid:** не мигрировать (D-09 по духу); `generateMacroTargets.tsx` теперь тоже спрашивает цель у всех, значит пользователь может изменить позже.

### Pitfall 2: `isOnboardingDataComplete` и `goalTrack`
Функция требует `goal`, `targetWeight`, `weightChangeRate` для всех (они в `onboardingFields`), раньше принудительные значения их заполняли. После удаления принуд. логики `goal` у программы биохакинг должна выбираться пользователем; `targetWeight`/`weightChangeRate` берутся из дефолтов `profilesConfig.defaultDataValues` либо проставляются в `OnboardingGoal` при `maintain` (уже так). Проверить дефолты.

### Pitfall 3: Порядок сброса `glucometerType`
При смене программы с Диабет на другую `glucometerType` нужно сбросить (было в `OnboardingGoalTrack`, сохранить), иначе `generateMacroTargets` применит коэффициенты диабета к «Контролю веса». Проверить в `generateMacroTargets` условие применения `glucometerType` (оно должно проверять `goalTrack === "glucometer"`).

### Pitfall 4: Автопропуск шагов и состояние загрузки
`Onboarding.tsx` вызывает `handleNext` из эффекта при `skip`; шаг «Имя» с нестабильным `skip` (query ещё грузится) приведёт к мельканию или к пропуску. Использовать `undefined`-guard.

### Pitfall 5: Профиль и данные до входа
`OnboardingContext` перезаписывает `data` из `profile.data` после входа (эффект на `profile?.data`). Не хранить имя в `data` (это `ProfileData`, схема профиля); имя живёт в `users.name`.

### Pitfall 6: Cron нагрузка
Оба cron делают `collect()` всей `pushTokens` и N запросов профиля; добавление ещё типов умножает чтения. Объединить в один проход по токенам (одна выборка профиля на токен, внутри проверка всех типов) или хотя бы дедупить токены до запросов профилей, что одновременно сокращает чтения. Лимиты мутации Convex (чтения/записи на транзакцию) следует учитывать при росте таблицы; сейчас масштаб небольшой.

### Pitfall 7: Выход без сети / гость
`removePushToken` перед `signOut` может упасть (нет сети); не блокировать выход, ловить ошибку и логировать. Серверный reassign при следующем входе всё равно исправит состояние. Также анонимный вход в онбординге (`signIn("anonymous")`) создаёт новый userId каждый раз: именно это порождает «лишние» userId на одном устройстве.

### Pitfall 8: Уведомления в тёмной зоне
Новые типы с настраиваемым временем позволяют поставить 03:00; допустимо (выбор пользователя), но дефолты держать днём.

## Code Examples

### removePushToken (новая мутация)
```ts
// convex/notifications/removePushToken.ts
const removePushToken = mutation({
  args: { expoPushToken: v.string() },
  handler: async (ctx, { expoPushToken }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null; // уже вышли: ничего не делаем
    const rows = await ctx.db.query("pushTokens")
      .withIndex("byExpoPushToken", (q) => q.eq("expoPushToken", expoPushToken))
      .collect();
    for (const row of rows) if (row.userId === userId) await ctx.db.delete(row._id);
    return null;
  },
});
```
Клиенту нужен токен устройства: получить `Notifications.getExpoPushTokenAsync({ projectId })` в момент выхода или сохранить в ref/контексте при регистрации (предпочтительно: `NotificationsProvider` экспортирует функцию/хранит токен). Альтернатива без токена: удалить все строки текущего `userId` по `byUserId` (проще, и достаточно, так как строка на пользователя одна).

### Дедуп в cron
```ts
const latestByToken = new Map<string, Doc<"pushTokens">>();
for (const t of tokens) {
  const prev = latestByToken.get(t.expoPushToken);
  if (!prev || t.updatedAt > prev.updatedAt) latestByToken.set(t.expoPushToken, t);
}
for (const token of latestByToken.values()) { /* прежняя логика */ }
```

## State of the Art

Ничего устаревшего в используемом стеке; Expo Push API и `expo-notifications` 0.32 применяются как раньше. [ASSUMED: актуальность Expo Push API не перепроверялась в этой сессии, фаза её не меняет]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Новые типы: вечерняя сводка, риск потери стрика, измерение сахара/давления для программ со здоровьем | Pattern 6 | Пользователь хочет другие; нужно подтверждение до планирования |
| A2 | Шаг времени 30 минут (под cron) приемлем | Pattern 6 | Пользователь ждёт произвольные минуты, нужен cron 5-15 мин |
| A3 | Один токен на пользователя (мульти-устройства не поддерживаем) | Pattern 1 | Пользователь с двумя устройствами получает push на одно |
| A4 | Отчёт (`buildMonthlyReportHtml`) скрывает/показывает блоки сахара по `goalTrack` | Pattern 4 | В grep такого условия нет — возможно, блоки в отчёте зависят от наличия данных; проверить при планировании |
| A5 | Данные prod по дублям отсутствуют | Runtime State | Чистка на prod требует отдельной проверки и запуска |

## Open Questions (RESOLVED)

1. **Какие новые уведомления добавлять и какой шаг времени?** Согласовать с пользователем (A1, A2) до плана; это основной неопределённый объём фазы.
2. **Мультиустройства:** держать одну строку на пользователя (текущая модель) или несколько (тогда уникальность по токену, `byUserId` -> collect)? Рекомендация: одна строка на токен, несколько строк на пользователя допустимо; cron дедупит по токену. Если выбрано «несколько устройств», меняется `.first()` в `recordPushToken`.
3. **Prod-диагностика:** выполнить запрос на prod для подсчёта дублей (токены с >1 userId) до/после миграции.
4. **Условие показа блоков сахара в отчёте:** уточнить в `getMonthlyReport.ts` и `buildMonthlyReportHtml.ts`.

## Environment Availability

Внешних зависимостей нет (код и Convex-деплой на dev/prod). Для проверки push нужен физический девайс/TestFlight; симулятор iOS не получает Expo push-токены. [ASSUMED]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Нет jest/vitest; проект использует node-скрипты проверки (`ts-node` assert, `scripts/verify*.ts`, `scripts/checks/*.check.mjs`) |
| Quick run | `npm run script:verifyMealReminderWindows`, `npm run script:verifyWeighInReminder` |
| Full suite | `npx tsc --noEmit` + `npm run lint` + все `script:verify*` |

### Phase Requirements -> Test Map
| Req | Behavior | Type | Command | Exists |
|-----|----------|------|---------|--------|
| PUSH-DEDUP | Группировка токенов оставляет одну строку на токен | unit (чистая функция `pickLatestTokenRows` в `lib/notifications/`) | новый `scripts/verifyPushTokenDedupe.ts` | Wave 0 |
| PUSH-SETTINGS | `isLocalTimeInWindow` с настраиваемым временем и tz | unit | расширить `verifyMealReminderWindows.ts` | частично |
| ONB-PROGRAM | `hasHealthBlocks(goalTrack)` | unit | `scripts/verifyHealthBlocks.ts` | Wave 0 |
| ONB-GOAL | `isOnboardingDataComplete` для biohacking с выбранной целью | unit | скрипт | Wave 0 |
| ONB-NAME | skip-логика шага имени | manual (UI) | — | manual |
| Дубли e2e | 1 уведомление на устройство | manual: dev, `sendTestPush`/запуск cron, смена аккаунтов на одном девайсе | — | manual |

### Sampling
Per commit: `npx tsc --noEmit` и соответствующий verify-скрипт. Phase gate: всё выше + ручной сценарий дублей на dev (смена гость -> телефон -> Google на одном устройстве, затем ручной запуск cron).

### Wave 0 Gaps
- [ ] `scripts/verifyPushTokenDedupe.ts` (+ npm script)
- [ ] `scripts/verifyHealthBlocks.ts` (+ npm script)
- [ ] расширение `verifyMealReminderWindows.ts`

## Security Domain

| ASVS | Applies | Control |
|------|---------|---------|
| V2/V3 | да (вход/выход) | `getAuthUserId` во всех новых мутациях |
| V4 Access Control | да | `removePushToken`/`recordPushToken` работают только со строками текущего userId либо переназначают токен на аутентифицированного владельца; миграция дедупа - `internalMutation` |
| V5 Input Validation | да | регулярка токена уже есть; `notificationPrefs.minutes` валидировать `0..1439` и кратность 30; имя `trim`, ограничить длину (сейчас лимита нет — добавить, например 100 символов) |
| V6 | нет | — |

| Угроза | STRIDE | Митигация |
|---|---|---|
| Утечка содержимого напоминаний чужому владельцу устройства (WR-05) | Information disclosure | Переназначение/удаление токена при входе и выходе, дедуп в cron |
| Захват чужого токена вызовом `recordPushToken` | Spoofing | Нужна аутентификация; токен нельзя «угадать»; переназначение на вызывающего допустимо (владелец устройства = последний вошедший) |
| Слишком длинное имя | Tampering/DoS | Лимит длины в `updateUserName` |

## Project Constraints (from CLAUDE.md)
- Отвечать пользователю на русском. Комментарии в коде в проекте на русском; следовать этому стилю.

## Sources

### Primary (HIGH, прочитан код)
- `components/onboarding/Onboarding.tsx`, `OnboardingGoalTrack.tsx`, `OnboardingTraining.tsx`, `OnboardingGoal.tsx`, `OnboardingGlucometerType.tsx`, `OnboardingCreateAccount.tsx`
- `context/OnboardingContext.tsx`, `app/app/(settings)/generateMacroTargets.tsx`
- `convex/notifications/*`, `convex/tables/pushTokens.ts`, `convex/tables/profiles.ts`, `convex/crons.ts`, `convex/users/updateUserName.ts`, `convex/profiles/updateProfile.ts`
- `lib/notifications/reminderSchedule.ts`, `components/notifications/NotificationsProvider.tsx`, `app/app/(settings)/notificationSettings.tsx`, `app/app/(tabs)/settings.tsx`, `components/profile/ProfileHeader.tsx`
- `.planning/phases/72-push-testflight-telegram-whatsapp-otp/72-REVIEW.md` (WR-05)

### Secondary / Tertiary
- Нет (внешние источники не использовались).

## Metadata

**Confidence:** стек HIGH (ничего нового), архитектура HIGH (прочитан код), pitfalls MEDIUM-HIGH, список новых уведомлений LOW (нужны решения пользователя).
**Research date:** 2026-10-21
**Valid until:** 30 дней

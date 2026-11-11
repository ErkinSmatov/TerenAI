# Phase 74: Онбординг и push-уведомления - Pattern Map

**Mapped:** 2026-10-21
**Files analyzed:** 24 (новых и изменяемых)
**Analogs found:** 24 / 24

Scope push по Addendum в CONTEXT.md: фундамент (дедуп токенов, лимит C/D 3 в день, тихие часы 22:00-08:00, ротация текстов, длины) + FOOD-01, HLT-14, RET-01/02/03. Выбор времени НЕ делаем, только вкл/выкл по типам.

## File Classification

| Файл | Роль | Data Flow | Ближайший аналог | Качество |
|------|------|-----------|------------------|----------|
| `components/onboarding/Onboarding.tsx` (M) | config (массив sections) | event-driven (навигация) | сам файл + `app/app/(settings)/generateMacroTargets.tsx` | exact |
| `app/app/(settings)/generateMacroTargets.tsx` (M) | config (дубль списка шагов) | event-driven | `Onboarding.tsx` | exact |
| `components/onboarding/steps/goal/OnboardingGoalTrack.tsx` (M, переезд в program/) | component | request-response (Select) | `steps/goal/OnboardingGoal.tsx` | exact |
| `components/onboarding/steps/program/OnboardingTraining.tsx` (M) | component | request-response | сам файл | exact |
| `components/onboarding/steps/goal/OnboardingGlucometerType.tsx` (M, текст «Диабет») | component | request-response | `OnboardingGoalTrack.tsx` | exact |
| `components/onboarding/steps/end/OnboardingName.tsx` (NEW) | component | request-response (мутация) | `steps/end/OnboardingCreateAccount.tsx` | role-match |
| `context/OnboardingContext.tsx` (M, `isOnboardingDataComplete`) | provider | transform | сам файл | exact |
| `lib/profile/hasHealthBlocks.ts` (NEW) | utility | transform | `lib/notifications/reminderSchedule.ts` (чистый модуль) | role-match |
| `app/app/(tabs)/index.tsx`, `app/app/(home)/day/[date].tsx`, `app/app/(settings)/health.tsx`, `components/tabs/TabsAddOptions.tsx` (M) | component/screen | request-response | сами файлы (замена одной строки) | exact |
| `convex/observers/getPatientToday.ts`, `getObservedPatients.ts` (M) | service (query) | request-response | сами файлы | exact |
| `lib/reports/buildMonthlyReportHtml.ts` (M, подпись) | utility | transform | сам файл | exact |
| `convex/notifications/recordPushToken.ts` (M) | service (mutation) | CRUD | сам файл | exact |
| `convex/notifications/removePushToken.ts` (NEW) | service (mutation) | CRUD | `recordPushToken.ts` | exact |
| `convex/notifications/dedupeTokens.ts` (NEW) | migration (internalMutation) | batch | `sendPushNotification.ts::deleteInvalidToken` | role-match |
| `convex/notifications/sendPushNotification.ts` (M, `deleteInvalidToken`) | service | CRUD | сам файл | exact |
| `convex/notifications/checkMealReminders.ts`, `checkWeighInReminders.ts` (M) | service (cron) | batch | сами файлы | exact |
| `convex/notifications/checkRetentionReminders.ts` (NEW: RET-01/02/03) | service (cron) | batch | `checkWeighInReminders.ts` | exact |
| `convex/notifications/checkMissedMealReminders.ts` (NEW: FOOD-01), HLT-14 | service (cron) | batch | `checkMealReminders.ts` | exact |
| `convex/crons.ts` (M) | config | batch | сам файл | exact |
| `lib/notifications/reminderSchedule.ts` (M) + новый `lib/notifications/pushRules.ts` (NEW: тихие часы, лимит, ротация, длины, `pickLatestTokenRows`) | utility | transform | `reminderSchedule.ts` | exact |
| `convex/tables/profiles.ts` (M, `notificationPrefs`, метки отправки, `lastActiveAt`) | model | CRUD | поля `weighInRemindersEnabled` / `lastMealReminderSentAt` (строки 21-24) | exact |
| `app/app/(settings)/notificationSettings.tsx` (M) | component (screen) | CRUD | сам файл | exact |
| `app/app/(tabs)/settings.tsx` (M, вызов removePushToken до signOut) | component | request-response | сам файл | exact |
| `scripts/verifyPushTokenDedupe.ts`, `verifyHealthBlocks.ts`, `verifyPushRules.ts` (NEW) + расширение `verifyMealReminderWindows.ts`; `package.json` | test | transform | `scripts/verifyWeighInReminder.ts` | exact |

## Pattern Assignments

### `components/onboarding/Onboarding.tsx` и `app/app/(settings)/generateMacroTargets.tsx` (config, event-driven)

**Analog:** `components/onboarding/Onboarding.tsx` строки 124-191 (секции «Цель» и «Программа»). Копия плоского списка в `generateMacroTargets.tsx` строки 95-136 меняется СИНХРОННО (без секций, те же `skip`).

**Текущее (что менять):**
```tsx
// Onboarding.tsx 134-170: GoalTrack -> GlucometerType -> Goal(skip!=weightControl) -> TargetWeight/ChangeRate (skip: goalTrack !== "weightControl" || goal === "maintain")
{
  screen: <OnboardingGoal key="goal" />,
  completed: ({ data }) => data.goal !== undefined,
  skip: ({ data }) => data.goalTrack !== "weightControl",
  ...
},
{
  screen: <OnboardingTargetWeight key="target-weight" />,
  completed: () => true,
  skip: ({ data }) =>
    data.goalTrack !== "weightControl" || data.goal === "maintain",
```
**Целевое (D-02..D-04):**
- «Цель»: GoalSection, Goal (`skip: () => false`), TargetWeight и ChangeRate (`skip: ({ data }) => data.goal === "maintain"`, без проверки goalTrack).
- «Программа»: ProgramSection, GoalTrack (`completed: data.goalTrack !== undefined`, `skip: () => false`), GlucometerType (`skip: ({ data }) => data.goalTrack !== "glucometer"` - это условие уже есть, строка 144), Training.
- Использовать `showHeader`/`scrollView` как у перенесённых шагов (GoalTrack: `true/true`). `numSteps={sectionSteps.length - 1}`, `currentStep={step - 1}` в `Onboarding.tsx` 389-391: шаг-заставка секции считается нулевым, сохранять его первым в секции.

**Новый шаг имени в «Результатах»** (после `OnboardingCreateAccount`, до `OnboardingPaywall`), формат шага из строк 202-208:
```tsx
{
  screen: <OnboardingName key="name" />,
  completed: () => true,
  skip: ({ isAuthenticated }) => !isAuthenticated /* || hasName, см. ниже */,
  showHeader: false,
  scrollView: true,
},
```
`skip` вызывается из `useEffect` (Onboarding.tsx 366-370) и из `handleNext`/`handleBack`, поэтому нестабильный skip (query грузится) приведёт к мельканию. Контекст `OnboardingContextValue` не содержит имени: добавить в контекст поле (например `hasUserName: boolean | undefined`) из `useQuery(api.home.getCurrentUserRawName.default)` (тот же query в `components/profile/ProfileHeader.tsx:49`) и считать `skip` как `!isAuthenticated || hasUserName !== false` с явным ожиданием загрузки (undefined не должен вести к показу). Не класть имя в `data` (Pitfall 5 в RESEARCH).

---

### `components/onboarding/steps/goal/OnboardingGoalTrack.tsx` (component, request-response)

**Analog:** сам файл и `OnboardingGoal.tsx` (Select-шаблон). Переместить в `steps/program/`, заменить заголовок («Что вас интересует больше всего?» на вопрос про программу), подпись «Глюкометр» на «Диабет».

**Select + сброс glucometerType** (текущий код, строки 6-35):
```tsx
const options: SelectOption[] = [
  { name: "biohacking", label: "Биохакинг", Icon: FlaskConicalIcon },
  { name: "glucometer", label: "Глюкометр", Icon: DropletIcon },   // -> "Диабет"
  { name: "weightControl", label: "Контроль веса", Icon: ScaleIcon },
];
...
setData((prev) => ({
  ...prev,
  goalTrack: name,
  glucometerType: name === "glucometer" ? prev.glucometerType : undefined,
}));
```
**Убрать** (D-03): `goal: "maintain"`, `targetWeight: prev.weight`, `weightChangeRate: 0` (строки 30-32) и ветку `if (name === "weightControl")`. Единый `setData` как выше. Значение `"glucometer"` оставить (D-09).

**Образец Select-шага** (`OnboardingGoal.tsx` 12-37): `useOnboardingContext()`, `selectedOptions`, `<OnboardingStep title=...><Select ... animated animationDelay={100} /></OnboardingStep>`.

**Замечание по `isOnboardingDataComplete`** (`context/OnboardingContext.tsx` 110-121): `goal`, `targetWeight`, `weightChangeRate` уже в `onboardingFields`; после удаления принудительных значений они заполняются шагом `OnboardingGoal` (`maintain` подставляет `weight` и `0`, см. OnboardingGoal.tsx 18-23). Менять функцию, скорее всего, не нужно; проверить дефолты `profilesConfig.defaultDataValues`.

---

### `components/onboarding/steps/end/OnboardingName.tsx` (NEW; component, request-response)

**Analog:** `components/onboarding/steps/end/OnboardingCreateAccount.tsx`.

**Imports + структура + ошибка через Toast** (строки 1-50):
```tsx
import { StyleSheet, View } from "react-native";
import OnboardingStep from "../../OnboardingStep";
import Button from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import tryCatch from "@/lib/utils/tryCatch";
import logError from "@/lib/utils/logError";
...
const { error } = await tryCatch(signIn("anonymous"));
if (error) {
  logError("Anonymous sign-in error", error);
  Toast.show({ text: "Не удалось ... Попробуйте ещё раз", variant: "error" });
}
```
Кнопка «Пропустить»: `<Button size="lg" variant="text" textProps={{ size: "16", weight: "500" }}>` (как «Продолжить без аккаунта», строки 61-70). Мутация: `useMutation(api.users.updateUserName.default)`; пустой ввод не вызывает мутацию (она бросает `"Имя не может быть пустым"`, `convex/users/updateUserName.ts` 20-23). Переход дальше: как в `OnboardingCreateAccount` шаг сам не листается, нужен `onNext` из `OnboardingSectionLayout`; продумать, как шаг вызывает переход (в CreateAccount переход происходит через `skip` по `isAuthenticated`; для имени понадобится доступ к `handleNext` через контекст или кнопка «Далее» layout-а с `completed: () => true`, тогда сохранять имя при blur/по нажатию общей кнопки не получится - планировщику выбрать: своя кнопка + прокидывание `onNext`). Поле ввода: взять `TextInput` и стиль из `components/profile/EditNameSheet.tsx` (reuse по D-12; лимит длины добавить в `updateUserName`, 100 символов, V5).

---

### `lib/profile/hasHealthBlocks.ts` (NEW; utility, transform)

**Analog:** `lib/notifications/reminderSchedule.ts` (чистый модуль без зависимостей от convex/react-native, импортируется и из convex через `@/lib/...`, и из ts-node verify).
```ts
export function hasHealthBlocks(goalTrack: string | undefined | null): boolean {
  return goalTrack === "glucometer" || goalTrack === "biohacking";
}
```
**Места замены (D-07), точные строки:**
- `app/app/(tabs)/index.tsx:56` `const isGlucometerTrack = profile?.data?.goalTrack === "glucometer";`
- `app/app/(home)/day/[date].tsx:80` (то же)
- `app/app/(settings)/health.tsx:32` (файл с незакоммиченными правками, git status M: аккуратно)
- `components/tabs/TabsAddOptions.tsx:64` `getTabAddOptions(profile?.data?.goalTrack === "glucometer")`
- `convex/observers/getPatientToday.ts:116` и `convex/observers/getObservedPatients.ts:141`: `isGlucometerTrack: patientProfile?.data?.goalTrack === "glucometer"`
- `useHealthKitSync(isGlucometerTrack)` (`index.tsx:58`) получает расширенный флаг автоматически.
- Отчёты: `convex/reports/getMonthlyReport.ts:339` лишь отдаёт `goalTrack`, условия показа блоков сахара там нет; в `lib/reports/buildMonthlyReportHtml.ts:6-8` только `goalTrackNames` (`glucometer: "Контроль глюкозы"`), переименование по D-09 (на «Диабет»). Блоки сахара/давления в отчёте по `goalTrack` не гейтятся; для D-07 «Контроль веса не видит блоки в отчётах» проверить отдельно (RESEARCH Open Question 4, A4).
- Переменную можно оставить с именем `isGlucometerTrack` (минимальный diff) либо переименовать.

---

### `convex/notifications/recordPushToken.ts` (M; service, CRUD)

**Analog:** сам файл. Сохранить try/catch + `logError`, `getAuthUserId`, валидации (строки 18-32). Вставить перед `existing` (строка 34) инвариант «один токен = одна строка»:
```ts
// Индекс byExpoPushToken уже есть (convex/tables/pushTokens.ts 21-22).
const sameToken = await ctx.db
  .query("pushTokens")
  .withIndex("byExpoPushToken", (q) => q.eq("expoPushToken", expoPushToken))
  .collect();
for (const row of sameToken) {
  if (row.userId !== userId) await ctx.db.delete(row._id);
}
```
Далее прежняя логика `existing` по `byUserId` (`.first()`), `console.log` с `tokenSuffix`. Решить Open Question 2 (мультиустройства): текущая модель держит одну строку на userId, второй девайс вытесняет первый.

### `convex/notifications/removePushToken.ts` (NEW; service, CRUD)

**Analog:** `recordPushToken.ts` (формат `mutation`, `getAuthUserId`, `logError`, `export default`). Код-образец в RESEARCH «Code Examples». При `userId === null` вернуть `null`, не бросать. Вариант без токена: удалить все строки текущего `byUserId` (проще; `getExpoPushTokenAsync` вызывается в `NotificationsProvider.tsx:77`, токен там не сохраняется).

**Клиент:** `app/app/(tabs)/settings.tsx` строки 64-73 (`handleDeleteAccount`, `handleSignOut`):
```tsx
const handleSignOut = async () => {
  await signOut();        // перед ним: await tryCatch(removePushToken(...)) - не блокировать выход, логировать (Pitfall 7)
  if (router.canDismiss()) router.dismissAll();
  router.replace("/auth");
};
```
Использовать `tryCatch` из `@/lib/utils/tryCatch` (возвращает `{data, error}`) и `logError`.

### `convex/notifications/sendPushNotification.ts::deleteInvalidToken` (M)

Строки 146-163: `.first()` + delete заменить на `.collect()` и удаление ВСЕХ строк токена. Структура `internalMutation` + `try/catch + logError` сохраняется.

### `convex/notifications/dedupeTokens.ts` (NEW; migration, batch)

**Analog:** `deleteInvalidToken` (`internalMutation`, `withIndex("byExpoPushToken")`, `ctx.db.delete`). Обойти `pushTokens.collect()`, сгруппировать по `expoPushToken`, оставить максимальный `updatedAt`, удалить остальные. Логику группировки вынести в чистую `pickLatestTokenRows` в `lib/notifications/` (для `verifyPushTokenDedupe.ts`). Запуск вручную на dev и prod (`npx convex run`).

---

### Cron-обработчики (`checkMealReminders.ts`, `checkWeighInReminders.ts`, новые `check*Reminders.ts`) (service, batch)

**Analog:** `checkWeighInReminders.ts` (компактный, 79 строк) для RET/HLT-14, `checkMealReminders.ts` для FOOD-01.

**Каркас (скопировать):**
```ts
const checkWeighInReminders = internalMutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    try {
      const now = Date.now();
      const tokens = await ctx.db.query("pushTokens").collect();
      const messages: { expoPushToken: string; title: string; body: string; data?: { url: string } }[] = [];
      for (const token of tokens) {
        const profile = await ctx.db.query("profiles")
          .withIndex("byUserId", (q) => q.eq("userId", token.userId)).first();
        if (!profile) continue;
        if (profile.weighInRemindersEnabled === false) continue; // undefined = включено
        ...
        messages.push({ expoPushToken: token.expoPushToken, title, body, data: { url: "/app/(settings)/weeklyWeighIn" } });
        await ctx.db.patch(profile._id, { lastWeighInReminderSentAt: now }); // метка ДО отправки, в той же транзакции
      }
      if (messages.length > 0) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification.default, { messages });
      }
      return null;
    } catch (error) { logError("checkWeighInReminders error", error); throw error; }
  },
});
```
**Что добавить:**
1. Дедуп по токену сразу после `collect()` (Pattern 2, RESEARCH): `Map<string, Doc<"pushTokens">>` по максимальному `updatedAt`, цикл по `latestByToken.values()`. Плюс `Set<string>` токенов, уже получивших сообщение в этом тике (чтобы разные типы в одном проходе не слали два push на устройство подряд).
2. Проверка `notificationPrefs?.<type>?.enabled === false` как у `mealRemindersEnabled === false`.
3. Новые метки отправки в `profiles` по образцу `lastWeighInReminderSentAt`/`lastMealReminderSentAt`.
4. Общие правила (чистые функции в `lib/notifications/pushRules.ts`): тихие часы 22:00-08:00 по `getLocalParts(now, token.timezoneOffsetMinutes).minutesSinceLocalMidnight`; лимит классов C/D 3 в день (нужно хранить счётчик/метки за локальные сутки; `localDayStartUtcMs` из `getLocalParts`); ротация текстов 1-3 без повтора подряд (хранить индекс последнего варианта в профиле); длины title ≤40, body ≤140, один эмодзи в конце. Тексты и условия FOOD-01/HLT-14/RET-01..03 брать из `docs/TEREN_Push_Notifications.xlsx`.
5. RET-01/02/03 требует «даты последней активности» (`lastActiveAt`): в схеме такого поля нет; источник и место записи определить (например по последнему `meals`/сессии), иначе нужно новое поле профиля.
6. Объединение проходов (Pitfall 6): желательно один cron-проход по токенам с одним чтением профиля.

**Деталь для `checkMealReminders.ts`:** окно через `resolveDueMealPoint` (строки 39-43), дедуп профиля `isMealReminderDeduped` (45-47) остаётся, но токен-дедуп добавляется поверх.

### `convex/crons.ts` (M; config)

**Analog:** сам файл. Новый cron добавлять тем же блоком:
```ts
crons.interval("check meal reminders", { minutes: 30 }, internal.notifications.checkMealReminders.default);
```
Интервал 30 минут сохранить (комментарий в файле про совпадение с `MEAL_REMINDER_WINDOW_MINUTES` и смещения часовых поясов 30/45 минут).

### `convex/tables/profiles.ts` (M; model)

**Analog:** строки 21-24:
```ts
weighInRemindersEnabled: v.optional(v.boolean()),
mealRemindersEnabled: v.optional(v.boolean()),
lastWeighInReminderSentAt: v.optional(v.number()),
lastMealReminderSentAt: v.optional(v.number()),
```
Добавить `notificationPrefs: v.optional(v.object({ ...: v.optional(v.boolean()) }))` (только вкл/выкл без времени, решение пользователя; RESEARCH Pattern 6 с `minutes` НЕ применять) и новые `last*SentAt` по тем же правилам optional. Старые поля оставить (`undefined` = включено). `updateProfile` использует `partial` из convex-helpers, поэтому новое поле патчится так же (`updateProfile({ profile: {...} })`).

### `app/app/(settings)/notificationSettings.tsx` (M; component, CRUD)

**Analog:** сам файл (61 строка). Паттерн (строки 35-45):
```tsx
<SettingsToggleItem
  text="Напоминание о взвешивании"
  caption="Раз в 7 дней, если вес давно не обновлялся"
  Icon={ScaleIcon}
  value={profile?.weighInRemindersEnabled ?? true}
  onValueChange={(value) => { void updateProfile({ profile: { weighInRemindersEnabled: value } }); }}
/>
```
Добавить по такому же `SettingsToggleItem` на каждый новый тип (иконки из `lucide-react-native`); для вложенного `notificationPrefs` не затирать соседние ключи (передавать объект целиком из `profile?.notificationPrefs`). Пикер времени не нужен.

---

### Тесты: `scripts/verifyPushTokenDedupe.ts`, `verifyHealthBlocks.ts`, `verifyPushRules.ts`

**Analog:** `scripts/verifyWeighInReminder.ts`.
```ts
import assert from "node:assert/strict";
import { DAY_MS, isWeighInDue } from "@/lib/notifications/reminderSchedule";
const OFFSET_SUMMER = -120; // Europe/Berlin CEST по конвенции getTimezoneOffset()
const IN_WINDOW_UTC = Date.UTC(2026, 7, 25, 8, 10, 0);
assert.strictEqual(isWeighInDue({...}), true);
```
Регистрация в `package.json` (строки 22-29):
`"script:verifyWeighInReminder": "ts-node -r tsconfig-paths/register scripts/verifyWeighInReminder.ts"`; для tz-зависимых добавлять `TZ=Europe/Berlin` как у `verifyMealReminderWindows`. Фреймворков jest/vitest в проекте нет.

---

## Shared Patterns

### Convex mutation каркас
**Источник:** `convex/notifications/recordPushToken.ts` 1-20, 71-77.
**Применять к:** `removePushToken`, `dedupeTokens` (internal), все новые cron-мутации.
```ts
import { mutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import logError from "@/lib/utils/logError";
...
try { const userId = await getAuthUserId(ctx); if (userId === null) throw new Error("Unauthorized"); ... }
catch (error) { logError("<name> error", error); throw error; }
export default <name>;
```
Cron-обработчики: `internalMutation` (не action), `args: {}`, отправка через `ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification.default, { messages })`.

### Отправка push
**Источник:** `sendPushNotification.ts` (формат `messages: { expoPushToken, title, body, data?: { url } }`; батчи по 100, ретрай один раз, receipts через 15 минут). Не добавлять свои fetch.

### Часовой пояс
**Источник:** `lib/notifications/reminderSchedule.ts` 32-46 `getLocalParts(nowUtcMs, timezoneOffsetMinutes)` (`localMs = utcMs - offset*60_000`). Для тихих часов и суточного лимита использовать только его.

### Клиентские ошибки
**Источник:** `lib/utils/tryCatch.ts` (`{ data, error }`), `logError`, `Toast.show({ text, variant: "error" })` из `components/ui/Toast`. Применять в `OnboardingName`, `settings.tsx` (выход).

### Комментарии и язык
Комментарии в коде, тексты UI и push на русском (CLAUDE.md проекта).

## No Analog Found

| Файл | Роль | Data Flow | Причина |
|------|------|-----------|---------|
| `lib/notifications/pushRules.ts` (лимит классов C/D, ротация текстов) | utility | transform | Лимитов и ротации в коде нет; формулы строить на `getLocalParts`, стиль чистых функций как в `reminderSchedule.ts`; правила из листа «Правила» xlsx |
| `lastActiveAt` для RET-01..03 | model/field | event-driven | Нет поля и места записи активности пользователя; нужна проектная проработка |
| Серверная гейтинг блоков сахара в отчёте | utility | transform | В `getMonthlyReport.ts`/`buildMonthlyReportHtml.ts` условия по goalTrack нет (только подпись режима) |

## Предупреждения для планировщика

- `glucometerType` в `lib`/`convex`/`app` встречается только в схеме профиля и в списке шагов; расчёт норм, по утверждению CONTEXT D-08 (`generateMacroTargets`), нужно найти в `utils`/`config`/`hooks` и убедиться, что условие применения проверяет `goalTrack === "glucometer"` (Pitfall 3 RESEARCH).
- Незакоммиченные правки (git status M): `app/app/(settings)/health.tsx`, `components/onboarding/OnboardingSection.tsx` и др.; править с учётом текущего рабочего дерева.

## Metadata

**Analog search scope:** `components/onboarding`, `context`, `convex/notifications`, `convex/tables`, `convex/users`, `convex/observers`, `convex/reports`, `lib/notifications`, `lib/reports`, `app/app/(tabs|settings|home)`, `scripts`, `package.json`
**Pattern extraction date:** 2026-10-21

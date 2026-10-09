# Phase 72: Push в TestFlight, цель, Telegram и WhatsApp OTP - Pattern Map

**Mapped:** 2026-10-09
**Files analyzed:** 11 (новых/изменяемых)
**Analogs found:** 11 / 11 (для 2 файлов аналог частичный)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `convex/notifications/sendPushNotification.ts` (изм.: сбор ticket id + планирование receipts) | service (internalAction) | event-driven / batch | он сам + `checkMealReminders.ts` (scheduler.runAfter) | exact |
| `convex/notifications/checkPushReceipts.ts` (новый) | service (internalAction) | batch / request-response | `convex/notifications/sendPushNotification.ts` | exact |
| `convex/notifications/sendTestPush.ts` (новый, опц. internalAction для диагностики) | service (internalAction) | request-response | `sendPushNotification.ts` | role-match |
| `convex/TelegramOTP.ts` (изм.) | provider | request-response | он сам | exact |
| `convex/WhatsAppOTP.ts` (изм.) | provider | request-response | `convex/TelegramOTP.ts` | exact |
| `convex/utils/otpErrors.ts` (новый: классификатор ошибок, чистая функция) | utility | transform | `convex/utils/otp.ts` (рядом, чистые утилиты) | role-match |
| `app/auth/phone-sign-in.tsx` (изм.: код страны, ошибки, подсказка другого канала) | component (screen) | request-response | он сам | exact |
| `app/auth/confirm-phone.tsx` (изм.: тексты ошибок) | component (screen) | request-response | он сам | exact |
| `app/app/(settings)/changeGoal.tsx` (новый) | component (screen, wizard) | CRUD | `generateMacroTargets.tsx` (шаги) + `weeklyWeighIn.tsx` (превью/сохранение) | role-match (композиция двух) |
| `app/app/(tabs)/settings.tsx` (изм.: карточка цели) | component | request-response | он сам + `components/settings/SettingsItem.tsx` | exact |
| `lib/goal/needsGoalDetails.ts` (новый, чистая функция «доспросить») | utility | transform | `lib/nutrition/computeCalorieTarget.ts` (чистые функции в lib/) | role-match |

## Pattern Assignments

### `convex/notifications/sendPushNotification.ts` (изменение: receipts)

**Analog:** сам файл (строки 80-123) и `checkMealReminders.ts` строки 112-118.

**Сейчас ticket-цикл** (sendPushNotification.ts 97-115) обрабатывает только `status === "error"`. Нужно в этом же цикле собирать `ticket.id` для `status === "ok"` и после цикла планировать проверку:

```typescript
// sendPushNotification.ts 101-114 (существующее)
for (let i = 0; i < result.data.length; i++) {
  const ticket = result.data[i];
  const message = batch[i];
  if (ticket.status !== "error") continue;
  if (ticket.details?.error === "DeviceNotRegistered") {
    await ctx.runMutation(
      internal.notifications.sendPushNotification.deleteInvalidToken,
      { expoPushToken: message.expoPushToken }
    );
  } else {
    logError("sendPushNotification ticket error", ticket);
  }
}
```

**Планирование отложенного действия** (checkMealReminders.ts 112-118):
```typescript
await ctx.scheduler.runAfter(
  0,
  internal.notifications.sendPushNotification.default,
  { messages }
);
```
Для receipts: `runAfter(15 * 60 * 1000, internal.notifications.checkPushReceipts.default, { tickets: [{ id, expoPushToken }] })`. Нужно хранить пару id -> token, чтобы по `DeviceNotRegistered` вызвать `deleteInvalidToken`.

**Структура файла для копирования:** типы `ExpoPushTicket`/`ExpoPushResponse` (17-26), `chunk` (28-34), `postBatch` (36-62: fetch + `!response.ok` -> throw), `sendBatchWithRetry` (64-78), оборачивание handler в `try/catch` с `logError(..., error); return null;` (91-121). `deleteInvalidToken` (125-144) переиспользовать как есть через `internal.notifications.sendPushNotification.deleteInvalidToken`.

---

### `convex/notifications/checkPushReceipts.ts` (новый, internalAction)

**Analog:** `sendPushNotification.ts`.

**Imports** (строки 1-4):
```typescript
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import logError from "@/lib/utils/logError";
```

**Core pattern:** `fetch` POST на `https://exp.host/--/api/v2/push/getReceipts` с теми же заголовками, что в `postBatch` (Content-Type, Accept, Accept-Encoding), тело `{ ids }`, чанки по 300 (лимит getReceipts; `chunk` скопировать), проверка `!response.ok`. Для `details.error === "DeviceNotRegistered"` вызов `deleteInvalidToken`, иначе `logError("checkPushReceipts receipt error", receipt)`. Ответ-эскиз из RESEARCH «Code Examples -> Receipts». Handler: `try { ... return null } catch (error) { logError("checkPushReceipts error", error); return null; }`. Экспорт `export default checkPushReceipts;`. Не логировать токены целиком.

---

### `convex/notifications/sendTestPush.ts` (новый, диагностика, опционально)

**Analog:** `sendPushNotification.ts` (args-валидаторы `v.array(v.object(...))`). Только `internalAction` (не публичный; запуск `npx convex run --prod notifications/sendTestPush:default`). Вызывает `internal.notifications.sendPushNotification.default` с `messages` из `pushTokens` (запрос по `byUserId` как в `recordPushToken.ts` строки 28-32: `.withIndex("byUserId", (q) => q.eq("userId", userId)).first()`) — потребуется `internalQuery` или аргумент `expoPushToken`.

---

### `convex/TelegramOTP.ts` (изменение: проверка env, обработка ошибок, классификация)

**Analog:** сам файл (35 строк).

**Текущий core** (10-34):
```typescript
async sendVerificationRequest({ identifier: phone, token }) {
  const response = await fetch("https://gatewayapi.telegram.org/sendVerificationMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.TELEGRAM_GATEWAY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ phone_number: phone, code: token }),
  });
  const result = (await response.json()) as { ok: boolean; error?: string };
  if (!result.ok) {
    throw new Error(`Telegram Gateway error: ${result.error}`);
  }
},
```
Что менять: (1) проверка `process.env.TELEGRAM_GATEWAY_TOKEN` до fetch, при отсутствии `logError` + сервисная ошибка; (2) `response.json()` обернуть (может бросить) через `tryCatch` (`@/lib/utils/tryCatch`, возвращает `{ data, error }`, см. phone-sign-in.tsx 81); (3) сырую ошибку отправить в `logError`, наружу бросать `ConvexError({ code, channel: "telegram" })` (набросок RESEARCH «Классификация ошибки»). `ConvexError` в проекте ещё не используется (grep пуст): первый случай, поведение через `signIn` проверить спайком (Open Question 2); запасной вариант - публичный action `checkPhoneChannel`. Опционально `checkSendAbility` на `https://gatewayapi.telegram.org/checkSendAbility` с тем же заголовком Authorization.

---

### `convex/WhatsAppOTP.ts` (изменение)

**Analog:** `convex/TelegramOTP.ts` (структура Phone-провайдера) и сам файл.

**Imports** (1-3): `Phone` из `@convex-dev/auth/providers/Phone`, `encodeBase64` из `@oslojs/encoding`, `generateNumericToken` из `./utils/otp`.

**Текущая слабость** (12-38): нет проверки `accountSid/authToken/verifyServiceSid` (при undefined уйдёт `Basic undefined:undefined`); ошибка `throw new Error("Twilio Verify error: " + await response.text())`. Менять: проверка env -> `logError` + сервисный код; `!response.ok` -> разобрать JSON `{ code, message }` (через `tryCatch`), `logError` с сырыми данными, классифицировать по `code` (63015/63016/60200 -> «номер без WhatsApp», предложить Telegram), бросать `ConvexError`. Параметр `CustomCode: token` (31) оставить, пока не подтверждена недоступность (Open Question 4).

---

### `convex/utils/otpErrors.ts` (новый, чистая функция)

**Analog:** `convex/utils/otp.ts` (импорт `./utils/otp` в провайдерах: утилиты лежат в `convex/utils/`, default export). Сигнатура-пример: `export default function classifyOtpError(channel, raw): OtpErrorCode`. Коды вида `CHANNEL_UNREACHABLE | SERVICE_UNAVAILABLE | INVALID_PHONE | UNKNOWN`. Маппинг по префиксу/`code`, не по тексту (RESEARCH). Общий тип кода экспортировать для клиента (импорт на клиенте допустим как `@/convex/utils/otpErrors`, если файл без серверных зависимостей).

---

### `app/auth/phone-sign-in.tsx` (изменение)

**Analog:** сам файл.

**Что уже есть и переиспользовать:** `PhoneOtpProvider` (21), `tryCatch(signIn(provider, { phone }))` (81), `Toast.show({ text, variant: "error" })` (85), `z.regex(/^\+[1-9]\d{7,14}$/)` (68), `inputRef.current?.flashError()` (76), два `ScreenFooterButton` (125-137).

**Что менять:**
- Хардкод `+7`: `PHONE_PREFIX`, `MAX_DIGITS = 10`, `extractDigits` (отрезает ведущие 7/8), `phone = \`+7${digits}\`` (61). Заменить на селектор кода страны (KZ/RU +7, UZ +998, KG +996 и др.) с маской по стране; E.164-regex оставить.
- Ошибка (84-87): вместо константы `sendCodeErrorText` читать `error` (ConvexError `data.code`) и показывать русский текст с предложением другого канала: «Не удалось отправить код в Telegram - попробуйте WhatsApp» (D-10). Сырой текст не показывать.

---

### `app/auth/confirm-phone.tsx` (изменение, малое)

**Analog:** сам файл. `tryCatch(signIn(provider, { phone, code }))` (78), повторная отправка (124-128: `Toast.show({ text: resendErrorText, variant: "error" })`). Использовать ту же функцию текстов ошибок, что и в phone-sign-in (вынести в общий хелпер, например `lib/auth/otpErrorMessage.ts`).

---

### `app/app/(settings)/changeGoal.tsx` (новый экран)

**Analog A (шаги онбординга вне онбординга):** `app/app/(settings)/generateMacroTargets.tsx`.
**Analog B (превью + сохранение):** `app/app/(settings)/weeklyWeighIn.tsx`.

**Ключевое про контекст:** `OnboardingContextProvider` глобальный (`components/RootLayoutProvider.tsx` 65-73), `data` инициализируется профилем (`context/OnboardingContext.tsx` 46-61, эффект на `profile?.data`). Отдельный Provider оборачивать НЕ нужно. `generateMacroTargets` дополнительно делает `setData((prev) => ({ ...prev, ...profile.data }))` (241-245).

**Imports (из generateMacroTargets.tsx 1-35):**
```typescript
import { OnboardingSectionType } from "@/components/onboarding/Onboarding";
import OnboardingSectionLayout from "@/components/onboarding/OnboardingSectionLayout";
import OnboardingStepLayout from "@/components/onboarding/OnboardingStepLayout";
import OnboardingGoal from "@/components/onboarding/steps/goal/OnboardingGoal";
import OnboardingTargetWeight from "@/components/onboarding/steps/goal/OnboardingTargetWeight";
import OnboardingWeightChangeRate from "@/components/onboarding/steps/goal/OnboardingWeightChangeRate";
import { useOnboardingContext } from "@/context/OnboardingContext";
import { api } from "@/convex/_generated/api";
import { usePreventRemove } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
```

**Массив шагов со `skip` (generateMacroTargets 108-130):**
```typescript
{ screen: <OnboardingGoal key="goal" />, completed: ({ data }) => data.goal !== undefined,
  skip: ({ data }) => data.goalTrack !== "weightControl", showHeader: true, scrollView: true },
{ screen: <OnboardingTargetWeight key="target-weight" />, completed: () => true,
  skip: ({ data }) => data.goalTrack !== "weightControl" || data.goal === "maintain",
  showHeader: true, scrollView: false },
```
Для changeGoal: `skip` у шагов целевого веса и темпа = `!needsGoalDetails(data)` (чистая функция D-06, см. ниже). Навигация `handleNext`/`handleBack` с `do { nextStep += 1 } while (steps.at(nextStep)?.skip(context))` и анимации `enteringAnimation`/`exitingAnimation` (177-233), `usePreventRemove` (237-239): копировать как есть.

**Превью (analog B, weeklyWeighIn 41-58):** `useQuery(api.nutrition.computeNutritionTargets.default, profile?.data ? { sex, birthDate, height, weight, activityLevel, weeklyWorkouts, training, goal, liftingExperience, cardioExperience, weightChangeRate } : "skip")` - передавать ВСЕ поля, goal и weightChangeRate брать из `data` контекста (новые значения). «Было» = `profile.targets`.

**Сохранение (weeklyWeighIn 62-96) - обязательный спред `data`:**
```typescript
const { error } = await tryCatch(
  updateProfile({
    profile: {
      data: { ...profile.data, goal, targetWeight, weightChangeRate },
      targets: computedTargets,
    },
  })
);
if (error) {
  Toast.show({ text: "Не удалось сохранить ...", variant: "error" });
  setIsSaving(false);
  return;
}
Toast.show({ text: "...", variant: "success" });
router.back();
```
Не использовать `completeOnboarding` (как в generateMacroTargets 172) - он для другого сценария; `updateProfile` (convex/profiles/updateProfile.ts) патчит `data` целиком, поэтому спред обязателен. Для maintain: `targetWeight = weight`, `weightChangeRate = 0` (так делает `OnboardingGoal.tsx` 18-24).

**Подводный камень:** `OnboardingTargetWeight.tsx` (12-22) строит пикер с `min/max` от `data.weight`; если сохранённый `targetWeight` не с той стороны, его нужно сбросить до `weight` при выборе lose/gain до показа шага.

**Заголовок/кнопки экрана-превью:** `ScreenMain`, `ScreenHeader`, `ScreenHeaderBackButton`, `ScreenHeaderTitle`, `ScreenMainScrollView`, `Button variant="primary"`, `Text`, `getColor("mutedForeground")` (weeklyWeighIn 1-23, 104-175).

---

### `lib/goal/needsGoalDetails.ts` (новый, чистая функция)

**Analog:** чистые функции в `lib/nutrition/computeCalorieTarget.ts`, `lib/units/kgToLbs.ts` (default export функции). Логика из RESEARCH: true если `goal in (lose, gain)` и (`weightChangeRate <= 0` или lose требует `targetWeight < weight`, gain `targetWeight > weight`). Принимает `Pick<OnboardingData, "goal"|"weight"|"targetWeight"|"weightChangeRate">`. Плюс при необходимости форматтер строки карточки («Цель: похудеть до 70 кг, 0,5 кг/нед»; maintain: «Цель: поддерживать вес»; imperial через `kgToLbs`).

---

### `app/app/(tabs)/settings.tsx` (изменение: карточка цели)

**Analog:** сам файл, строки 122-154 + `components/settings/SettingsItem.tsx`.

```tsx
<SettingsGroup>
  <Link href="/app/(settings)/adjustMacroTargets" asChild>
    <SettingsItem text="Настроить БЖУ" Icon={PieChartIcon} />
  </Link>
  <Link href="/app/(settings)/weeklyWeighIn" asChild>
    <SettingsItem text="Обновить вес" Icon={ScaleIcon} />
  </Link>
```
Добавить `<Link href="/app/(settings)/changeGoal" asChild><SettingsItem text={goalSummary} Icon={TargetIcon} /></Link>` в эту же группу (иконка из `lucide-react-native`, как остальные). `SettingsItem` принимает только `text`, `Icon`, `onPress`, `isLast`, `destructive` (SettingsItem.tsx 8-13): если карточка нужна с двумя строками, расширить компонент или собрать текст в одну строку. Профиль в settings.tsx читать через `useQuery(api.profiles.getProfile.default)`.

---

## Shared Patterns

### Обработка ошибок на сервере (Convex)
**Source:** `convex/notifications/sendPushNotification.ts` 91-121; `convex/profiles/updateProfile.ts` 11-31
**Apply to:** все новые/изменяемые Convex-функции
```typescript
try { ... } catch (error) { logError("<fn> error", error); throw error; /* или return null в action */ }
```
`logError` из `@/lib/utils/logError` (Sentry). Сырые ошибки провайдеров только туда.

### Асинхронные вызовы на клиенте
**Source:** `app/app/(settings)/weeklyWeighIn.tsx` 74-96; `app/auth/phone-sign-in.tsx` 81-87
**Apply to:** changeGoal, phone-sign-in, confirm-phone
```typescript
const { error } = await tryCatch(promise);   // @/lib/utils/tryCatch
if (error) { Toast.show({ text: "...", variant: "error" }); return; }
```
Тексты на русском, `Toast` из `@/components/ui/Toast`.

### Авторизация mutations
**Source:** `convex/profiles/updateProfile.ts` 12-14
`const userId = await getAuthUserId(ctx); if (userId === null) throw new Error("Unauthorized");` - для публичных функций; диагностические push-функции только `internal*`.

### Безопасный patch `profiles.data`
**Source:** `weeklyWeighIn.tsx` 77: `data: { ...profile.data, <changes> }` (update заменяет `data` целиком).

### Convex path-алиасы
Серверные файлы импортируют `@/lib/...` (см. `sendPushNotification.ts` 4) и `../_generated/...`; функции экспортируются `export default` для вызова как `api.<dir>.<file>.default` / `internal.<dir>.<file>.default`.

### Крон/планирование
**Source:** `convex/crons.ts` (`crons.interval(name, { minutes: 30 }, internal....default)`) и `ctx.scheduler.runAfter` (checkMealReminders 112-118). Receipts планировать через `runAfter`, новый cron не нужен.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Выбор кода страны в `phone-sign-in.tsx` | component | input | Селекторов кода страны в проекте нет; взять UI-компоненты `components/ui/Select` / `SegmentedControl` или построить новый (проверить на этапе плана) |
| Передача типизированной ошибки провайдера клиенту (`ConvexError` через Convex Auth signIn) | provider | request-response | `ConvexError` в проекте не используется; требует спайка (RESEARCH Open Question 2), запасной вариант - публичный action `checkPhoneChannel` по паттерну `updateProfile` (auth + try/catch) |
| Тестовый фреймворк | test | - | В проекте нет тестов; валидация: `npx tsc --noEmit` + `npx eslint` (RESEARCH Validation Architecture) |

Не покрываются кодом (ручные чекпоинты пользователя): EAS credentials/APNs key, пополнение Telegram Gateway, Twilio Sender/Verify/env на Convex prod и dev, `npx convex deploy`.

## Metadata

**Analog search scope:** `convex/` (notifications, profiles, utils, корневые OTP), `app/app/(settings)`, `app/app/(tabs)/settings.tsx`, `app/auth`, `components/onboarding/steps/goal`, `components/settings`, `context/OnboardingContext.tsx`
**Files scanned:** ~20
**Pattern extraction date:** 2026-10-09

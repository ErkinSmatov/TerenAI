# Phase 72: Push в TestFlight, цель, Telegram и WhatsApp OTP - Research

**Researched:** 2026-10-09
**Domain:** Expo push (APNs/EAS credentials), Convex Auth Phone-провайдеры (Telegram Gateway, Twilio Verify WhatsApp), редактирование профиля/норм в Expo + Convex
**Confidence:** MEDIUM (код прочитан полностью; внешние консоли недоступны, причины push/OTP подтверждаются только ручной диагностикой)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Одна фаза 72, несколько планов волнами.
- D-02: Сначала починки (push, Telegram, WhatsApp), потом цель. При нехватке времени первой отбрасывается цель.
- D-03: Подписка вынесена в Phase 73.
- D-04: Цель показывается карточкой в Настройках (`app/app/(tabs)/settings.tsx`) рядом со ссылками `adjustMacroTargets` и `weeklyWeighIn`; по тапу экран смены цели. На Главную ничего не добавляем.
- D-05: Меняется только `profiles.data.goal` (lose/maintain/gain). Трек `goalTrack` не меняется.
- D-06: Для lose/gain при нехватке данных доспрашиваем целевой вес и темп на `OnboardingTargetWeight`, `OnboardingWeightChangeRate`, предзаполненных. Для maintain сразу превью.
- D-07: Пересчёт норм с превью «было → станет» (ккал, Б/Ж/У), сохранение после подтверждения. Ручные правки норм перезаписываются.
- D-08: Достижение целевого веса не обрабатываем.
- D-09: На `phone-sign-in.tsx` пользователь сам выбирает канал; оба должны работать для произвольных номеров.
- D-10: При ошибке отправки понятная русская ошибка с предложением другого канала; сырые ошибки в Sentry через `logError`.
- D-11: Провайдеры прежние (Telegram Gateway, Twilio Verify whatsapp). Действия в консолях выполняет пользователь (ручные чекпоинты).
- D-12: География: СНГ целиком (KZ, RU, UZ, KG и т.д.).
- D-13: Push: диагностика и починка на усмотрение; критерий: push приходит на TestFlight-сборку (`com.codetau.terenai`, prod Convex).

### Claude's Discretion
Вся диагностика push; проверка гипотезы про баланс Telegram Gateway (`checkSendAbility`); диагностика WhatsApp/Twilio (включая `CustomCode`); внешний вид карточки и экрана цели.

### Deferred Ideas (OUT OF SCOPE)
Подписка (Phase 73); автопредложение «держать» при достижении веса; смена трека; блок цели на Главной; схема «основной канал + не пришёл код».
</user_constraints>

<phase_requirements>
## Phase Requirements

Явных ID нет (TBD). Связанные: AUTH-06 (Telegram), AUTH-07 (WhatsApp), PUSH-01/02, MEALPUSH-01/02, WEIGH-01/02.

| Область | Что нужно | Опора в исследовании |
|---|---|---|
| Push | Доставка в TestFlight | Раздел «Push», диагностический план |
| Telegram | Любые номера СНГ + понятные ошибки | Раздел «Telegram» |
| WhatsApp | Рабочий Twilio Verify | Раздел «WhatsApp» |
| Цель | Просмотр/смена с превью | Раздел «Цель» |
</phase_requirements>

## Summary

**Push.** Код клиента и сервера в целом корректен: `projectId` берётся из `extra.eas.projectId` (задан в `app.config.ts`, одинаков для dev и prod), токен пишется в таблицу `pushTokens` того Convex-деплоймента, на который смотрит сборка (`EXPO_PUBLIC_CONVEX_URL` из EAS environment `production`). Главная слепая зона: `sendPushNotification.ts` проверяет только **tickets** (ответ Expo на send) и никогда не запрашивает **receipts** (`getReceipts`). Ошибки APNs (`InvalidCredentials`, `DeviceNotRegistered`, `TopicDisallowed`/`BadDeviceToken`) приходят только в receipts, поэтому сейчас они невидимы. Наиболее вероятная причина (гипотеза, не подтверждена): у prod bundle id `com.codetau.terenai` в EAS нет валидного APNs-ключа или provisioning profile без Push capability (в репо лежит ручной `credentials.json` с `dist-cert.p12`/`profile.mobileprovision`, при этом в `eas.json` `credentialsSource` не задан, т.е. по умолчанию remote). Все `aps-environment`-вопросы в EAS-сборке решаются подписью: локальный `ios/` в .gitignore (`/ios/`), локальный entitlement `development` не определяет prod-сборку. Второе по вероятности: токены prod-пользователей лежат в prod-деплойменте, а крон/ключи/деплой функций не на prod (`npx convex deploy` не выполнялся после фазы 69).

**OTP.** Telegram Gateway: официально `sendVerificationMessage` бесплатен только на **собственный** номер владельца токена; на остальные списывается $0.01 за доставленный код, нужен пополненный баланс (подтверждено документацией). Это согласуется с симптомом «работает только для части номеров». Кроме того, в UI `phone-sign-in.tsx` жёстко зашит префикс `+7` и 10 цифр, так что номера UZ/KG/и др. вообще не вводятся. WhatsApp: Twilio с 1 марта 2024 требует собственного WhatsApp Sender (номер + WABA) для Verify; `CustomCode` поддерживается API (4-10 символов), но на аккаунте может быть выключен (проверка ручная). Клиентские ошибки сейчас одна общая строка; серверные `throw new Error(...)` в Convex Auth до клиента в читаемом виде не доходят (в prod маскируются), поэтому для D-10 нужен механизм различения причин.

**Цель.** Данные есть в `profiles.data` (`goal`, `targetWeight`, `weightChangeRate`); `updateProfile` делает `ctx.db.patch(...)` с **заменой всего `data`**, значит нужно всегда передавать `{...profile.data, ...changes}` (так делает `weeklyWeighIn.tsx`). Пересчёт идёт через query `api.nutrition.computeNutritionTargets.default` (уже принимает `goal` и `weightChangeRate`; `targetWeight` в него не входит).

**Primary recommendation:** Волна 1: (a) добавить в `sendPushNotification` проверку receipts + логирование и выполнить ручную диагностику EAS credentials/prod deployment; (b) пополнить Telegram Gateway, снять хардкод `+7`, ввести классификацию ошибок провайдеров; (c) довести Twilio (Sender, Verify Service, env). Волна 2: экран смены цели по паттерну `weeklyWeighIn` + шаги онбординга.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Регистрация push-токена | Client (NotificationsProvider) | Convex mutation | Токен получает только устройство |
| Отправка push, receipts | Convex (internalAction) | Expo Push API | Секреты/крон на сервере |
| APNs-ключ | EAS credentials (внешняя консоль) | Apple Developer | Не в коде |
| Отправка OTP | Convex (Phone provider) | Telegram/Twilio | Секреты на сервере |
| Классификация ошибок OTP | Convex (маппинг кода) | Client (текст) | Клиент не должен видеть сырые ошибки |
| Пересчёт норм | Convex query (computeNutritionTargets) | Client (превью) | Единый источник формул |
| Карточка и экран цели | Client (Expo Router) | Convex updateProfile | UI + точечный patch |

## Standard Stack

Новых зависимостей не требуется. Используются: `expo-notifications ~0.32.17`, `expo-constants ~18.0.10`, `expo 54.0.37` (из package.json), `@convex-dev/auth` Phone, `@oslojs/encoding`, `convex-helpers`. Все уже в проекте [VERIFIED: package.json]. Установка пакетов не планируется, Package Legitimacy Audit не требуется.

### Don't Hand-Roll
| Проблема | Не писать | Использовать | Почему |
|---|---|---|---|
| Проверка доставки push | свои повторные отправки | Expo `getReceipts` | Единственный источник ошибок APNs |
| Пересчёт норм | дубль формул на клиенте | `computeNutritionTargets` | Уже учитывает goal/rate |
| Шаги цели | новые пикеры | `OnboardingGoal`, `OnboardingTargetWeight`, `OnboardingWeightChangeRate` | Готовы (зависят от `useOnboardingContext`) |
| OTP-провайдер | свой SMS/WA | Telegram Gateway, Twilio Verify (D-11) | Заблокировано решением |

## Architecture Patterns

### Flow (push)
```
cron(30 мин) -> checkMealReminders/checkWeighInReminders (mutation)
   -> scheduler -> sendPushNotification (action) -> Expo /push/send -> tickets
   -> [НОВОЕ] scheduler.runAfter(~15 мин) -> checkPushReceipts (action) -> Expo /getReceipts
   -> receipts error: DeviceNotRegistered => deleteInvalidToken; прочее => logError (Sentry)
```

### Flow (OTP)
```
phone-sign-in (выбор канала) -> signIn(provider,{phone}) -> Convex Auth -> sendVerificationRequest
   -> provider API -> ok | ошибка -> [НОВОЕ] классификация -> клиент показывает русский текст + другой канал
confirm-phone -> signIn(provider,{phone, code})
```

### Flow (цель)
```
settings карточка -> /app/(settings)/changeGoal
  шаг 1: OnboardingGoal (текущая выбрана)
  [lose/gain и (rate===0 или targetWeight не с той стороны weight)] шаги: TargetWeight, WeightChangeRate
  превью: computeNutritionTargets(goal, rate) vs profile.targets -> «было -> станет»
  подтверждение -> updateProfile({profile:{data:{...profile.data, goal, targetWeight, weightChangeRate}, targets}})
```

### Pattern: безопасный patch `data`
`updateProfile` принимает `partial(profilesFields)`; `data` — один v.object, patch заменяет его целиком. Всегда спред `...profile.data` [VERIFIED: convex/profiles/updateProfile.ts, weeklyWeighIn.tsx].

Для maintain онбординг-компонент `OnboardingGoal` ставит `targetWeight = weight`, `weightChangeRate = 0` (так же делать при сохранении) [VERIFIED: OnboardingGoal.tsx].

### Anti-Patterns
- Считать push «работающим» по статусу ticket `ok`: это только приём Expo.
- Показывать пользователю `error.message` провайдера.
- Модифицировать `data` без спреда: затрёт sex/birthDate/и т.д.
- `OnboardingTargetWeight` ограничивает пикер от текущего `weight` (maintain: min=max=weight), поэтому для lose/gain «не с той стороны» значение надо сбрасывать до `weight`, иначе пикер получит initialWeight вне диапазона.

## Push: диагностический план (приоритет сверху вниз)

1. **[Код, автоматически]** Добавить в `sendPushNotification.ts` сбор `ticket.id` и отложенную проверку receipts (`POST https://exp.host/--/api/v2/push/getReceipts {ids}`, рекомендуется через ~15 мин, receipts живут 24 ч) [CITED: docs.expo.dev/push-notifications/sending-notifications]. Ошибки `DeviceNotRegistered` -> `deleteInvalidToken`; `InvalidCredentials`/прочее -> `logError` (Sentry). Параллельно логировать `ticket.details.error` уже сейчас (логируется, кроме DeviceNotRegistered).
2. **[Код, диагностика]** Временная internalAction/кнопка для отправки тестового push на токен пользователя (из Convex dashboard: `npx convex run --prod`), чтобы не ждать крон-окон (напоминания привязаны к локальному времени 9:00 и т.п., `reminderSchedule.ts`).
3. **[Вручную пользователь]** `eas credentials -p ios` -> profile `production` -> проверить, что для `com.codetau.terenai` есть Push Notifications key (APNs `.p8`), иначе создать; проверить, что Distribution provisioning profile включает Push capability (Apple Developer -> Identifiers -> App ID -> Push Notifications включено, затем пересоздать profile). Источник: [CITED: docs.expo.dev/push-notifications/push-notifications-setup]. Если в `eas.json` не указан `credentialsSource`, EAS использует remote credentials; локальный `credentials.json` в репо тогда игнорируется [ASSUMED: поведение по умолчанию EAS `credentialsSource: remote`]. Решить: использовать remote и убрать расхождение, либо явно зафиксировать выбор.
4. **[Вручную]** Убедиться, что prod-деплоймент Convex содержит текущие функции и крон (`npx convex deploy`, в dashboard Prod -> Crons: «check meal reminders», «check weigh-in reminders»), а таблица `pushTokens` на prod содержит токен тестера. Если токена нет: `EXPO_PUBLIC_CONVEX_URL` в EAS environment `production` не prod, или разрешение на уведомления не выдано, или ошибка регистрации (смотреть Sentry `NotificationsProvider registration error`).
5. **[Вручную]** Проверка на устройстве: iOS Настройки -> TerenAI -> Уведомления включены; токен формата `ExponentPushToken[...]`; отправить тест через https://expo.dev/notifications (подсказка: показывает ticket/receipt).
6. **aps-environment:** локальный `ios/TerenAI/*.entitlements` содержит `development` и там же `applesignin` при `usesAppleSignIn: false` в config: `ios/` в .gitignore и в EAS пересоздаётся prebuild. Для App Store/TestFlight Xcode подставляет `production` из provisioning profile; править entitlements вручную не нужно [ASSUMED: стандартное поведение подписи]. Вывод: гипотеза про entitlement маловероятна, пока profile содержит Push.
7. Исключено кодом: `projectId` задан и совпадает в обоих вариантах; `getExpoPushTokenAsync({projectId})` вызывается корректно.
8. Дополнительный риск: `recordPushToken` хранит **один токен на пользователя** (`.first()` по userId), поэтому тестер, заходивший с dev- и TestFlight-сборки под одним аккаунтом на ОДНОМ деплойменте, перезаписывает токены друг друга. На prod это не проблема, если dev-сборка смотрит на dev-деплоймент.

## Telegram Gateway

- Бесплатно только на собственный номер владельца токена; остальное $0.01 за доставленный код, предоплаченные кредиты; недоставленные возвращаются автоматически [CITED: core.telegram.org/gateway, core.telegram.org/gateway/api]. Гипотеза CONTEXT подтверждается документацией; фактический баланс проверяется ручным пополнением и тестом (пользователь).
- API: `code` 4-8 цифр (проект генерирует 4, ок), `ttl` 30-3600 с, `checkSendAbility` (`phone_number`) возвращает RequestStatus, если доставка возможна (и не списывает) [CITED: core.telegram.org/gateway/api]. Использовать `checkSendAbility` перед отправкой НЕ обязательно; но полезно для вывода «на этом номере нет Telegram». Тогда сообщение предлагает WhatsApp.
- Ошибки: документация перечисляет только пример `ACCESS_TOKEN_INVALID`; полного списка нет. Известные строки (`PHONE_NUMBER_NOT_FOUND`, `BALANCE_NOT_ENOUGH`, `PHONE_NUMBER_INVALID`, `FLOOD_WAIT_*`) [ASSUMED: из практики, не подтверждены документацией]. Маппинг делать по префиксам, остальное -> общая ошибка + logError.
- Страны: ограничений в документации не найдено [CITED: core.telegram.org/gateway/api — отрицательный результат; полный список стран на странице quick-start не получен]. Трактовать как LOW.
- Тело ответа: `ok:false` + `error`; HTTP-ошибки/невалидный JSON сейчас не обрабатываются (`response.json()` может бросить).
- **Хардкод `+7`:** `phone-sign-in.tsx` принимает только `+7` и 10 цифр (маска `PHONE_PREFIX`, `extractDigits`), а `z.regex(/^\+[1-9]\d{7,14}$/)` допускает E.164. D-12 (СНГ целиком) требует либо выбора страны/кода, либо ввода полного E.164. Рекомендация: селектор кода страны (KZ/RU +7, UZ +998, KG +996, TJ +992, AM +374, AZ +994, GE +995, BY +375, MD +373, TM +993) и маска по стране [ASSUMED: коды стран из общих знаний].

## WhatsApp (Twilio Verify)

- С 1 марта 2024 для Verify WhatsApp нужен свой Sender (номер + WhatsApp Business Account); общий Twilio-sender недоступен. Шаблоны authentication создаёт Twilio автоматически; кастомные шаблоны не поддерживаются [CITED: twilio.com/docs/verify/whatsapp]. Недоступно в Китае [CITED там же].
- `CustomCode` в API Verifications принимает 4-10 символов; в Verify Service есть флаг `CustomCodeEnabled` [CITED: twilio.com/docs/verify/api/service, verification]. Текущий код отправляет `CustomCode`; если флаг не включён на аккаунте, Twilio вернёт ошибку. Включение у Twilio возможно только по запросу в поддержку [ASSUMED]. Fallback: убрать `CustomCode` и проверять код через Twilio `VerificationCheck` (потребует смены логики provider: `generateVerificationToken`/`verifyCode` в Convex Auth Phone поддерживает `authorize`; отдельная работа). Рекомендация: сначала проверить включённость, не переписывать заранее.
- Trial-аккаунт: отправка только на верифицированные номера [ASSUMED]; нужен апгрейд.
- Ограничения СНГ: условия Meta/Twilio для России и Беларуси (санкционные и локальные ограничения WhatsApp-бизнеса) не удалось подтвердить документацией. Помечено как риск; проверять тестовой отправкой на RU/KZ/UZ номера [LOW].
- Коды ошибок Twilio Verify (60200 invalid parameter, 60203 max attempts, 60205 SMS to landline, 60410 blocked prefix, 63015/63016 WhatsApp-доставка и др.) [ASSUMED]. Маппить по `code` из JSON-тела ответа (`{code, message}`), а не по тексту.
- Провайдер сейчас кидает `Error("Twilio Verify error: <raw text>")`; нужно парсить JSON, различать «номер без WhatsApp / недоступен» (предложить Telegram) и «сервисные» (нет баланса/ключей: общая ошибка + Sentry).
- Env на Convex (prod и dev отдельно): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `TELEGRAM_GATEWAY_TOKEN`. Нет проверки на их отсутствие: при `undefined` отправляется `Basic undefined:undefined`. Добавить явную проверку и `logError`.

### Передача ошибки клиенту (D-10)
Convex Auth оборачивает ошибку `signIn`; сообщения обычных `Error` из actions на prod клиенту маскируются [ASSUMED: поведение Convex prod]. Варианты для планировщика (проверить спайком в Wave 1): (1) бросать `ConvexError` с `data: { code: "TELEGRAM_UNREACHABLE" }` и читать `error.data` на клиенте; (2) если Convex Auth его не пропускает, отдельный публичный action `checkPhoneChannel(phone, channel)` вызывается ДО `signIn` и возвращает код причины. Рекомендуемая последовательность: попробовать (1), иначе (2).

## Цель: детали

- `profiles.data`: `goal`, `targetWeight`, `weightChangeRate` (number, кг/нед), `goalTrack` и др. [VERIFIED: convex/tables/profiles.ts]. `targets` — отдельное поле верхнего уровня.
- `computeNutritionTargets` принимает: sex, birthDate, height, weight, activityLevel, weeklyWorkouts, training, goal, liftingExperience, cardioExperience, weightChangeRate. Нужны **все** (как в `weeklyWeighIn.tsx`) [VERIFIED]. `targetWeight` в формулы не входит.
- Для D-06 условие «доспросить»: `goal` in (lose, gain) и (`weightChangeRate <= 0` или `targetWeight` по неверную сторону от `weight`: lose требует `targetWeight < weight`, gain `targetWeight > weight`). Для maintain: `targetWeight = weight`, `weightChangeRate = 0`.
- Компоненты онбординга читают/пишут `useOnboardingContext()`: для переиспользования на экране смены цели нужно обернуть экран в `OnboardingProvider`, предзаполненный профилем (посмотреть `generateMacroTargets.tsx` — паттерн «шаги онбординга вне онбординга»; он без шагов цели). Проверить сигнатуру провайдера на этапе планирования.
- Превью «было»: `profile.targets` (ккал и макро); «станет»: результат query. Тип `Doc<"profiles">["targets"]`.
- Ручные правки норм перезаписываются (D-07), флага нет.
- Карточка: `settings.tsx` строки ~123-126 содержат `Link` на `adjustMacroTargets` и `weeklyWeighIn`; добавить карточку рядом, новый маршрут `app/app/(settings)/changeGoal.tsx`. Текст по примеру: «Цель: похудеть до 70 кг, 0,5 кг/нед» (maintain: «Цель: поддерживать вес»). Единицы: учитывать `measurementSystem` (kgToLbs).
- Наблюдатели (observers) читают профиль пациента: проверить, что поля цели не ломают их экраны (не меняем схему, риска нет).

## Common Pitfalls

1. **Ticket ok != доставлено.** Проверять receipts. Warning: в Sentry тишина, пуша нет.
2. **Одновременно разные деплойменты.** Токены dev-сборки пишутся в dev, TestFlight в prod; тест через prod dashboard.
3. **Крон-окна.** Напоминания срабатывают в локальные точки времени; без тест-action диагностика растягивается на сутки.
4. **Заменяется весь `data`.** Спред обязателен.
5. **Pickers с диапазоном.** `OnboardingTargetWeight` при `goal=lose` min=30,max=weight; неверное initial ломает пикер.
6. **Telegram успех на свой номер маскирует проблему.** Тест только на номере владельца ничего не доказывает; тестировать на чужом номере после пополнения.
7. **Ошибка провайдера теряется** (маскируется Convex), UX-текст не появится без ConvexError/pre-check.
8. **Хардкод `+7`** блокирует UZ/KG даже при рабочем провайдере.
9. **Twilio trial** шлёт только на верифицированные номера.

## Code Examples

### Receipts (набросок)
```typescript
// Source: docs.expo.dev/push-notifications/sending-notifications (receipts)
const res = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ ids: ticketIds }),
});
const { data } = (await res.json()) as {
  data: Record<string, { status: "ok" | "error"; details?: { error?: string } }>;
};
// data[id].details?.error === "DeviceNotRegistered" -> deleteInvalidToken; иначе logError
```

### Классификация ошибки (набросок)
```typescript
import { ConvexError } from "convex/values";
throw new ConvexError({ code: "CHANNEL_UNREACHABLE", channel: "telegram" });
```

## State of the Art
| Было | Стало | Влияние |
|---|---|---|
| Общий WhatsApp sender Twilio | Свой Sender обязателен с 2024-03-01 | Нужна регистрация WABA |
| Telegram Gateway бесплатный тест | Платно ($0.01) кроме своего номера | Нужен баланс |

## Assumptions Log
| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | EAS по умолчанию использует remote credentials, локальный credentials.json игнорируется | Push | Диагностика credentials пойдёт не туда |
| A2 | `aps-environment` корректно переписывается подписью на production | Push | Нужна правка entitlements |
| A3 | Строки ошибок Telegram (PHONE_NUMBER_NOT_FOUND, BALANCE_NOT_ENOUGH...) | Telegram | Маппинг неточный |
| A4 | CustomCode включается через поддержку Twilio | WhatsApp | Другая процедура |
| A5 | Trial Twilio шлёт только на верифицированные номера | WhatsApp | Иной симптом |
| A6 | Коды ошибок Twilio (60200, 60203, 60205, 60410, 63015) | WhatsApp | Неверный маппинг |
| A7 | Convex prod маскирует message обычного Error, ConvexError.data доходит до клиента из signIn | OTP | Нужен pre-check action |
| A8 | Коды стран СНГ | Telegram | Опечатки в списке |
| A9 | Доставка WhatsApp в РФ/БЛР ограничений не имеет | WhatsApp | Канал не работает для части пользователей |

## Open Questions
1. Что именно в EAS credentials для prod bundle (ключ, profile)? Ответ даст `eas credentials` (ручной шаг).
2. Проходит ли `ConvexError` через Convex Auth `signIn`? Решает спайк.
3. Доставляется ли WhatsApp на RU/KZ/UZ номера с выбранным Sender? Тест после настройки.
4. Нужно ли переписывать на `VerificationCheck`, если CustomCode недоступен?
5. Страны Telegram Gateway: полный список не получен.

## Environment Availability
| Зависимость | Нужна для | Доступно | Примечание |
|---|---|---|---|
| EAS CLI / аккаунт | credentials | не проверялось (интерактивно у пользователя) | ручной шаг |
| Convex CLI prod access | деплой, run | не проверялось | у пользователя |
| Telegram Gateway консоль | баланс | внешняя | ручной чекпоинт |
| Twilio консоль | Sender, Verify | внешняя | ручной чекпоинт |
| Физическое устройство + TestFlight | проверка push | у пользователя | критерий D-13 |

Блокирующие без fallback: оплата Telegram Gateway, WhatsApp Sender (регистрация WABA может занять дни), APNs ключ.

## Validation Architecture

### Test Framework
| Свойство | Значение |
|---|---|
| Framework | Тестового фреймворка в проекте нет (в package.json нет test-скрипта, `*.test.ts` не найдено) |
| Config | отсутствует |
| Quick run | `npx tsc --noEmit` и `npx eslint <изменённые файлы>` |
| Full suite | `npx tsc --noEmit && npx eslint .` |

### Phase Requirements -> Test Map
| Поведение | Тип | Команда | Есть? |
|---|---|---|---|
| Классификатор ошибок OTP (чистая функция) | unit (опционально) | tsx-скрипт или Wave 0 vitest | Wave 0 |
| Определение «нужно доспросить» для цели (чистая функция в lib/) | unit | то же | Wave 0 |
| Receipts парсинг | typecheck + ручной тест `convex run` | `npx convex run --prod ...` | вручную |
| Push на TestFlight | manual-only (устройство) | — | вручную |
| OTP на чужой номер TG/WA | manual-only (внешние сервисы) | — | вручную |
| Смена цели E2E | manual (simulator/device) | — | вручную |

### Sampling Rate
- Per task: `npx tsc --noEmit` + eslint по файлам
- Per wave: полный tsc + eslint
- Phase gate: ручные проверки на устройстве (push, OTP), tsc/eslint зелёные

### Wave 0 Gaps
- [ ] Решить: вводить ли vitest ради 2 чистых функций (рекомендация: вынести логику в чистые функции в `lib/` и проверять простым скриптом/тестом, без тяжёлой инфраструктуры; решение за планировщиком)

## Security Domain

| ASVS | Применимо | Контроль |
|---|---|---|
| V2 Authentication | да | Convex Auth Phone, maxAge 15 мин, криптослучайный код (`@oslojs/crypto`) |
| V3 Session | косвенно | Convex Auth |
| V4 Access Control | да | `getAuthUserId` в `updateProfile`/`recordPushToken`; тестовый push-action только `internal*` |
| V5 Input Validation | да | regex E.164 на клиенте, валидаторы Convex, проверка формата push-токена |
| V6 Cryptography | да | не самописное |

| Угроза | STRIDE | Митигация |
|---|---|---|
| Утечка сырой ошибки провайдера (токены/PII) | Information disclosure | `logError` без показа пользователю; не логировать код OTP и полный токен |
| Брутфорс/спам OTP (стоимость $0.01 за код у Telegram, Twilio платно) | DoS/денежный | rate limit (`convex/rateLimit.ts` уже есть; проверить применение к signIn отправке) [ASSUMED: не проверено, применяется ли] |
| Тестовый push-эндпойнт | Elevation | только internalAction, не публичный |
| Секреты в репо | Information disclosure | `credentials.json`, `.p12`, `.mobileprovision` в .gitignore (проверено); `.env.production.local` содержит `SENTRY_AUTH_TOKEN` (локальный, в .gitignore по маске `.env*.local`) |

## Sources
### Primary (HIGH)
- Код репозитория: app.config.ts, eas.json, NotificationsProvider.tsx, sendPushNotification.ts, checkMealReminders.ts, recordPushToken.ts, crons.ts, TelegramOTP.ts, WhatsAppOTP.ts, phone-sign-in.tsx, updateProfile.ts, weeklyWeighIn.tsx, computeNutritionTargets.ts, OnboardingGoal.tsx, OnboardingTargetWeight.tsx
- https://core.telegram.org/gateway/api, https://core.telegram.org/gateway
- https://docs.expo.dev/push-notifications/sending-notifications/ (receipts)
- https://www.twilio.com/docs/verify/whatsapp

### Secondary (MEDIUM)
- Twilio Verify API docs (CustomCode 4-10 символов, customCodeEnabled) через поиск: https://www.twilio.com/docs/verify/api/verification, https://www.twilio.com/docs/verify/api/service

### Tertiary (LOW)
- Остальное из Assumptions Log

## Metadata
**Confidence:** Push: MEDIUM (причина не определима без консолей); Telegram: MEDIUM-HIGH (баланс); WhatsApp: LOW-MEDIUM; Цель: HIGH.
**Research date:** 2026-10-09
**Valid until:** 2026-11-08

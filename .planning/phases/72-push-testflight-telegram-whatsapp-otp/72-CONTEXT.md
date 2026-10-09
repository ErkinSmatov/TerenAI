# Phase 72: Push в TestFlight, просмотр и смена цели, Telegram и WhatsApp OTP - Context

**Gathered:** 2026-10-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Четыре задачи перед запуском, одна фаза с несколькими планами волнами:

1. **Push в TestFlight.** Push-уведомления (Phase 69: взвешивание, приёмы пищи) приходят в локальной сборке, но не приходят в сборке из TestFlight. Нужно найти причину и починить.
2. **Просмотр и смена цели.** Пользователь видит свою текущую цель (похудеть / держать / набрать) и может её сменить. Нормы пересчитываются.
3. **Telegram OTP для любых номеров.** Вход по коду через Telegram сейчас работает только для части номеров (по-видимому, только для номера владельца аккаунта Gateway). Нужно, чтобы работали любые номера.
4. **WhatsApp OTP.** Довести вход через WhatsApp (Twilio Verify, AUTH-07) до рабочего состояния.

**Вне фазы:** подписка и оплата вынесены в Phase 73 (решение на этом обсуждении).

</domain>

<decisions>
## Implementation Decisions

### Организация фазы
- **D-01:** Одна фаза 72, несколько планов волнами. Новые фазы под каждую задачу не заводим.
- **D-02:** Приоритет и порядок волн: сначала починки того, что сломано у тестеров (push в TestFlight, Telegram OTP, WhatsApp OTP), потом новая функция «просмотр и смена цели». Если что-то не успеваем, первой отбрасывается цель, а не починки.
- **D-03:** Подписка (бывший пункт (1) цели фазы) из фазы 72 **убрана** и перенесена в Phase 73 вместе с уже принятыми решениями: вебхук RevenueCat → Convex и включение флага `isMonetizationEnabled` только после sandbox-теста. Что платное, тарифы, цены и триал не решены: пользователь сначала обсудит это с менеджерами проекта.

### Просмотр и смена цели
- **D-04:** Текущая цель показывается **карточкой в Настройках** (`app/app/(tabs)/settings.tsx`) рядом с существующими ссылками «Настроить цели» (`adjustMacroTargets`) и «Взвешивание» (`weeklyWeighIn`). Пример содержания: «Цель: похудеть до 70 кг, 0,5 кг/нед». По тапу открывается экран смены цели. На Главную ничего не добавляем.
- **D-05:** Меняется **только сама цель**: похудеть / держать / набрать (`profiles.data.goal`). Трек (вес/глюкометр, `goalTrack`) в этой фазе не меняется. Отдельно редактировать целевой вес и темп как самостоятельную функцию не делаем.
- **D-06:** Если выбрано «похудеть» или «набрать» и для расчёта не хватает данных (например, раньше было «держать» или сохранённый целевой вес лежит не с той стороны от текущего), пользователя **доспрашиваем**: показываем шаги целевого веса и темпа на готовых компонентах онбординга (`OnboardingTargetWeight`, `OnboardingWeightChangeRate`), предзаполненные текущими значениями. Если выбрано «держать», сразу показываем превью.
- **D-07:** Нормы калорий и БЖУ после смены цели **пересчитываются с превью** «было → станет» (ккал и Б/Ж/У). Сохраняем только после подтверждения пользователем. Ручные правки норм (из `adjustMacroTargets`) при подтверждении перезаписываются, отдельный флаг «правлено вручную» не заводим.
- **D-08:** Когда вес достигает целевого, в этой фазе ничего не делаем: пользователь меняет цель сам.

### Вход по телефону (Telegram и WhatsApp)
- **D-09:** На `app/auth/phone-sign-in.tsx` сохраняется текущий UX: пользователь **сам выбирает канал** (WhatsApp или Telegram). Оба канала должны реально работать для произвольных номеров.
- **D-10:** Если код не удалось отправить (на номере нет Telegram или WhatsApp, ошибка провайдера, нет баланса), пользователь видит **понятную ошибку на русском** с предложением попробовать другой канал (например, «Не удалось отправить код в Telegram — попробуйте WhatsApp»). Сырые ошибки провайдера уходят в Sentry через `logError` и не показываются пользователю.
- **D-11:** Провайдеры остаются прежними: **Telegram Gateway API** (`convex/TelegramOTP.ts`) и **Twilio Verify, канал whatsapp** (`convex/WhatsAppOTP.ts`). На другого провайдера не переходим. Чиним настройки, аккаунты и ключи. Действия в консолях (пополнение баланса Telegram Gateway, апгрейд и настройка Twilio, WhatsApp-отправитель, переменные окружения в Convex prod и dev) выполняет пользователь, в плане это ручные шаги-чекпоинты с точными инструкциями.
- **D-12:** Целевая география номеров: **СНГ целиком** (KZ, RU, UZ, KG и т.д.). Исследователь проверяет доставку и ограничения обоих провайдеров для этих стран: ограничения Telegram Gateway по странам, требования WhatsApp и Twilio к отправителю и шаблону сообщения.

### Push в TestFlight
- **D-13:** Пользователь отдал диагностику и починку на усмотрение исследователя и планировщика (см. Claude's Discretion). Критерий готовности: push реально приходит на устройство с TestFlight-сборки (prod bundle `com.codetau.terenai`, prod-деплоймент Convex). Проверяет пользователь на устройстве.

### Claude's Discretion
- **Push в TestFlight:** вся диагностика. Основные гипотезы, которые стоит проверить:
  - для prod bundle id `com.codetau.terenai` в EAS credentials нет APNs-ключа (локальная dev-сборка использует `com.codetau.terenai.dev`);
  - `projectId` в `getExpoPushTokenAsync` указан неверно или не указан;
  - токены регистрируются не в тот деплоймент Convex (dev, а не prod);
  - крон-напоминания не запущены на prod-деплойменте;
  - проблема с entitlement `aps-environment`.
  
  Чтобы найти причину, смотреть receipts Expo Push API.
- **Telegram OTP:** подтвердить или опровергнуть гипотезу, что без пополненного баланса Telegram Gateway отправляет код только на номер владельца аккаунта. При необходимости использовать `checkSendAbility`.
- **WhatsApp OTP:** диагностика причины (AUTH-07). Кандидаты из STATE.md: переменные `TWILIO_*` отсутствуют или неверны, канал WhatsApp не подключён к Verify Service, trial-ограничения Twilio. Отдельно проверить совместимость параметра `CustomCode` с Verify: эта функция по умолчанию может быть выключена на аккаунте.
- Внешний вид карточки цели и экрана смены цели оформляется в стиле существующих экранов настроек.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Проектный контекст
- `.planning/PROJECT.md`: продукт, ограничения, решения о провайдерах входа
- `.planning/STATE.md`: открытый todo AUTH-07 (WhatsApp/Twilio, кандидаты причины), заметки о EAS-окружениях и prod-деплойменте Convex
- `.planning/REQUIREMENTS.md`: AUTH-06, AUTH-07, PUSH-01/02, MEALPUSH-01/02, WEIGH-01/02
- `.planning/ROADMAP.md` §Phase 72 и §Phase 73: границы фазы, вынос подписки

### Предыдущие фазы
- `.planning/phases/69-onboarding-gamification/69-CONTEXT.md`: решения по push-инфраструктуре (токены, часовой пояс, тумблеры, крон-напоминания)
- Директория Phase 3 в `.planning/phases/` не сохранилась. История входа по телефону (AUTH-06/07) описана в `.planning/STATE.md` (Roadmap Evolution, Pending Todos) и `.planning/PROJECT.md` (Key Decisions)

### Внешняя документация (для исследователя)
- Telegram Gateway API: https://core.telegram.org/gateway/api (`sendVerificationMessage`, `checkSendAbility`, баланс, ограничения)
- Twilio Verify, канал WhatsApp: https://www.twilio.com/docs/verify/whatsapp
- Expo push notifications и EAS credentials (APNs key): https://docs.expo.dev/push-notifications/push-notifications-setup/

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/onboarding/steps/goal/OnboardingGoal.tsx`, `OnboardingTargetWeight.tsx`, `OnboardingWeightChangeRate.tsx`: шаги цели, целевого веса и темпа для экрана смены цели.
- `app/app/(settings)/generateMacroTargets.tsx`: готовый паттерн «прогнать шаги онбординга вне онбординга и пересчитать нормы». Сейчас там только базовые шаги (пол, рост, вес, активность), шагов цели нет.
- `lib/nutrition/computeCalorieTarget.ts`, `lib/nutrition/computeMacroTargets.ts`, `convex/nutrition/computeNutritionTargets.ts`: пересчёт норм с учётом `goal`, `targetWeight`, `weightChangeRate`.
- `convex/profiles/updateProfile.ts`: сохранение профиля.
- `app/app/(settings)/weeklyWeighIn.tsx`: пример лёгкого экрана, который меняет часть профиля и пересчитывает цели, не разрушая остальные поля (WEIGH-02).
- `lib/utils/logError` (Sentry): для сырых ошибок OTP-провайдеров.

### Established Patterns
- Профиль: `convex/tables/profiles.ts`. В `data` лежат `goal`, `goalTrack`, `targetWeight` (number) и `weightChangeRate` (number). Тип `ProfileData`.
- Phase 69: `notificationSettings.tsx` патчит верхнеуровневые поля профиля точечно, без слияния `data`. При смене цели нужно аккуратно обновлять поля `data`, не затирая остальные.
- Вход по телефону: провайдеры `Phone` из `@convex-dev/auth/providers/Phone`, два параллельных провайдера `telegram-otp` и `whatsapp-otp`, выбор на `phone-sign-in.tsx` (тип `PhoneOtpProvider`), подтверждение на `app/auth/confirm-phone.tsx`.
- Push: клиент регистрирует токен в `components/notifications/NotificationsProvider.tsx` (`getExpoPushTokenAsync`), сервер отправляет через Expo Push API в `convex/notifications/sendPushNotification.ts`, кроны: `checkMealReminders.ts`, `checkWeighInReminders.ts`.
- Конфиг: `app.config.ts`. `APP_VARIANT` переключает bundle id `com.codetau.terenai` / `com.codetau.terenai.dev`, плагин `expo-notifications`, EAS `projectId` в `extra.eas`. Профили сборки в `eas.json`: production использует EAS environment `production`.

### Integration Points
- `app/app/(tabs)/settings.tsx`: место для карточки текущей цели (рядом со ссылками на `adjustMacroTargets` и `weeklyWeighIn`).
- `app/app/(settings)/`: новый экран смены цели.
- `convex/TelegramOTP.ts`, `convex/WhatsAppOTP.ts`: обработка ошибок провайдеров и коды ошибок для клиента.
- `app/auth/phone-sign-in.tsx`, `app/auth/confirm-phone.tsx`: показ понятных ошибок и предложение другого канала.
- Переменные окружения Convex prod и dev (`TELEGRAM_GATEWAY_TOKEN`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`) и EAS credentials (APNs).

</code_context>

<specifics>
## Specific Ideas

- Карточка цели в Настройках, пример текста: «Цель: похудеть до 70 кг, 0,5 кг/нед».
- Превью пересчёта в формате «было → станет» для ккал и каждого макроса.
- Текст ошибки OTP, пример: «Не удалось отправить код в Telegram — попробуйте WhatsApp».

</specifics>

<deferred>
## Deferred Ideas

- **Подписка целиком → Phase 73** (уже добавлена в ROADMAP). Решено: вебхук RevenueCat → Convex (SUB-01), флаг монетизации включается после sandbox-теста в TestFlight. Не решено, требует обсуждения с менеджерами: что закрывает подписка, тарифы, цены, триал.
- Автопредложение перейти на «держать», когда целевой вес достигнут.
- Смена трека (вес/глюкометр) из настроек.
- Блок цели и прогресса к целевому весу на Главной.
- Схема «основной канал + кнопка "не пришёл код?"» вместо ручного выбора канала.

</deferred>

---

*Phase: 72-push-testflight-telegram-whatsapp-otp*
*Context gathered: 2026-10-09*

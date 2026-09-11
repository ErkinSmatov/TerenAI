---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: milestone
status: executing
stopped_at: Completed phase 69 (69-08-PLAN.md, manual UAT)
last_updated: "2026-09-11T00:00:00.000Z"
last_activity: 2026-09-11
progress:
  total_phases: 10
  completed_phases: 6
  total_plans: 38
  completed_plans: 38
  percent: 60
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-05)

**Core value:** Пользователь фотографирует еду и через несколько секунд видит достоверные калории и БЖУ — без ручного ввода и поиска по базе.
**Current focus:** Phase 69 — onboarding-gamification — ✓ closed 2026-09-11

## Current Position

Phase: 69 (onboarding-gamification) — COMPLETE (8/8 plans)
Plan: Not started
Status: Ready to execute

Next step: pick the next phase from ROADMAP.md (Phase 67 — Дистрибуция и OTA-обновления — is the only phase left, Pending, 0 plans).

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 18
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 06 | 7 | - | - |
| 4 | 3 | - | - |
| 68 | 8 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 69 P01 | 20min | 3 tasks | 11 files |
| Phase 69 P03 | 25min | 3 tasks | 4 files |
| Phase 69 P04 | 10min | 3 tasks | 11 files |
| Phase 69 P05 | 20min | 2 tasks | 5 files |
| Phase 69 P07 | 4min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Гостевой режим строится на Anonymous-провайдере `@convex-dev/auth` (не local-only хранилище), чтобы получить настоящий `userId` и не переписывать 20 auth-гейтнутых Convex-функций и `<Stack.Protected>`
- Майлстоун ограничен стабильным TestFlight-билдом — Apple/Google Sign In, email/OTP, миграция на `convex-better-auth`, релиз в App Store отложены на v2
- Краш-репортинг (Phase 1) подключается до попытки чинить краш (Phase 2) — без логов причина краша непроверяема на практике
- Phase 6 плана 02: код доступа пациента (`generateCode`/`regenerateCode`) переиспользует общий хелпер `issueUniqueCode` (named export рядом с `export default`, по прецеденту `convex/rateLimit.ts`) — ротация никогда не трогает `observerLinks`, разрыв связей — отдельная функция `revokeLink` с обязательной проверкой участия по обоим полям (`observerId`/`patientId`), закрывающей IDOR
- 2026-08-20: вход по телефону реализован через провайдер `Phone` из `@convex-dev/auth/providers/Phone` с двумя параллельными реализациями (`convex/TelegramOTP.ts`, `convex/WhatsAppOTP.ts`), а не через единый универсальный OTP-провайдер — экран `phone-sign-in.tsx` предлагает выбор канала (WhatsApp/Telegram) явными кнопками, `confirm-phone.tsx` переиспользует общий `OTPInput`
- 2026-08-20: работа велась вне GSD-цикла (без `/gsd-discuss-phase`/`/gsd-plan-phase`) — задним числом сверена с REQUIREMENTS.md и встроена в Phase 3 (AUTH-06, AUTH-07) и новую Phase 3.1 (REPORT-01)
- [Phase 69]: weeklyWeighIn.tsx использует WeightPicker напрямую (не OnboardingWeight), чтобы не затирать targetWeight при каждом взвешивании
- [Phase 69]: notificationSettings.tsx патчит верхнеуровневые поля профиля точечно (без слияния data) — оба тумблера по умолчанию true при undefined
- [Phase 69]: checkAndAwardBadges использует pushTokens.timezoneOffsetMinutes как единственный источник часового пояса в фоновом пайплайне (0 по умолчанию)
- [Phase 69]: markBadgeSeen копирует проверку владения дословно из updateMealInternal.ts (два отдельных if вместо ||) для соответствия eslint prefer-optional-chain
- [Phase 69]: BadgeCelebrationModal использует @rn-primitives/portal напрямую (Portal/PortalHost без Root-обёртки) вместо AlertDialogPrimitive — у модалки нет триггер-элемента, видимость целиком выводится из реактивного getUnseenBadge

### Roadmap Evolution

- Phase 3 переопределена (2026-08-05): вместо «гостевой доступ без регистрации» — «вход в конце онбординга + гостевой доступ». Проверка кода показала, что шаг входа уже существует и стоит в верном месте потока; реальный блокер — отсутствие OAuth-ключей на бэкенде. Вход остаётся необязательным
- Phase 5 добавлена (2026-08-05): OTA-обновления через EAS Update. `expo-updates` не установлен, поэтому любая правка JS требует полного цикла пересборки и заливки
- Phase 6 добавлена (2026-08-14): Наблюдатель за пользователем (родитель/ребёнок/врач). Изначально зафиксирована как seed после `/gsd-explore` с пометкой «дождаться следующего майлстоуна»; по решению пользователя встроена в текущий роадмап v1.3 как Phase 6, а не отложена в v2. Идея и весь обсуждённый скоуп — в `.planning/seeds/observer-access.md`
- Phase 3.1 добавлена (2026-08-20): экспорт месячного PDF-отчёта. Обнаружена как незакоммиченная работа вне GSD-цикла (`convex/reports/`, `lib/reports/`); функциональность полностью готова, поэтому встроена в роадмап как отдельная завершённая decimal-фаза, а не backlog-пункт
- Phase 3 расширена (2026-08-20): вход по телефону (Telegram OTP, WhatsApp OTP через Twilio) добавлен в скоуп фазы задним числом как AUTH-06/AUTH-07 — обнаружен как незакоммиченная работа вне GSD-цикла, Telegram подтверждён рабочим, WhatsApp/Twilio — нет
- Phase 2 removed: Убрана из активного роадмапа 2026-08-21 (решение пользователя, /gsd-discuss-phase 5) — незакрытые BOOT-02/03/04, DIST-01/02 перенесены в новую Phase 67. BOOT-01 остаётся закрытым, не переносился
- Phase 5 removed: Убрана из активного роадмапа 2026-08-21 (решение пользователя, /gsd-discuss-phase 5) — весь скоуп OTA/EAS Update перенесён в новую Phase 67 вместе с незакрытым скоупом бывшей Phase 2
- Phase 67 added: Дистрибуция и OTA-обновления — намеренно вне обычной последовательности номеров, объединяет незакрытый скоуп бывших Phase 2 и Phase 5 (2026-08-21)
- Phase 7 added: Двухэтапное распознавание блюда: список ингредиентов показывается сразу (без поиска по базе), пользователь редактирует, тяжёлая часть (поиск кандидатов + КБЖУ) уходит в фон после подтверждения, уведомление по готовности. Требования MEAL-01...05 добавлены в REQUIREMENTS.md
- Phase 68 added (2026-08-25): три задачи, объединённые пользователем в одну фазу — (1) баг: данные Apple Health не обновляются (существующая инфраструктура `useHealthKitSync`/`importHealthKitReadings` уже есть, но ненадёжна), (2) новая фича: приблизительная оценка глюкозы от сахара в еде, отдельно от измеренных показаний, (3) новая фича: история по месяцу через календарь (клик по незаполненному дню недели → календарь → клик по дате → существующий экран аналитики дня). Требования HEALTH-01, GLU-01, HIST-01, HIST-02 добавлены в REQUIREMENTS.md
- Phase 69 added (2026-08-30): доработки онбординга, напоминание о повторном взвешивании через неделю через профиль пользователя, push-уведомления с напоминанием записать приём пищи, геймификация. Пользователь осознанно решил добавить эту фазу в текущий роадмап несмотря на то, что она выходит за рамки заявленного скоупа майлстоуна («стабильный TestFlight-билд») — см. PROJECT.md Out of Scope. Геймификация зафиксирована как открытый вопрос: направление (стрики/бейджи, очки/уровни или социальный формат через наблюдателей) выбирается на этапе `/gsd-discuss-phase 69`, варианты пока не сужены

### Pending Todos

- ✓ **Закрыто 2026-08-05:** сборка 1.2.1 (2) установлена из TestFlight, приложение открывается и показывает онбординг. Гипотеза о пустой EAS-среде подтверждена, BOOT-01 выполнен.
- ✓ **Закрыто 2026-08-05:** вход через Google проверен пользователем и работает (ключи `AUTH_GOOGLE_*` заведены в Convex).
- ✓ **Закрыто 2026-08-06 (dev-режим):** пользователь прогнал `npm run ios` и подтвердил — гостевой вход работает, онбординг проходит без пейволла, фото анализируется без подписки, качество разбора новой моделью grok-4.3 приемлемо, группа подписки в настройках скрыта. Закрывает GUEST-01…04 и проверку скрытия монетизации.
- ✓ **Закрыто 2026-08-14:** Task 1 плана 01-04 — локальная сборка в конфигурации Release (`npm run ios:prod`) подтверждённо шлёт события в Sentry с читаемым стеком в окружении `local-release`. Закрывает OBS-02, OBS-04.
- ✓ **Закрыто 2026-08-21:** Task 2/3 плана 01-04 / backlog Phase 999.1 — объединено с Phase 4 (план 04-03). EAS production build #7 (`com.codetau.terenai@1.2.1+7`) собран, sourcemaps подтверждены в Sentry (artifact bundle), сборка залита в TestFlight, сквозной прогон пройден, 4 диагностических события подтверждены с читаемым стеком и `environment=testflight`. Закрывает OBS-01, OBS-03.
- **Риск:** баланс OpenRouter отрицательный (−$0.18, кредитов куплено на $0). Запросы пока проходят в долг; на пороге отсечения анализ блюд перестанет работать целиком. Пополнение — только пользователем.
- **Ожидает человека:** включить Rate Limits на Client Key в Sentry (рекомендовано 100 событий в час) — DSN публичен, без лимита квота уязвима.
- Ключи RevenueCat (`EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`, `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY`) отсутствуют и в `.env.local`, и в EAS. Краш не вызывают (инициализация защищена проверкой `if (apiKey)`), но подписки не работают нигде. Всплывёт в Phase 3 при GUEST-07.
- **Открыто 2026-08-20 (AUTH-07):** WhatsApp OTP через Twilio Verify (`convex/WhatsAppOTP.ts`) не работает — код реализован, но интеграция не подтверждена. Кандидаты причины: неверные/отсутствующие `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_VERIFY_SERVICE_SID`, либо WhatsApp-канал не подключён к Verify Service в консоли Twilio. Не блокирует ничего — Telegram OTP уже даёт рабочий путь входа по телефону.
- ✓ **Закрыто 2026-08-21:** работа по телефонному входу и PDF-отчёту закоммичена отдельным коммитом `895bda1` перед EAS-сборкой (по требованию D-03 — сборка должна содержать весь код после 2026-08-06).
- **Отложено 2026-08-21 (code review Phase 4, `04-REVIEW.md`):** WR-01 (порядок проверок статус/владение в `getMeal.ts` — утечка статуса чужого блюда), WR-02 (нет защиты от конкурентных вызовов `correctMeal`), WR-03 (AI-лимит списывается до валидации запроса в `correctMeal`), WR-04 (нет guard `"skip"` в `mealItemNutrients.tsx`), WR-05 (необработанный `Forbidden` роняет экран блюда/ингредиента вместо редиректа), WR-06 (заголовок дня в `nutrients.tsx` считается отдельно от `weekBounds`, может разойтись с данными), IN-01…04 (дублирование бакетинга недели, отсутствие валидации пустой правки, UX-мелочь в `fix-meal.tsx`, `getMealItem.ts` не проверяет статус родителя) — по решению пользователя не блокируют закрытие Phase 4, оставлены как задокументированный backlog в `04-REVIEW.md`.

### Blockers/Concerns

- **Phase 2**: EAS-окружения `production` и `development` в проекте сейчас пусты (`eas env:list --environment production` — 0 переменных). Это подтверждённая причина краша 1.2.1 (1): `EXPO_PUBLIC_CONVEX_URL` не долетает до продакшн-бандла, а `components/RootLayoutProvider.tsx:29-33` бросает исключение на уровне модуля. Фикс требует реальных значений секретов — агент НЕ должен придумывать или изобретать значения; пользователь должен сам предоставить/подтвердить их и выполнить/одобрить шаги `eas env:create`. Клиентские `EXPO_PUBLIC_*` переменные — в EAS; серверные секреты (`AUTH_*`, `OPENROUTER_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `REVENUECAT_SECRET_KEY`, `INGEST_TOKEN`, `JWKS`, `JWT_PRIVATE_KEY`, `SITE_URL`) — в Convex deployment, не в мобильную сборку.
- **Phase 3**: In-place-связывание анонимного аккаунта с Apple/Google (перенос того же `userId` при входе) технически возможно через кастомный `createOrUpdateUser` в `convex/auth.ts`, но не покрыто тестами апстрима (`test.todo` в `@convex-dev/auth`, открытый issue #231) — реализация самого связывания вне этого майлстоуна (v2), но дизайн гостевого режима не должен исключать эту возможность в будущем.
- **Phase 3**: `Purchases.logIn(profile.userId)` в `context/SubscriptionContext.tsx` использует Convex `userId` напрямую как RevenueCat App User ID — если в будущем (v2) связывание аккаунта создаст новый `userId` вместо переиспользования старого, платящий гость потеряет привязку покупки. Флаг для v2, не блокирует этот майлстоун.
- **Phase 3**: Анонимный вход сейчас не имеет отдельного (более низкого) рейт-лимита и нет cron-очистки заброшенных гостевых пользователей (`convex/crons.ts` не существует) — приемлемо для внутреннего TestFlight-тестирования по объёму `PROJECT.md`, но должно быть исправлено до публичного релиза (риск фарминга AI-лимита через переустановку на Android).

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Авторизация | Apple Sign In, Google Sign In, email/OTP вход (v2 AUTH-01…03) | Deferred to v2 | Roadmap creation 2026-08-05 |
| Авторизация | Связывание гостевого аккаунта с реальным без потери данных (v2 AUTH-04) | Deferred to v2 | Roadmap creation 2026-08-05 |
| Авторизация | Сохранение гостевых данных при переустановке (v2 AUTH-05) | Deferred to v2 | Roadmap creation 2026-08-05 |
| Подписка | Вебхук RevenueCat на сервере (v2 SUB-01) | Deferred to v2 | Roadmap creation 2026-08-05 |
| Подписка | Экран подтверждения после покупки (v2 SUB-02) | Deferred to v2 | Roadmap creation 2026-08-05 |
| Качество | Автотесты бизнес-логики Convex, валидация аргументов (v2 QA-01, QA-02) | Deferred to v2 | Roadmap creation 2026-08-05 |
| Инфраструктура | Миграция на `convex-better-auth` | Deferred (see PROJECT.md Out of Scope) | Roadmap creation 2026-08-05 |
| Инфраструктура | Полный бэклог TODO.md (116 пунктов), мультиязычность, обновление мажорных версий Expo/RN/Reanimated | Deferred (see PROJECT.md Out of Scope) | Roadmap creation 2026-08-05 |

## Session Continuity

Last session: 2026-08-31T05:05:35.963Z
Stopped at: Completed 69-07-PLAN.md
Resume file: None

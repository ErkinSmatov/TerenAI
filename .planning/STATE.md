---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: milestone
status: executing
stopped_at: "Phase 3 (Вход в конце онбординга + гостевой доступ) закрыта 2026-08-20 — пользователь подтвердил, что гостевой вход, Google и Telegram OTP работают. Вне GSD-цикла также обнаружены и заведены в роадмап: WhatsApp OTP через Twilio (реализован, но не работает — открытый пункт, AUTH-07) и новая Phase 3.1 (экспорт месячного PDF-отчёта, полностью готова). Переходим к Phase 4 (Сквозной сценарий тестера) — план ещё не создан. Phase 2 обсуждение было начато и прервано пользователем в пользу Phase 6 — `/gsd-discuss-phase 2` не завершено, вернуться к нему отдельно."
last_updated: "2026-08-20T00:00:00.000Z"
last_activity: 2026-08-20
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 11
  completed_plans: 11
  percent: 43
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-05)

**Core value:** Пользователь фотографирует еду и через несколько секунд видит достоверные калории и БЖУ — без ручного ввода и поиска по базе.
**Current focus:** Phase 4 — Сквозной сценарий тестера (следующая к планированию)

## Current Position

Phase: 4 of 6 — Not started (Сквозной сценарий тестера)
Plan: 0/TBD — план ещё не создан
Status: Ready to plan — Phases 2, 4, 5 остаются; Phase 999.1 (backlog, Phase 1 follow-up) также pending. Phases 1, 3, 6 закрыты (частично/полностью), Phase 3.1 закрыта
Last activity: 2026-08-20

Progress: [████░░░░░░] 43% (Phases 1 (частично), 3, 3.1, 6 закрыты, 3 интеграционные фазы + backlog впереди)

## Performance Metrics

**Velocity:**

- Total plans completed: 7
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 06 | 7 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

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

### Roadmap Evolution

- Phase 3 переопределена (2026-08-05): вместо «гостевой доступ без регистрации» — «вход в конце онбординга + гостевой доступ». Проверка кода показала, что шаг входа уже существует и стоит в верном месте потока; реальный блокер — отсутствие OAuth-ключей на бэкенде. Вход остаётся необязательным
- Phase 5 добавлена (2026-08-05): OTA-обновления через EAS Update. `expo-updates` не установлен, поэтому любая правка JS требует полного цикла пересборки и заливки
- Phase 6 добавлена (2026-08-14): Наблюдатель за пользователем (родитель/ребёнок/врач). Изначально зафиксирована как seed после `/gsd-explore` с пометкой «дождаться следующего майлстоуна»; по решению пользователя встроена в текущий роадмап v1.3 как Phase 6, а не отложена в v2. Идея и весь обсуждённый скоуп — в `.planning/seeds/observer-access.md`
- Phase 3.1 добавлена (2026-08-20): экспорт месячного PDF-отчёта. Обнаружена как незакоммиченная работа вне GSD-цикла (`convex/reports/`, `lib/reports/`); функциональность полностью готова, поэтому встроена в роадмап как отдельная завершённая decimal-фаза, а не backlog-пункт
- Phase 3 расширена (2026-08-20): вход по телефону (Telegram OTP, WhatsApp OTP через Twilio) добавлен в скоуп фазы задним числом как AUTH-06/AUTH-07 — обнаружен как незакоммиченная работа вне GSD-цикла, Telegram подтверждён рабочим, WhatsApp/Twilio — нет

### Pending Todos

- ✓ **Закрыто 2026-08-05:** сборка 1.2.1 (2) установлена из TestFlight, приложение открывается и показывает онбординг. Гипотеза о пустой EAS-среде подтверждена, BOOT-01 выполнен.
- ✓ **Закрыто 2026-08-05:** вход через Google проверен пользователем и работает (ключи `AUTH_GOOGLE_*` заведены в Convex).
- ✓ **Закрыто 2026-08-06 (dev-режим):** пользователь прогнал `npm run ios` и подтвердил — гостевой вход работает, онбординг проходит без пейволла, фото анализируется без подписки, качество разбора новой моделью grok-4.3 приемлемо, группа подписки в настройках скрыта. Закрывает GUEST-01…04 и проверку скрытия монетизации.
- ✓ **Закрыто 2026-08-14:** Task 1 плана 01-04 — локальная сборка в конфигурации Release (`npm run ios:prod`) подтверждённо шлёт события в Sentry с читаемым стеком в окружении `local-release`. Закрывает OBS-02, OBS-04.
- ⚠️ **Отложено 2026-08-14 (backlog Phase 999.1):** Task 2/3 плана 01-04 — сборка EAS production, проверка sourcemaps через `sentry-cli`, сквозная проверка на реальной TestFlight-сборке. OBS-01, OBS-03 остаются Pending. Существующая сборка 1.2.1 (2) не подходит — Sentry в ней не интегрирован.
- **Риск:** баланс OpenRouter отрицательный (−$0.18, кредитов куплено на $0). Запросы пока проходят в долг; на пороге отсечения анализ блюд перестанет работать целиком. Пополнение — только пользователем.
- **Ожидает человека:** включить Rate Limits на Client Key в Sentry (рекомендовано 100 событий в час) — DSN публичен, без лимита квота уязвима.
- Ключи RevenueCat (`EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`, `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY`) отсутствуют и в `.env.local`, и в EAS. Краш не вызывают (инициализация защищена проверкой `if (apiKey)`), но подписки не работают нигде. Всплывёт в Phase 3 при GUEST-07.
- **Открыто 2026-08-20 (AUTH-07):** WhatsApp OTP через Twilio Verify (`convex/WhatsAppOTP.ts`) не работает — код реализован, но интеграция не подтверждена. Кандидаты причины: неверные/отсутствующие `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_VERIFY_SERVICE_SID`, либо WhatsApp-канал не подключён к Verify Service в консоли Twilio. Не блокирует ничего — Telegram OTP уже даёт рабочий путь входа по телефону.
- **Не закоммичено 2026-08-20:** вся работа по телефонному входу и PDF-отчёту (`app/auth/phone-sign-in.tsx`, `app/auth/confirm-phone.tsx`, `convex/TelegramOTP.ts`, `convex/WhatsAppOTP.ts`, `convex/reports/`, `lib/reports/`, изменения в `settings.tsx`, `SignInButtons.tsx`, `auth.ts`, `package.json`, `.env.example`) сидит в рабочей директории незакоммиченной — стоит закоммитить отдельно от Phase 4.

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

Last session: 2026-08-20
Stopped at: Phase 3 закрыта пользователем («всё работает»), Phase 3.1 (экспорт отчёта) заведена в роадмап как готовая. Следующий шаг — `/gsd-discuss-phase 4` → `/gsd-plan-phase 4` для «Сквозного сценария тестера» (FLOW-01…04: `getMeal.ts` деградация при отсутствующем food, `fix-meal.tsx` потеря ошибки из-за `void` без `await`, `getWeekMeals.ts` DST-баг, сквозной прогон на TestFlight). Phase 2 обсуждение было начато и прервано пользователем в пользу Phase 6 — `/gsd-discuss-phase 2` не завершено, вернуться к нему отдельно
Resume file: .planning/phases/04-* (ещё не создан — начать с `/gsd-discuss-phase 4`)

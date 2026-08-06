# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-05)

**Core value:** Пользователь фотографирует еду и через несколько секунд видит достоверные калории и БЖУ — без ручного ввода и поиска по базе.
**Current focus:** Phase 1 — Наблюдаемость продакшена

## Current Position

Phase: 1 of 4 (Наблюдаемость продакшена)
Plan: TBD (роадмап создан, планирование фазы ещё не запускалось)
Status: Ready to plan — но ожидается подтверждение результата внеплановой проверочной сборки (см. ниже)
Last activity: 2026-08-05 — Вне роадмапа выполнена проверка гипотезы о крашe: `EXPO_PUBLIC_CONVEX_URL` задана в EAS-среде `production`, собрана и залита в TestFlight сборка 1.2.1 (2). Лог сборки подтверждает загрузку переменной («Environment variables … loaded from the "production" environment on EAS: EXPO_PUBLIC_CONVEX_URL»). **Фактический запуск на устройстве человеком ещё не подтверждён** — BOOT-01 остаётся Pending до этого.

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

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

### Roadmap Evolution

- Phase 3 переопределена (2026-08-05): вместо «гостевой доступ без регистрации» — «вход в конце онбординга + гостевой доступ». Проверка кода показала, что шаг входа уже существует и стоит в верном месте потока; реальный блокер — отсутствие OAuth-ключей на бэкенде. Вход остаётся необязательным
- Phase 5 добавлена (2026-08-05): OTA-обновления через EAS Update. `expo-updates` не установлен, поэтому любая правка JS требует полного цикла пересборки и заливки

### Pending Todos

- ✓ **Закрыто 2026-08-05:** сборка 1.2.1 (2) установлена из TestFlight, приложение открывается и показывает онбординг. Гипотеза о пустой EAS-среде подтверждена, BOOT-01 выполнен.
- ✓ **Закрыто 2026-08-05:** вход через Google проверен пользователем и работает (ключи `AUTH_GOOGLE_*` заведены в Convex).
- ✓ **Закрыто 2026-08-06 (dev-режим):** пользователь прогнал `npm run ios` и подтвердил — гостевой вход работает, онбординг проходит без пейволла, фото анализируется без подписки, качество разбора новой моделью grok-4.3 приемлемо, группа подписки в настройках скрыта. Закрывает GUEST-01…04 и проверку скрытия монетизации.
- ⚠️ **Не закрыто dev-проверкой:** работа Sentry. В dev отправка отключена намеренно (`enabled: !__DEV__`), поэтому диагностику подтверждает только сборка в конфигурации Release — это Task 1 плана 01-04.
- **Риск:** баланс OpenRouter отрицательный (−$0.18, кредитов куплено на $0). Запросы пока проходят в долг; на пороге отсечения анализ блюд перестанет работать целиком. Пополнение — только пользователем.
- **Ожидает человека:** включить Rate Limits на Client Key в Sentry (рекомендовано 100 событий в час) — DSN публичен, без лимита квота уязвима.
- Ключи RevenueCat (`EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`, `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY`) отсутствуют и в `.env.local`, и в EAS. Краш не вызывают (инициализация защищена проверкой `if (apiKey)`), но подписки не работают нигде. Всплывёт в Phase 3 при GUEST-07.

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

Last session: 2026-08-05
Stopped at: ROADMAP.md, STATE.md и REQUIREMENTS.md (traceability) созданы для v1.3; фазы ожидают `/gsd-plan-phase 1`
Resume file: None

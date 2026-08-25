---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: milestone
status: executing
stopped_at: Phase 7 wave 8 (07-08) gap-closure merged — both bugs fixed at code level; wave 6 human-verify must be re-run before phase closes
last_updated: "2026-08-25T09:50:00.000Z"
last_activity: 2026-08-25 -- Phase 07 gap-closure complete at code level (07-07 + 07-08 merged, tsc+lint clean); human re-verification (wave 6) still required
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 22
  completed_plans: 16
  percent: 38
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-05)

**Core value:** Пользователь фотографирует еду и через несколько секунд видит достоверные калории и БЖУ — без ручного ввода и поиска по базе.
**Current focus:** Phase 07 — two-stage-meal-analysis

## Current Position

Phase: 07 (two-stage-meal-analysis) — BLOCKED on human re-verification (wave 6 re-run)
Plan: 8 of 8 code/gap plans complete (07-01…07-05, 07-07, 07-08 merged); 07-06 (human-verify) FAILED on the first attempt and MUST be re-run in full — it is the only remaining gate before this phase can close
Status: `npx tsc --noEmit` clean project-wide, `npm run lint` clean on every file touched by 07-07/07-08 (8 pre-existing lint errors remain in untouched files, logged in `.planning/phases/07-two-stage-meal-analysis/deferred-items.md`, out of scope for this gap-closure). Bug 1 (Unauthorized in scheduler) has genuine runtime proof via `npx convex logs`. Bug 2 (English ingredient names) — 07-08 added a required `nameRu` field (Russian display name) alongside the existing English `name` (kept as the FDC vector-search key); verified via static type-tracing (2 plan-checker rounds) and a clean `npx convex dev --once` deploy, but the orchestrator's own attempt to trigger a live model call outside the Convex runtime hit an unrelated local-harness bug (Node's strict undici fetch rejecting a pre-existing em-dash character in an unrelated system-prompt string that already ships fine in production via Convex's own fetch) — not indicative of a real bug, but means the *live Cyrillic model output* has not been directly observed yet. That observation now falls to the wave-6 human re-run, same as the rest of the previously-unreached verification steps.
Last activity: 2026-08-25 -- Phase 07 gap-closure (07-07, 07-08) executed and merged; both tsc/lint clean; live end-to-end confirmation deferred to human re-run

Next step: `/gsd-execute-phase 7 --wave 6` to re-run the full human verification (all 11 steps, including the 6 never reached on the first attempt), watching specifically for: (a) no error state after confirming a meal, (b) ingredient names rendering in Russian on the confirm-meal screen.

Progress: [████░░░░░░] 43% (Phases 1 (частично), 3, 3.1, 6 закрыты, 3 интеграционные фазы + backlog впереди)

## Performance Metrics

**Velocity:**

- Total plans completed: 10
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 06 | 7 | - | - |
| 4 | 3 | - | - |

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
- Phase 2 removed: Убрана из активного роадмапа 2026-08-21 (решение пользователя, /gsd-discuss-phase 5) — незакрытые BOOT-02/03/04, DIST-01/02 перенесены в новую Phase 67. BOOT-01 остаётся закрытым, не переносился
- Phase 5 removed: Убрана из активного роадмапа 2026-08-21 (решение пользователя, /gsd-discuss-phase 5) — весь скоуп OTA/EAS Update перенесён в новую Phase 67 вместе с незакрытым скоупом бывшей Phase 2
- Phase 67 added: Дистрибуция и OTA-обновления — намеренно вне обычной последовательности номеров, объединяет незакрытый скоуп бывших Phase 2 и Phase 5 (2026-08-21)
- Phase 7 added: Двухэтапное распознавание блюда: список ингредиентов показывается сразу (без поиска по базе), пользователь редактирует, тяжёлая часть (поиск кандидатов + КБЖУ) уходит в фон после подтверждения, уведомление по готовности. Требования MEAL-01...05 добавлены в REQUIREMENTS.md

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

- **Phase 7 (2026-08-24/25, gap-closure complete at code level, human re-verification pending):** Human verification of the two-stage meal analysis flow (plan 07-06) FAILED at step 5/11 — every confirmed meal errored out ("Не удалось распознать блюдо") instead of finishing background processing, and ingredient names rendered in English. Both root causes found and fixed:
  - ✓ **Bug 1, fixed 2026-08-25 (plan 07-07):** `convex/foods/getFoodByIdentity.ts` was a public `query` calling `getAuthUserId(ctx)`, throwing `Unauthorized` from the scheduled/auth-less `processDetectedItemsAction` context. Added `convex/foods/getFoodByIdentityInternal.ts` (internalQuery, no auth check); verified with genuine runtime proof (re-ran a real errored meal through `processDetectedItemsAction`, reached `status: "done"`, confirmed via `npx convex logs` the `Unauthorized` error class no longer occurs).
  - ✓ **Bug 2, fixed 2026-08-25 (plan 07-08):** `convex/meals/analyze/detectMealItems.ts`'s zod schema constrained `mealName` to Russian but left `items[].name` unconstrained. Added a required `nameRu` field (kept English `name` as the FDC vector-search key — the embedding index in `backfillFoodEmbeddings.ts` is English-only, so translating `name` itself would have silently degraded candidate-match quality). Plan-checker verified after 2 revision rounds; `tsc`/`lint` clean on all touched files. The orchestrator's own attempt to observe a live Cyrillic model response (outside the app, via a local script) hit an unrelated Node/undici header-encoding quirk on a pre-existing em-dash in a system prompt that already ships fine through Convex's own fetch in production — inconclusive, not a real bug, but means live model output has not been directly observed yet.
  - **Remaining:** plan 07-06 (human verification) must be re-run in full via `/gsd-execute-phase 7 --wave 6`, including the 6 steps never reached on the first attempt (toast timing/dedup, retry-on-error, barcode regression) plus explicit confirmation that ingredient names now render in Russian. Full details in `.planning/phases/07-two-stage-meal-analysis/07-06-SUMMARY.md`, `07-07-SUMMARY.md`, `07-08-SUMMARY.md`.

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

Last session: 2026-08-24T06:05:53.276Z
Stopped at: Phase 7 UI-SPEC approved
Resume file: .planning/phases/07-two-stage-meal-analysis/07-UI-SPEC.md

---
phase: 72
slug: push-testflight-telegram-whatsapp-otp
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-09
---

# Phase 72 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none (в проекте нет тестового фреймворка; проверка через tsc + eslint) |
| **Config file** | none |
| **Quick run command** | `npx tsc --noEmit && npx eslint <изменённые файлы>` |
| **Full suite command** | `npx tsc --noEmit && npx eslint .` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit` + eslint по изменённым файлам
- **After every plan wave:** Run `npx tsc --noEmit && npx eslint .`
- **Before `/gsd:verify-work`:** Full suite must be green; ручные проверки на устройстве (push, OTP) пройдены
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

Заполняется планировщиком по задачам планов (Task ID формата 72-NN-MM).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 72-01-01 | 01 | 1 | D-13 | T-72-02, T-72-03 | токен в логах только маской | typecheck | `npx tsc --noEmit && npx eslint convex/notifications` | ✅ | ⬜ pending |
| 72-01-02 | 01 | 1 | D-13 | T-72-01 | sendTestPush только internal | typecheck + grep | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 72-01-03 | 01 | 1 | D-13 | T-72-02 | токен в логах только суффиксом | script | `node scripts/checks/pushConfig.check.mjs && npx tsc --noEmit` | ❌ W0 (создаётся в задаче) | ⬜ pending |
| 72-02-01 | 02 | 1 | D-10, D-11 | T-72-06 | классификация по коду, не по тексту | script | `node --experimental-strip-types --no-warnings scripts/checks/otpErrors.check.mjs` | ❌ W0 (создаётся в задаче) | ⬜ pending |
| 72-02-02 | 02 | 1 | D-09..D-12 | T-72-05, T-72-07, T-72-09, T-72-10 | лимиты otpSend и otpSendGlobal, ConvexError без сырого текста, env-проверки, маркер CUSTOM_CODE_REJECTED | typecheck + grep | `npx tsc --noEmit && npx eslint convex/TelegramOTP.ts convex/WhatsAppOTP.ts convex/rateLimit.ts` | ✅ | ⬜ pending |
| 72-03-01 | 03 | 1 | D-12 | T-72-11 | только цифры, длина по стране | script | `node --experimental-strip-types --no-warnings scripts/checks/phoneCountries.check.mjs` | ❌ W0 (создаётся в задаче) | ⬜ pending |
| 72-03-02 | 03 | 1 | D-09, D-12 | T-72-11 | E.164 до signIn | typecheck | `npx tsc --noEmit && npx eslint app/auth/phone-sign-in.tsx` | ✅ | ⬜ pending |
| 72-04-01 | 04 | 2 | D-10 | T-72-14, T-72-15 | фиксированный словарь текстов | script | `node --experimental-strip-types --no-warnings scripts/checks/otpErrorMessage.check.mjs` | ❌ W0 (создаётся в задаче) | ⬜ pending |
| 72-04-02 | 04 | 2 | D-09, D-10 | T-72-14 | error.message не показывается | typecheck + grep | `npx tsc --noEmit && npx eslint app/auth` | ✅ | ⬜ pending |
| 72-05-01 | 05 | 3 | D-17, D-19 | T-72-26, T-72-28 | маска *firebase-adminsdk*.json, коммит только своих файлов | typecheck + script | `npx tsc --noEmit && npx eslint convex/notifications && node scripts/checks/pushConfig.check.mjs` (до D-18 падает только на com.codetau.terenai.dev) | ✅ | ⬜ pending |
| 72-05-02 | 05 | 3 | D-13, D-14, D-18, D-19 | T-72-17, T-72-26 | ключи только в EAS credentials | manual + script | `node scripts/checks/pushConfig.check.mjs` | — | ⬜ pending |
| 72-05-03 | 05 | 3 | D-18, D-19, D-20 | T-72-27, T-72-28 | нет private_key в google-services.json | script | `node scripts/checks/pushConfig.check.mjs && git ls-files --error-unmatch google-services.json` | — | ⬜ pending |
| 72-06-01 | 06 | 3 | D-11, D-15 | T-72-29, T-72-30 | сид/токен не в чат | manual | `npx convex env list --prod \| grep -c TELEGRAM_GATEWAY_TOKEN` | — | ⬜ pending |
| 72-06-02 | 06 | 3 | D-09, D-15 | T-72-19 | — | manual (dev) | `npx convex logs` | — | ⬜ pending |
| 72-07-01 | 07 | 4 | D-20 | T-72-31 | явный выбор источника деплоя | manual (decision) | `git status --short` | — | ⬜ pending |
| 72-07-02 | 07 | 4 | D-13, D-17 | T-72-20 | деплой после tsc/eslint/checks; aps-environment=production | manual | `npx convex deploy`; `codesign -d --entitlements - Payload/*.app` | — | ⬜ pending |
| 72-07-03 | 07 | 4 | D-09, D-10, D-13, D-15, D-17 | — | — | manual (device) | `npx convex run --prod notifications/sendTestPush:default` (platform ios/android) | — | ⬜ pending |
| 72-08-01 | 08 | 5 | D-04, D-06 | — | — | script | `node --experimental-strip-types --no-warnings scripts/checks/goal.check.mjs` | ❌ W0 (создаётся в задаче) | ⬜ pending |
| 72-08-02 | 08 | 5 | D-05..D-08 | T-72-21, T-72-23 | спред profile.data при сохранении; Save заблокирован при needsGoalDetails | typecheck + grep | `npx tsc --noEmit && npx eslint "app/app/(settings)/changeGoal.tsx"` | ✅ | ⬜ pending |
| 72-09-01 | 09 | 6 | D-04 | T-72-24 | — | typecheck | `npx tsc --noEmit && npx eslint "app/app/(tabs)/settings.tsx"` | ✅ | ⬜ pending |
| 72-09-02 | 09 | 6 | D-04..D-07 | — | — | manual (simulator) | — | — | ⬜ pending |
| 72-10-01 | 10 | 7 | D-11, D-16, AUTH-07 | T-72-33 | custom_code_enabled проверен; секреты не в чат | manual | `npx convex env list --prod` | — | ⬜ pending |
| 72-10-02 | 10 | 7 | D-09, D-12, AUTH-07 | T-72-19 | — | manual (device) | `npx convex logs --prod` | — | ⬜ pending |
| 72-10-03 | 10 | 7 | D-16, AUTH-07 | — | — | grep | `grep "AUTH-07" .planning/REQUIREMENTS.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Решение планировщика: vitest не вводим. Статическая проверка push-конфига — `scripts/checks/pushConfig.check.mjs` (обычный node, 72-01 Task 3). Чистые функции без runtime-импортов (`convex/utils/otpErrors.ts`, `lib/auth/phoneCountries.ts`, `lib/auth/otpErrorMessage.ts`, `lib/goal/goalDetails.ts`) проверяются ESM-скриптами `scripts/checks/*.check.mjs` через `node --experimental-strip-types --no-warnings` (Node 22.22, проверено при планировании). Скрипты создаются первым шагом соответствующих TDD-задач.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Push приходит на TestFlight-сборку | D-13, PUSH-01/02 | Нужны устройство, APNs и prod Convex | Установить сборку из TestFlight, разрешить уведомления, вызвать тестовый internalAction на prod, проверить receipts и доставку |
| Telegram OTP на чужой номер | D-09, D-11, AUTH-06 | Внешний платный сервис | Войти с номера, отличного от владельца Gateway |
| WhatsApp OTP на номер СНГ | D-09, D-11, D-12, AUTH-07 | Twilio Sender/WABA, внешний сервис | Войти через WhatsApp с номера KZ/RU/UZ |
| Понятная ошибка и предложение другого канала | D-10 | Нужен реальный отказ провайдера | Ввести номер без Telegram, проверить русский текст ошибки |
| Смена цели с превью «было → станет» | D-04..D-07 | UI на симуляторе/устройстве | Сменить цель maintain → lose, проверить доспрос, превью и сохранение норм; проверить, что gain с целевым весом = текущему сохранить нельзя |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 72-push-testflight-telegram-whatsapp-otp
plan: 02
subsystem: auth
tags: [convex, otp, telegram-gateway, twilio-verify, rate-limiter]
requires: []
provides:
  - "convex/utils/otpErrors.ts: OtpErrorCode/OtpErrorData, classifyTelegramError, classifyTwilioError, maskPhone"
  - "ConvexError({code, channel}) из sendVerificationRequest обоих провайдеров"
  - "лимиты otpSend (5/час на номер) и otpSendGlobal (500/сутки)"
affects: [72-03, 72-05]
key-files:
  created:
    - convex/utils/otpErrors.ts
    - scripts/checks/otpErrors.check.mjs
  modified:
    - convex/TelegramOTP.ts
    - convex/WhatsAppOTP.ts
    - convex/rateLimit.ts
requirements-completed: [AUTH-06, AUTH-07]
duration: 15min
completed: 2026-10-10
---

# Phase 72 Plan 02: серверная часть OTP Summary

Типизированные ConvexError с кодом причины для Telegram Gateway (checkSendAbility + request_id) и Twilio Verify, проверка env, лимиты отправки 5/час на номер и 500/сутки глобально.

## Commits
- 926460a: классификаторы ошибок и проверочный скрипт
- (второй коммит): провайдеры и rateLimit

## Deviations from Plan

1. [Rule 1 - Bug в плане] Ожидание maskPhone("+77011234567") в плане "+7*******4567" (7 звёздочек) противоречит правилу "первые 2 + последние 4" (12 символов, 6 звёздочек). Реализовано по правилу, в скрипте ожидается "+7******4567".
2. Критерий "grep -c new ConvexError >= 3" буквально не выполнен: бросание вынесено в один helper `fail(code)` в каждом провайдере (одно вхождение `new ConvexError`), все ветки ошибок идут через него. Поведение эквивалентно.

## Принятые риски
- T-72-08: 4-значный код OTP сохранён осознанно (компенсация: maxAge 15 мин, лимит неудачных попыток Convex Auth, otpSend 5/час). Пересмотр до 6 цифр — отдельная задача вне фазы 72.
- T-72-10: исчерпание otpSendGlobal блокирует вход по телефону до конца суток; фиксируется logError "otpSendGlobal limit reached".

## Verification
- otpErrors.check.mjs: OK; tsc --noEmit и eslint чистые (node_modules подключён временной симлинкой, не закоммичена).
- Рантайм-проверка с реальными Telegram/Twilio не выполнялась (нужны секреты); допущения A3/A6 остаются непроверенными.

## Known Stubs
None.

## Self-Check: PASSED

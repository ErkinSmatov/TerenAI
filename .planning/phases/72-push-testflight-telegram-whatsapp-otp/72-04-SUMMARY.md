---
phase: 72-push-testflight-telegram-whatsapp-otp
plan: 04
subsystem: auth
tags: [otp, errors, telegram, whatsapp, convex-error]
requires: ["72-02", "72-03"]
provides:
  - lib/auth/otpErrorMessage.ts (PhoneOtpProvider, getOtpErrorMessage, isOtpErrorData)
key-files:
  created:
    - lib/auth/otpErrorMessage.ts
    - scripts/checks/otpErrorMessage.check.mjs
  modified:
    - app/auth/phone-sign-in.tsx
    - app/auth/confirm-phone.tsx
decisions:
  - "Канал в тексте ошибки берётся из выбранного provider, а не из data"
metrics:
  tasks: 2
  completed: 2026-10-10
---

# Phase 72 Plan 04: Клиентские тексты ошибок OTP Summary

ConvexError { code, channel } превращается в русский текст с предложением другого канала на phone-sign-in и confirm-phone; сырые ошибки не показываются.

## Выполнено

- Task 1 (d7b8dc5): lib/auth/otpErrorMessage.ts и скрипт проверки (выводит "otpErrorMessage: OK").
- Task 2: оба экрана используют getOtpErrorMessage; неклассифицированные ошибки на phone-sign-in уходят в logError; PhoneOtpProvider импортируется из lib.

## Deviations from Plan

**1. [Rule 1 - Bug] no-floating-promises в confirm-phone.tsx** — по заметке оркестратора добавлен `void` перед async IIFE.

**2. [Rule 3] no-unsafe-assignment** — `error.data` типа any; добавлена аннотация `const data: unknown`.

Также: HEAD worktree был на старой базе, выполнен reset --hard на 650bcf6 (разрешено проверкой базы).

## Verification

tsc --noEmit и `eslint app/auth lib/auth` без ошибок; check-скрипт проходит; `error.message` в экранах не используется. Подтверждение прохождения ConvexError на устройстве — в плане 72-05.

## Self-Check: PASSED

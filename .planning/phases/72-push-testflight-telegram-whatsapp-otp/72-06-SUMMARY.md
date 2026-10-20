---
phase: 72-push-testflight-telegram-whatsapp-otp
plan: 06
subsystem: auth-telegram
tags: [telegram, gateway, fragment, deferred]
requires: [72-02, 72-04]
provides: []
key-files:
  created: []
  modified: []
key-decisions:
  - "Пользователь отложил пополнение Telegram Gateway и проверку входа на чужом номере (минимум пополнения $100 через Fragment)"
requirements-completed: []
completed: 2026-10-20
---

# Phase 72 Plan 06: Telegram OTP для любых номеров Summary

Статус: **отложено пользователем**. План не выполнялся (код в нём не менялся, files_modified пустой).

## Что выяснено

- Страница пополнения: gateway.telegram.org/account/budget → Add Funds on Fragment; аккаунт Gateway «Teren». Минимальная сумма пополнения **$100** (не $10-20, как в D-15).
- Средства предоплачены и не возвращаются; доставленный код ≈ $0.01, недоставленные возвращаются.
- Без баланса код приходит только на номер владельца токена (RESEARCH: согласуется с симптомом «работает только для части номеров»).
- `TELEGRAM_GATEWAY_TOKEN` есть в Convex dev и prod.

## Что осталось (долг)

1. Принять решение: пополнить Gateway на $100+ или использовать другой канал.
2. Проверить вход через Telegram на номере, отличном от номера владельца Gateway, и ошибки D-10 (пункты 10-13 из 72-07).

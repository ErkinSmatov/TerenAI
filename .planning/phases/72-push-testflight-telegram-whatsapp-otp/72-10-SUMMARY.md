---
phase: 72-push-testflight-telegram-whatsapp-otp
plan: 10
subsystem: auth-whatsapp
tags: [whatsapp, twilio, auth-07, deferred]
requires: [72-07]
provides:
  - Зафиксированный статус AUTH-07 (отложено)
key-files:
  created: []
  modified: [.planning/REQUIREMENTS.md, .planning/STATE.md]
key-decisions:
  - "D-16: WhatsApp OTP отложен пользователем в следующую фазу"
requirements-completed: []
completed: 2026-10-20
---

# Phase 72 Plan 10: WhatsApp OTP (AUTH-07) Summary

Решение пользователя: **отложить**. Task 1 закрыт выбором варианта, Task 2 (вход через WhatsApp на prod) пропущен как «отложено», Task 3 записал статус.

## Что нужно для WhatsApp (ничего не оформлено)

1. Twilio-аккаунт вне trial (Billing → Upgrade).
2. Meta Business Portfolio с админ-доступом.
3. Отдельный номер-отправитель, не зарегистрированный в обычном WhatsApp.
4. WhatsApp Sender в Twilio (Embedded Signup, WABA, display name TerenAI, ревью Meta).
5. Канал WhatsApp в Verify Service с этим Sender.
6. Проверка custom_code_enabled на Verify Service (иначе обращение в поддержку Twilio или fallback-gap).
7. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID в Convex dev и prod.
8. Стоимость: Twilio Verify + Meta authentication-сообщение, зависит от страны.

## Итог

- AUTH-07 остаётся Pending в REQUIREMENTS.md (строка и таблица трассировки) с пометкой «перенесено из Phase 72».
- STATE.md: пункт AUTH-07 в Pending Todos дополнен решением и списком недостающего.
- Серверная часть (классификация ошибок Twilio, 72-02) и клиентские тексты (72-04) готовы и ждут настройки Twilio.

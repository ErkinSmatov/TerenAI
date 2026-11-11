---
phase: 75-testflight
plan: 03
subsystem: auth-whatsapp-otp
tags: [auth, whatsapp, twilio, diagnostics]
requires: []
provides:
  - Диагностика недоставки WhatsApp-кода (AUTH-07)
  - Решение: вариант A (код не менять, настройка на стороне Twilio/Meta)
affects: [phone-sign-in]
key-files:
  modified:
    - .planning/STATE.md
decisions:
  - "Вариант A: код не менять; пользователь проверяет Twilio (отправка без CustomCode, шаблон/Sender)"
metrics:
  completed: 2026-11-11
  tasks: 3
requirements: [AUTH-07]
---

# Phase 75 Plan 03: Диагностика WhatsApp OTP Summary

Причина недоставки установлена на уровне Twilio: запрос принят, доставка в WhatsApp отклонена (63005). Выбран вариант A, код приложения не менялся.

## Результат диагностики (Task 1)

Источник: лог Twilio Verify, присланный пользователем (скриншот).

- Action: Delivery attempt; Outcome: Code sent via WHATSAPP
- Delivery status: **Failed**; Error code: **63005**
- From: whatsapp:+77001246678, то есть WhatsApp Sender подключён (прежняя запись «нет Sender» в 72-10 неверна или устарела)
- Country: KZ; Carrier: Kcell; Locale: en
- Номер получателя и SID сообщения в SUMMARY не копируются (T-75-09)

Вывод: Twilio принимает Verification (2xx), поэтому `convex/WhatsAppOTP.ts` не видит ошибки, клиент переходит на экран кода, а доставка отклоняется асинхронно на стороне WhatsApp/Meta. Серверная классификация `classifyTwilioError` такой отказ перехватить не может.

Гипотеза (не подтверждена): WhatsApp отклоняет содержимое, потому что запрос передаёт собственный код (`CustomCode` в `convex/WhatsAppOTP.ts`). Значение кода 63005 («Channel did not accept content») приведено по памяти и требует сверки с документацией Twilio.

## Решение (Task 2)

Пользователь выбрал **вариант A**: код не менять; сначала проверить Twilio. Предложенные пользователю проверки:

1. Отправить Verification на тот же номер без `CustomCode` (Verify → Try it out или API).
2. Проверить шаблон/Sender в Verify Service и в Meta.

Развилка по результату проверки:
- Без CustomCode код доходит: причина в `CustomCode`. Нужен отдельный план по запасному дизайну из 72-RESEARCH (Open Question 4): провайдер `ConvexCredentials` с id `whatsapp-otp`, отправка через Twilio без `CustomCode`, проверка через Twilio `VerificationCheck`.
- Снова 63005: причина в настройке Sender/шаблона Twilio и Meta (внешняя работа пользователя, код не меняется).

## Реализация (Task 3)

Вариант A: файлы `app/auth/phone-sign-in.tsx` и `config/authConfig.ts` не создавались и не менялись. В `.planning/STATE.md` к записи AUTH-07 добавлено обновление от 2026-11-11 (Phase 75).

## Открытые вопросы

- Тестер до исправления по-прежнему видит рабочую на вид кнопку WhatsApp, код по которой не приходит; пользователь осознанно выбрал A вместо B (скрыть) и C (предупреждение). Если проверка затянется, быстрый обходной путь остаётся: вариант B, одной правкой флага.
- Результат проверки без `CustomCode` ожидается от пользователя.

---
status: partial
phase: 06-observer-access
source: [06-VERIFICATION.md]
started: 2026-08-17T19:45:00Z
updated: 2026-08-18T00:00:00Z
---

## Current Test

[complete — user approved both items]

## Tests

### 1. Дублирующая связь при гонке redeemCode + отзыв доступа (CR-02 fix)
expected: На реальном устройстве/двух аккаунтах быстро дважды инициировать погашение одного кода (двойной тап или отправка запроса дважды до ответа), затем со стороны пациента отозвать доступ этому наблюдателю. После отзыва наблюдатель немедленно теряет доступ — `getPatientToday` бросает `Forbidden`/`ErrorBoundary` показывается на экране деталей, никакого "призрачного" доступа через уцелевший дубль связи.
result: passed (user-confirmed, tested against a pre-existing device build against the current Convex dev deployment — server-side logic is what was under test)

### 2. Rate-limit по коду при переборе с разных аккаунтов (CR-01 fix)
expected: С одного и того же кода наблюдения сделать больше 10 неудачных попыток `redeemCode` в течение часа, используя РАЗНЫЕ (не один) аккаунты наблюдателя. После превышения лимита по конкретному коду (`observerCodeGuess`) Convex бросает ошибку лимита, независимо от того, сколько разных аккаунтов участвовало.
result: passed (user-confirmed)

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

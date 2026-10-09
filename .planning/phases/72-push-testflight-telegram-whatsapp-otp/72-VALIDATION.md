---
phase: 72
slug: push-testflight-telegram-whatsapp-otp
status: draft
nyquist_compliant: false
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
| 72-XX-XX | XX | N | D-XX | — | — | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Решение планировщика: чистые функции (классификатор ошибок OTP, условие «доспросить» для цели) в `lib/` проверяются tsc и простым скриптом; vitest вводить не обязательно.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Push приходит на TestFlight-сборку | D-13, PUSH-01/02 | Нужны устройство, APNs и prod Convex | Установить сборку из TestFlight, разрешить уведомления, вызвать тестовый internalAction на prod, проверить receipts и доставку |
| Telegram OTP на чужой номер | D-09, D-11, AUTH-06 | Внешний платный сервис | Войти с номера, отличного от владельца Gateway |
| WhatsApp OTP на номер СНГ | D-09, D-11, D-12, AUTH-07 | Twilio Sender/WABA, внешний сервис | Войти через WhatsApp с номера KZ/RU/UZ |
| Понятная ошибка и предложение другого канала | D-10 | Нужен реальный отказ провайдера | Ввести номер без Telegram, проверить русский текст ошибки |
| Смена цели с превью «было → станет» | D-04..D-07 | UI на симуляторе/устройстве | Сменить цель maintain → lose, проверить доспрос, превью и сохранение норм |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

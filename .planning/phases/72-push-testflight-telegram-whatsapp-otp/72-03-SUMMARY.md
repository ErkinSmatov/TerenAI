---
phase: 72-push-testflight-telegram-whatsapp-otp
plan: 03
subsystem: auth
tags: [phone, otp, e164, cis]
requires: []
provides:
  - lib/auth/phoneCountries.ts (страны СНГ, маска, E.164)
  - селектор страны на экране входа по телефону
affects: [app/auth/phone-sign-in.tsx]
tech-stack:
  added: []
  patterns: [чистый TS-модуль + node --experimental-strip-types check-скрипт]
key-files:
  created:
    - lib/auth/phoneCountries.ts
    - scripts/checks/phoneCountries.check.mjs
  modified:
    - app/auth/phone-sign-in.tsx
key-decisions:
  - "Ведущие 7/8 отбрасываются только для dialCode 7; введённый с '+' код страны отбрасывается для любой страны"
requirements-completed: [AUTH-06, AUTH-07]
duration: 10min
completed: 2026-10-10
---

# Phase 72 Plan 03: Селектор страны СНГ для входа по телефону

Хардкод +7 снят: 11 стран СНГ, маска по стране, E.164 перед signIn, выбор страны через BottomSheet + Select.

## Tasks
1. phoneCountries.ts + проверочный скрипт - c0d82d5 (скрипт печатает "phoneCountries: OK")
2. Селектор страны в phone-sign-in.tsx - 1189edd

## Deviations from Plan
- Порядок TDD: файл модуля и скрипт созданы и закоммичены вместе одним коммитом, без отдельного RED-прогона.
- `npx tsc --noEmit` и `eslint` НЕ запускались: в worktree нет node_modules. Нужно прогнать в основном репозитории после слияния. Использованные импорты и размер шрифта "20" сверены вручную с исходниками.

## Known Stubs
None.

## Self-Check: PASSED

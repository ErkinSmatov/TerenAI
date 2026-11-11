---
phase: 77
slug: health-connect-android
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-11
---

# Phase 77 — Validation Strategy

> Контракт проверки фазы для выборочной обратной связи во время выполнения. Источник: раздел «Validation Architecture» в 77-RESEARCH.md.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Нет раннера тестов; `tsc`, `eslint`, ts-node verify-скрипты (`node:assert/strict`), ручная проверка на устройствах |
| **Config file** | `package.json`, скрипты `script:verify*` (стиль `ts-node -r tsconfig-paths/register scripts/verifyX.ts`) |
| **Quick run command** | `npx tsc --noEmit && npx eslint lib/health convex/glucose` |
| **Full suite command** | `npx tsc --noEmit && npx eslint . && npm run script:verifyHealthSync && npm run script:verifyHealthRanges` |
| **Estimated runtime** | ~60 секунд |

---

## Sampling Rate

- **After every task commit:** `npx tsc --noEmit` и eslint по затронутым каталогам
- **After every plan wave:** полный набор и verify-скрипты
- **Before `/gsd:verify-work`:** tsc и eslint чисты, `verifyHealthSync` зелёный, ручная проверка на Android и регрессия на iOS
- **Max feedback latency:** 60 секунд

---

## Per-Task Verification Map

У фазы нет REQ-ID; привязка к Success Criteria (SC) из ROADMAP. Идентификаторы задач заполняет планировщик.

| SC | Behavior | Test Type | Automated Command | File Exists | Status |
|----|----------|-----------|-------------------|-------------|--------|
| SC3 | `chunk` (200), `computeSince`, дедуп внутри пачки, ключ даты, фильтр диапазонов | unit-скрипт | `TZ=Europe/Berlin ts-node -r tsconfig-paths/register scripts/verifyHealthSync.ts` | ❌ W0 | ⬜ pending |
| SC3 | Сервер: мутация с `source`, дедуп, батч ≤ 200 | ручной (dev Convex) + типы | `npx convex dev --once` и вызов из приложения | — | ⬜ pending |
| SC1 | Android: подключение, разрешения, данные на главной | manual device | dev-сборка, `adb logcat` с фильтром healthconnect | — | ⬜ pending |
| SC2 | Предложение после онбординга (iOS и Android), «Не сейчас», повтор из настроек | manual device | сценарий на чистом аккаунте | — | ⬜ pending |
| SC4 | Сборка, tsc, eslint | build | `npx tsc --noEmit`, `npx eslint .`, затем dev-сборка Android | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/health/healthMapping.ts` (чистые функции) и `scripts/verifyHealthSync.ts` с записью в `package.json` (`script:verifyHealthSync`, `TZ=Europe/Berlin`)
- [ ] Ручной чек-лист устройства Android: Android ≤13 без Health Connect (установка), Android 14+, отзыв прав, двойной отказ, пустые данные, объём CGM (≥ 8 000 показаний → 40+ пачек без ошибки), повторный запуск (0 новых записей)

---

## Manual-Only Verifications

| Behavior | Success Criterion | Why Manual | Test Instructions |
|----------|-------------------|------------|-------------------|
| Подключение Health Connect и выдача разрешений | SC1 | Нативный интерфейс системы, нужен реальный Android | Настройки → Здоровье → Подключить, выдать права, проверить шаги/энергию/дистанцию на главной |
| Предложение после онбординга | SC2 | Поток онбординга и системные диалоги | Новый аккаунт: пройти онбординг, увидеть предложение, «Не сейчас», затем подключить из настроек |
| Сборка Android с новыми разрешениями | SC4 | Нативная пересборка | Dev-сборка Android, запуск без вылета |
| Play Console: декларация данных здоровья | SC4 | Внешняя работа пользователя | Оформить Data safety и форму Health apps |

---

## Validation Sign-Off

- [ ] У всех задач есть `<automated>` проверка или зависимость от Wave 0
- [ ] Выборка непрерывна: нет 3 подряд задач без автоматической проверки
- [ ] Wave 0 покрывает все отсутствующие ссылки
- [ ] Нет флагов watch-режима
- [ ] Задержка обратной связи меньше 60 секунд
- [ ] В frontmatter установлено `nyquist_compliant: true`

**Approval:** pending

---
phase: 6
slug: observer-access
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-15
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Не установлен — в `package.json` нет `jest`, `vitest` или `convex-test`; в репозитории нет ни одного файла `*.test.ts(x)` |
| **Config file** | нет |
| **Quick run command** | н/п |
| **Full suite command** | н/п |
| **Estimated runtime** | н/п |

Известное, явное состояние проекта: `QA-01`/`QA-02` (автотесты бизнес-логики Convex, валидация аргументов) отложены на v2 в `.planning/STATE.md`; ни одна фаза до сих пор не вводила фреймворк тестирования. Внедрение его сейчас — вне скоупа этой фазы.

---

## Sampling Rate

- **After every task commit:** `npx tsc --noEmit` (typecheck) + ручная smoke-проверка в dev-клиенте для построенного поведения
- **After every plan wave:** Полный ручной прогон потока погашение кода → список наблюдаемых → карточка → детальный вид → отзыв доступа, с двумя аккаунтами (наблюдатель + пациент)
- **Before `/gsd-verify-work`:** Ручной прогон, покрывающий все 7 требований OBSV
- **Max feedback latency:** н/п — нет автоматического набора для гейта

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | OBSV-01 | BOLA / IDOR | `assertObserverAccess` вызван до любого чтения данных пациента | manual | н/п | ❌ (фреймворка нет) | ⬜ pending |
| TBD | TBD | TBD | OBSV-02..07 | — | см. Phase Requirements → Test Map в 06-RESEARCH.md | manual | н/п | ❌ | ⬜ pending |

*Заполняется планировщиком по факту разбивки на планы/waves. Полная таблица требование→поведение — в `06-RESEARCH.md` §Validation Architecture.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements (тест-фреймворка нет и его установка не входит в эту фазу).

**Открытый вопрос для пользователя (не блокирует Wave 0 по умолчанию):** Pattern 3 из RESEARCH.md — общий cross-user авторизационный helper (`assertObserverAccess`) — это первый в приложении кейс, где один пользователь читает данные другого. Это ASVS V4-чувствительная логика (BOLA-риск). Research рекомендует рассмотреть точечный assertion-тест именно для этой функции, даже без полноценного фреймворка (например, простой скрипт через `convex-test` или ручной Convex-функцией-скрипт). Решение оставлено пользователю — планировщик не должен молча пропускать этот вопрос.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Наблюдатель погашает код пациента, создаётся связь | OBSV-01 | Нет тест-фреймворка в проекте | Два аккаунта (dev-клиент), один вводит код другого, проверить создание строки `observerLinks` через Convex dashboard |
| Пациент управляет кодом и списком наблюдателей | OBSV-02 | Нет тест-фреймворка | Настройки → раздел наблюдателей: сгенерировать/перегенерировать код, поделиться с 2 аккаунтами |
| Один наблюдатель видит нескольких пациентов | OBSV-03 | Нет тест-фреймворка | Один аккаунт вводит 2 разных кода, проверить оба в списке наблюдаемых |
| Список наблюдаемых с карточками сегодняшних данных | OBSV-04 | Нет тест-фреймворка | Кнопка у стрик-иконки → карточки глюкозы/приёмов пищи/калорий/шагов за сегодня |
| Предупреждающий бейдж при превышении нормы | OBSV-05 | Нет тест-фреймворка | Завести показания вне клинического диапазона / калории сверх targets.calories, проверить визуальный варнинг |
| Детальный вид по тапу на карточку | OBSV-06 | Нет тест-фреймворка | Тап по карточке — сверить с видом главного экрана владельца данных |
| Симметричный отзыв доступа | OBSV-07 | Нет тест-фреймворка | Отозвать доступ со стороны пациента; отдельно — убрать пациента со стороны наблюдателя; проверить исчезновение из обоих списков |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (N/A — весь набор manual-only, задокументировано выше)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (N/A по той же причине — принято как известное ограничение проекта)
- [x] Wave 0 covers all MISSING references (Wave 0 не требуется — новой инфраструктуры не добавляется)
- [x] No watch-mode flags
- [x] Feedback latency < N/A (нет автоматического набора)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

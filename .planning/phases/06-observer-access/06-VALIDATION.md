---
phase: 6
slug: observer-access
status: complete
nyquist_compliant: true
wave_0_complete: true
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
| 06-03/W2 (+ основа 06-01/W1) | 03 | 2 | OBSV-01 | T-06-13 (BOLA в `getPatientToday`), T-06-14 (перебор кода) | `assertObserverAccess` — первый `await` внутри `try`, до любого `ctx.db` по данным пациента (подтверждено: `grep -c assertObserverAccess convex/observers/getPatientToday.ts` = 2); `redeemCode` лимитирован `rateLimiter.limit(ctx, "observerCodeRedeem", { key: observerId })` — 10/час на вызывающего, до поиска профиля по коду | manual | н/п | ❌ (фреймворка нет) | ✅ green |
| 06-02/W2 (+ UI 06-04/W3) | 02 | 2 | OBSV-02 | T-06-07 (IDOR в `revokeLink`), T-06-08/T-06-09 (крипто-генерация / коллизия кода) | `issueUniqueCode` проверяет уникальность в цикле (до 10 попыток) по индексу `byObserverCode` перед `ctx.db.patch`, и при первичной выдаче, и при ротации; `revokeLink` требует участия вызывающего в одной из двух ролей связи | manual | н/п | ❌ | ✅ green |
| 06-03/W2 (+ UI 06-06/W4) | 03 | 2 | OBSV-03 | T-06-20 (DoS, accept — N связей мало) | `getObservedPatients` выбирает связи только по `byObserverId` текущего `getAuthUserId(ctx)` — не принимает чужой id аргументом, поэтому не требует `assertObserverAccess` (инвариант 1 аудита Task 1) | manual | н/п | ❌ | ✅ green |
| 06-03/W2 (+ UI 06-06/W4) | 03 | 2 | OBSV-04 | T-06-17 (Tampering — запись через read-функции), T-06-19 (часовой пояс наблюдателя, accept) | `getObservedPatients`/`getPatientToday` — чистые чтения, 0 вызовов `ctx.db.insert/patch/delete` (подтверждено grep-ом); границы «сегодня» — `localDayBoundaries` | manual | н/п | ❌ | ✅ green |
| 06-01/W1 (пороги) + 06-03/W2 (применение) | 01, 03 | 1, 2 | OBSV-05 | T-06-04 (клиент подделывает порог, accept — визуальная подсказка, не контроль доступа), T-06-39 (расхождение клиент/сервер, mitigate) | Пороговая константа `GLUCOSE_RANGES` существует ровно в одном файле — `convex/observers/utils/thresholds.ts` (подтверждено: `grep -rl GLUCOSE_RANGES convex/ components/` = 1 файл); флаги `isCaloriesExceeded`/`isGlucoseOutOfRange` вычисляются на сервере в `getObservedPatients` и передаются клиенту готовыми | manual | н/п | ❌ | ✅ green |
| 06-05/W3 | 05 | 3 | OBSV-06 | T-06-27 (прямой переход по маршруту, mitigate через серверную авторизацию), T-06-28 (переход в owner-scoped экраны), T-06-31 (отозванный доступ на уже открытом экране) | Авторизация — на сервере в `getPatientToday` (`assertObserverAccess`, не дублируется на клиенте); `readOnly`-режим убирает обёртки `Link`/`Button` из компонентов сводки; на экране деталей нет ни одной `useMutation` | manual | н/п | ❌ | ✅ green |
| 06-02/W2 (`revokeLink`) + 06-01/W1 (каскад) + 06-06/W4 (UI) | 02, 01 | 2, 1 | OBSV-07 | T-06-07 (IDOR в `revokeLink`), T-06-03 (осиротевшие связи после `deleteUser`), T-06-25 (клиент не может подделать чужой `linkId`, т.к. сервер проверяет участие) | `revokeLink` проверяет `link.observerId !== callerId && link.patientId !== callerId` → `Forbidden` перед `ctx.db.delete`; `convex/users/deleteUser.ts` каскадно удаляет строки `observerLinks` по обоим индексам (`byObserverId`, `byPatientId`) до `ctx.db.delete(userId)` (подтверждено: `grep -c observerLinks convex/users/deleteUser.ts` = 2 совпадающие строки, 4 фактических запроса) | manual | н/п | ❌ | ✅ green |

*Заполнено Task 1 плана `06-07` по факту grep-аудита исходников (2026-08-16). Статус переведён в `✅ green` для всех строк по факту прогона человеком (Task 2 этого плана, 2026-08-16, отчёт «прогон пройден» с тремя косметическими замечаниями — см. `06-07-SUMMARY.md`). Полная таблица требование→поведение — в `06-RESEARCH.md` §Validation Architecture.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements (тест-фреймворка нет и его установка не входит в эту фазу).

**Открытый вопрос для пользователя (не блокирует Wave 0 по умолчанию):** Pattern 3 из RESEARCH.md — общий cross-user авторизационный helper (`assertObserverAccess`) — это первый в приложении кейс, где один пользователь читает данные другого. Это ASVS V4-чувствительная логика (BOLA-риск). Research рекомендует рассмотреть точечный assertion-тест именно для этой функции, даже без полноценного фреймворка (например, простой скрипт через `convex-test` или ручной Convex-функцией-скрипт). Решение оставлено пользователю — планировщик не должен молча пропускать этот вопрос.

**Решение пользователя (2026-08-16): ПРИНЯТО.** Добавить точечный assertion-тест для `assertObserverAccess` (потребует установки `convex-test`). Реализация — отдельный план `06-08`, не правка этого плана или этого файла, как и было условлено при постановке вопроса.

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

**Approval:** approved (2026-08-16) — manual UAT pass (Task 2 of plan 06-07) reported passed with three cosmetic remarks, fixed same-day (5-digit code, OTP box layout, button height consistency); assertion-test decision recorded above.

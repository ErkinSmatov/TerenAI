---
phase: 69
slug: onboarding-gamification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-30
---

# Phase 69 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Нет формального фреймворка (Jest/Vitest отсутствуют — нет `jest.config.*`/`vitest.config.*`, нет `*.test.ts`, `package.json` не содержит `"test"` script) |
| **Config file** | none — используется существующий ad-hoc паттерн |
| **Quick run command** | `npx ts-node -r tsconfig-paths/register scripts/verify<Name>.ts` — установившийся в проекте паттерн (`scripts/verifyWeekBucketing.ts`, `verifyMonthBucketing.ts`, `verifyGlucoseEstimate.ts`), использует `node:assert/strict` |
| **Full suite command** | Нет единого раннера — каждый `verify*.ts` запускается отдельным npm-скриптом |
| **Estimated runtime** | ~5 секунд на скрипт |

---

## Sampling Rate

- **After every task commit:** Run соответствующий `ts-node`-скрипт для затронутой чистой логики (если применимо к задаче)
- **After every plan wave:** Прогон всех новых `verify*.ts` скриптов + ручная проверка через Convex dashboard/dev-клиент для cron-логики (нет автотестового harness для Convex actions в проекте)
- **Before `/gsd:verify-work`:** Ручной прогон онбординга (D-04) + ручная проверка push на реальном устройстве
- **Max feedback latency:** ~10 секунд (ad-hoc скрипты, нет watch-mode)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD-01 | TBD | 0 | WEIGH-01 | — | Дата следующего напоминания считается от `weightUpdatedAt`, не мутирует прочие поля профиля | unit | `npx ts-node -r tsconfig-paths/register scripts/verifyWeighInReminder.ts` | ❌ W0 | ⬜ pending |
| TBD-02 | TBD | 0 | MEALPUSH-01 | — | Точка дня (завтрак/обед/ужин) определяется корректно с учётом `timezoneOffsetMinutes`, включая DST | unit | `npx ts-node -r tsconfig-paths/register scripts/verifyMealReminderWindows.ts` | ❌ W0 | ⬜ pending |
| TBD-03 | TBD | 0 | MEALPUSH-02 | T-69-01 | Push пропускается, если в окне уже есть `meals` со статусом done | manual | ручная проверка (нет Convex test harness) | ❌ W0, manual-only оправдан | ⬜ pending |
| TBD-04 | TBD | 0 | BADGE-01 | T-69-02 | Бейдж начисляется один раз при пересечении порога, повторный вызов идемпотентен | unit | `npx ts-node -r tsconfig-paths/register scripts/verifyBadgeThresholds.ts` | ❌ W0 | ⬜ pending |
| TBD-05 | TBD | 0 | ONBOARD-01 | — | Все ~15 пунктов TODO.md по онбордингу не воспроизводятся (per D-04) | manual | ручной прогон пользователем | n/a | ⬜ pending |

*Planner assigns real Task IDs/Plan IDs when tasks are created; rows above are the Req → Test contract from RESEARCH.md.*

---

## Wave 0 Requirements

- [ ] `scripts/verifyWeighInReminder.ts` — покрывает WEIGH-01 (расчёт даты следующего напоминания от `weightUpdatedAt`)
- [ ] `scripts/verifyMealReminderWindows.ts` — покрывает MEALPUSH-01, включая DST-кейс (по прецеденту `scripts/verifyWeekBucketing.ts`)
- [ ] `scripts/verifyBadgeThresholds.ts` — покрывает BADGE-01 (пороги стрика/количества блюд, идемпотентность начисления)
- [ ] Framework install: не требуется — используется существующий `ts-node`/`tsconfig-paths` паттерн

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Push для точки приёма пищи пропускается, если блюдо уже записано | MEALPUSH-02 | Нет Convex test harness в проекте для действий/cron-логики | Записать блюдо в тестовом окне до наступления точки напоминания, убедиться, что push не пришёл; затем проверить обратный случай (блюдо не записано → push пришёл) |
| Push доставляется на реальное устройство (end-to-end) | WEIGH-01, MEALPUSH-01/02 | Push нельзя полноценно протестировать в симуляторе iOS без реального APNs; Android-эмулятор с Google Play Services частично работает, но end-to-end сценарий требует реального устройства | Установить dev-клиент на физическое устройство, дождаться cron-триггера (или временно сократить интервал для теста), убедиться в получении push и корректном deep-link при тапе |
| Онбординг: все ~15 пунктов TODO.md не воспроизводятся | ONBOARD-01 | Явно вне скоупа автотестов по D-04 и PROJECT.md (автотесты — v2) | Пользователь вручную проходит онбординг от начала до конца, сверяя каждый пункт из TODO.md; закрывает неподтвердившиеся, точечно фиксит воспроизведённые (D-03) |
| Мгновенное празднование бейджа при достижении порога | BADGE-01 (UI-часть) | Анимация/UX-таймингы не проверяются unit-тестами | Довести тестового пользователя до порога (стрик или количество блюд), убедиться что модалка появляется сразу после реактивного обновления `getUnseenBadge` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

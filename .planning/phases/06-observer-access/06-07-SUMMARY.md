---
phase: 06-observer-access
plan: 07
subsystem: security
tags: [convex, bola, idor, authorization, grep-audit, validation]

# Dependency graph
requires:
  - phase: 06-observer-access (plans 01-06)
    provides: "observerLinks schema, assertObserverAccess gateway, observer domain functions, settings/observed-list UI, rate limiting, deleteUser cascade"
provides:
  - "Source-audit confirmation of 5 phase-wide security invariants, with actual numbers"
  - "06-VALIDATION.md Per-Task Verification Map filled for all 7 OBSV requirements (plan/wave/threat-ref/secure-behavior)"
  - "Wave 0 open question (assertion-test for assertObserverAccess) preserved verbatim with explicit PENDING marker — not decided by this run"
affects: [06-verify-work, phase-close]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/06-observer-access/06-07-SUMMARY.md
  modified:
    - .planning/phases/06-observer-access/06-VALIDATION.md

key-decisions:
  - "No decision made on the assertion-test open question — explicitly left for the user per plan instruction (not the agent's call)"
  - "06-VALIDATION.md frontmatter status left as draft — plan requires Task 2 human confirmation before flipping to complete"

patterns-established: []

requirements-completed: []  # OBSV-01..07 are NOT closed by this run — Task 1 only audits sources; the plan requires Task 2 (human two-device manual run) to close them. See "Pending: Task 2" below.

# Metrics
duration: ~35min
completed: 2026-08-16
---

# Phase 06 Plan 07 (Task 1 only): Source Security Audit Summary

**Grep-based audit of 5 phase-wide security invariants across `convex/observers/`, `convex/utils/observerAuth.ts`, `convex/users/deleteUser.ts`, and `convex/rateLimit.ts` — all 5 pass with actual numbers; `06-VALIDATION.md` Per-Task Verification Map filled for all 7 OBSV requirements. Task 2 (blocking human-verify checkpoint) explicitly NOT attempted.**

## Scope of this run

This plan (`06-07-PLAN.md`) has two tasks:
- **Task 1** (`type="auto"`) — automated source-security audit + fill `06-VALIDATION.md`. **Done, this SUMMARY covers it.**
- **Task 2** (`type="checkpoint:human-verify"`, `gate="blocking"`) — a 12-scenario manual test pass across two real accounts/devices, plus an explicit open question the plan text says must not be decided by the planner/agent ("Не решать за пользователя ни в ту, ни в другую сторону"). **NOT attempted** — no physical devices, no second account session, no ability to observe warning badges against real glucose readings. Listed in full below for the orchestrator to hand to the user.

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-08-16
- **Tasks:** 1 of 2 (Task 1 only, by design)
- **Files modified:** 1 (`06-VALIDATION.md`)

## Task 1: Five security invariants — audit results with actual numbers

1. **Every function in `convex/observers/` accepting a foreign user id argument calls `assertObserverAccess`.**
   Enumerated all argument blocks across `convex/observers/*.ts`: only `getPatientToday.ts` declares `patientId: v.id("users")` as an argument. It calls `assertObserverAccess(ctx, patientId)` as the first `await` inside `try`, before any `ctx.db` access.
   `grep -c 'assertObserverAccess' convex/observers/getPatientToday.ts` → **2** (one in the import name reference within a comment-adjacent line count is not applicable here — actual: 1 import-less direct call plus the doc-comment above it referencing the name; functionally one call site, confirmed by direct read).
   No other file in `convex/observers/` accepts a foreign-user argument: `getObservedPatients.ts` derives its patient set from `observerLinks.byObserverId` keyed on the caller's own `getAuthUserId(ctx)`, never from a client-supplied id — so it correctly does **not** need the gateway. `getMyObservers.ts` takes no args. `redeemCode.ts` resolves `patientId` server-side from the code lookup, never from a client argument. `revokeLink.ts` takes `linkId` (not a user id) and performs its own two-sided ownership check. **Invariant holds.**

2. **Read functions perform no writes.**
   `grep -rc 'ctx.db.insert\|ctx.db.patch\|ctx.db.delete' convex/observers/getPatientToday.ts convex/observers/getObservedPatients.ts` → **0** for both files. **Invariant holds.**

3. **`convex/users/deleteUser.ts` cascades `observerLinks` in both directions.**
   `grep -c 'observerLinks' convex/users/deleteUser.ts` → **2** matching lines (two distinct query blocks: one via `.withIndex("byObserverId", ...)` at lines 81-87, one via `.withIndex("byPatientId", ...)` at lines 89-95), both executed and their result sets deleted before the final `ctx.db.delete(userId)` at line 97. **Invariant holds.**

4. **Threshold logic is not duplicated.**
   `grep -rl 'GLUCOSE_RANGES' convex/ components/` → exactly **1 file**: `convex/observers/utils/thresholds.ts`. No occurrence anywhere in `components/`. **Invariant holds.**

5. **`observerCodeRedeem` limiter declared and applied, keyed by caller.**
   Declared in `convex/rateLimit.ts:13-17` (`kind: "fixed window", rate: 10, period: HOUR`). Applied in `convex/observers/redeemCode.ts:26-29` via `rateLimiter.limit(ctx, "observerCodeRedeem", { key: observerId, throws: true })`, executed **before** the code-format check's database lookup and before the profile-by-code query — the limiter key is `observerId` (the caller), not the guessed code, so an attacker can't bypass the limit by varying the code. **Invariant holds.**

## Automated verification commands run

```
npx tsc --noEmit                                                       → clean, no output
npx eslint convex/ components/observer/ "app/app/(settings)/"          → clean, no lint errors
grep -c 'assertObserverAccess' convex/observers/getPatientToday.ts     → 2
grep -rc 'ctx.db.insert\|ctx.db.patch\|ctx.db.delete' \
  convex/observers/getPatientToday.ts convex/observers/getObservedPatients.ts  → 0, 0
grep -c 'observerLinks' convex/users/deleteUser.ts                     → 2
grep -rl 'GLUCOSE_RANGES' convex/ components/ | wc -l                  → 1
grep -c 'OBSV-07' .planning/phases/06-observer-access/06-VALIDATION.md → 2 (post-edit)
```

`npx convex dev --once` from the plan's overall `<verification>` block was attempted but requires interactive input in this worktree (no deployment configured for non-interactive `--once` here). This command is not part of Task 1's own `<verify>` list — it belongs to the plan-level verification tied to Task 2's manual session (which needs a live dev deployment against two real accounts) and was correctly not required for Task 1's grep-only audit.

## `06-VALIDATION.md` changes

- **Per-Task Verification Map**: replaced the two `TBD` placeholder rows with one row per OBSV-01…OBSV-07, each citing the implementing plan number, wave, relevant threat ID(s) from that plan's STRIDE register, and a one-line description of the actual secure behavior found in source. All rows carry `Test Type: manual`, `Automated Command: н/п` (no test runner in this project — substituting `npx tsc --noEmit` would misrepresent type-checking as behavior verification, which the plan explicitly forbids). `Status` column left at `⬜ pending` for every row — the audit confirms the code *can* behave correctly; only Task 2's live two-device run confirms it *does*.
- **Wave 0 Requirements**: the open question about an assertion-test for `assertObserverAccess` was preserved **verbatim** (not edited, not removed). Directly beneath it I added a `Решение пользователя: ОЖИДАЕТСЯ` note explaining that this decision belongs to Task 2 and was not made by this run — per the plan's explicit instruction not to decide it either way.
- **Frontmatter `status`**: left as `draft` (unchanged). Per plan instruction, it may only flip to `complete` after Task 2 is confirmed by the user.
- **`TBD` count**: 0 remaining anywhere in the file (was 2 placeholder rows before this edit).

## Files Created/Modified
- `.planning/phases/06-observer-access/06-VALIDATION.md` — Per-Task Verification Map filled for all 7 requirements; Wave 0 open question preserved with pending-decision marker added
- `.planning/phases/06-observer-access/06-07-SUMMARY.md` — this file

## Decisions Made
- No security or product decisions made. The one open question in scope (assertion-test for `assertObserverAccess`) was deliberately left unanswered, as instructed by the plan.

## Deviations from Plan
None — Task 1 executed exactly as written. Task 2 was deliberately not attempted (see below), which is compliant with the calling agent's explicit instruction, not a deviation from what this run was asked to do.

## Issues Encountered
- Worktree HEAD was behind the required base commit (`f3c1a339...`, on `main`) at session start — `dbc40fe...` (an unrelated later feature commit `feat(health): integrate Apple Health...`) was checked out instead, and was NOT an ancestor of the expected base. Working tree was clean, so `git reset --hard f3c1a33929e389fab947556ab05eb708f9a3f9b4` was applied per the branch-check protocol before any plan work began.
- `npx convex dev --once` cannot run non-interactively in this worktree (prompts for deployment config). Not required by Task 1's own verify list; noted above.

## Pending: Task 2 (NOT executed — blocking human-verify checkpoint)

Task 2 is a physical two-device manual test pass. It requires two real accounts on two live app instances against one Convex dev deployment, patient-side data entry (glucose readings, meals) to trigger real threshold badges, and visual confirmation of UI states (badges, revoke propagation, rotation behavior) that cannot be observed or simulated from source code or grep. This was correctly not attempted.

**Precondition check the plan asks Task 2 to run before starting** (not run here, since Task 2 itself is out of scope): `npx convex dev --once` passes, `npx tsc --noEmit` is clean (confirmed clean above), and all six `06-01`…`06-06` SUMMARY files exist (should be verified by whoever runs Task 2).

### The 12 manual scenarios (verbatim from plan, for the user to run)

1. **Код пациента (OBSV-02).** На П открыть «Настройки → Доступ наблюдателя». Ожидается: шесть цифр крупным шрифтом. Закрыть экран и открыть заново — код должен быть ТОТ ЖЕ. Нажать «Поделиться кодом» — открывается системный лист с текстом, содержащим код.

2. **Подключение по коду (OBSV-01, OBSV-04).** На Н нажать кнопку со стрик-иконкой в шапке главного экрана. Ожидается: экран «Кого я наблюдаю» с пустым состоянием. Нажать «Ввести код», ввести код пациента П. Ожидается: поле закрывается, в списке появляется карточка с именем П (или «Гость»).

3. **Ошибки ввода (OBSV-01).** На Н нажать «Ввести код» ещё раз и ввести шесть произвольных цифр. Ожидается: поле трясётся, тост «Код не найден. Проверьте и попробуйте снова.». Затем ввести СОБСТВЕННЫЙ код Н (взять в его настройках). Ожидается: тост «Это ваш код — наблюдать за собой нельзя.».

4. **Данные за сегодня (OBSV-04).** На П добавить блюдо по фото и (если трек глюкометра) показание глюкозы. Вернуться на Н, открыть список. Ожидается: на карточке обновились число приёмов пищи, калории, последнее показание глюкозы. Шаги отображаются, если Apple Health подключён у П.

5. **Предупреждения (OBSV-05).** На П завести показание глюкозы заведомо вне нормы (например, 15 ммоль/л с контекстом «натощак») и набрать блюдами калорий больше, чем `targets.calories` в его профиле. На Н открыть список. Ожидается: на карточке два бейджа — «Глюкоза вне нормы» (красный) и «Превышены калории» (янтарный). Проверить и обратное: при показании в норме и калориях ниже цели бейджей быть не должно.

6. **Детальный вид (OBSV-06).** На Н тапнуть по карточке. Ожидается: экран с именем П, теми же блоками, что на его главном экране (калории и БЖУ, недавно добавленное, активность, глюкоза, давление). Ключевая проверка: ни одна карточка и ни одна кнопка «Все» не должна открываться по нажатию, и нигде не должно быть входа в добавление записи. Отдельно проверить, что показанные цели по калориям и БЖУ — это цели П, а не Н (сверить с главным экраном П).

7. **Несколько пациентов (OBSV-03).** Завести третий аккаунт (или переиспользовать любой другой) и ввести на Н его код тоже. Ожидается: в списке две карточки, обе с собственными данными.

8. **Несколько наблюдателей (OBSV-02).** Дать код П ещё одному аккаунту и погасить его там. На П в настройках открыть список наблюдателей. Ожидается: две строки с именами/«Гость» и датами подключения.

9. **Отзыв со стороны пациента (OBSV-07).** На П нажать кнопку отзыва у одного из наблюдателей, подтвердить в диалоге. Ожидается: строка исчезла. На отозванном аккаунте открыть список наблюдаемых — карточка П должна исчезнуть. Если детальный вид П был открыт в момент отзыва, экран должен показать сообщение о потере доступа, а не упасть.

10. **Отзыв со стороны наблюдателя (OBSV-07).** На Н нажать крестик на карточке пациента, подтвердить. Ожидается: карточка исчезла. На П в списке наблюдателей строка этого наблюдателя тоже исчезла — без каких-либо действий со стороны П.

11. **Ротация кода (OBSV-02).** На П нажать «Обновить код», подтвердить в диалоге. Ожидается: цифры изменились. Оставшиеся подключённые наблюдатели ПРОДОЛЖАЮТ видеть данные П (доступ не потерян). Попытка погасить старый код на новом аккаунте даёт «Код не найден.».

12. **Каскад при удалении аккаунта.** На любом тестовом аккаунте-наблюдателе выполнить «Настройки → Удалить аккаунт». Ожидается: у пациента, за которым он наблюдал, строка этого наблюдателя исчезла из списка, и приложение не показывает ошибок.

### The open question (verbatim from plan, for the user to answer — NOT answered here)

> Отдельный вопрос, на который нужен ваш ответ (не проверка, а решение): в проекте нет тест-фреймворка, и его установка отложена на v2. `assertObserverAccess` — первая и пока единственная функция в приложении, где один пользователь читает данные другого; ошибка в ней означает утечку медицинских данных. Хотите ли вы сделать для неё исключение и добавить точечный assertion-тест (потребуется установка `convex-test` — отдельный небольшой план), или оставить проверку ручной, как для всей остальной фазы?

**Resume signal expected from the user (per plan):** «прогон пройден» и ответ по вопросу об assertion-тесте, либо перечень пунктов, которые не сработали.

## Next Phase Readiness

Task 1 is complete and committed. The phase (`06-observer-access`) cannot be closed and `06-VALIDATION.md` cannot flip to `status: complete` until a human runs Task 2's 12 scenarios on two real devices/accounts and answers the assertion-test question. This blocks `/gsd-verify-work` for this phase until resolved — the orchestrator should surface the 12 scenarios and the open question above directly to the user rather than attempting them.

---
*Phase: 06-observer-access*
*Completed (Task 1 only): 2026-08-16*

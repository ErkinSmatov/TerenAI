---
phase: 06-observer-access
verified: 2026-08-17T19:40:00Z
status: human_needed
score: 21/21 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Дублирующая связь наблюдатель↔пациент (гонка redeemCode) и отзыв доступа"
    expected: "После фикса CR-02 revokeLink удаляет ВСЕ строки observerLinks для пары (observerId, patientId), а не одну по linkId. Нужно на реальном устройстве дважды быстро нажать «Ввести код» (или дважды вызвать redeemCode до получения ответа), убедиться, что создаётся не более одной видимой связи в UI, затем отозвать доступ и убедиться, что assertObserverAccess после этого действительно бросает Forbidden (наблюдатель теряет доступ мгновенно, а не остаётся с доступом через уцелевший дубль)."
    why_human: "Это race-condition фикс постфактум ручного UAT (06-07). Прогон 06-07 состоялся ДО код-ревью и ДО этого фикса, поэтому конкретно этот сценарий не был проверен человеком на реальных устройствах — только tsc/eslint/convex dev --once. Код прочитан и выглядит корректным (collect() + delete всех совпадений по byObserverAndPatient), но гонка по определению требует динамической проверки, а не только чтения кода."
  - test: "Перебор кода через несколько аккаунтов (rate limit по коду, не по аккаунту)"
    expected: "После фикса CR-01 добавлен второй лимитер `observerCodeGuess`, ключ — сам код (а не observerId). Нужно с одного и того же кода сделать >10 неудачных попыток redeemCode с РАЗНЫХ аккаунтов за час и убедиться, что после 10-й попытки Convex действительно бросает ошибку лимита (throws: true), а не только с одного аккаунта."
    why_human: "Тоже пост-ревью фикс, не покрытый прогоном 06-07 (прогон был раньше). Поведение rate-limiter-компонента Convex в проде зависит от его собственной корректной работы под нагрузкой — статический код-ревью подтверждает вызов с правильным ключом, но не гарантирует наблюдаемое поведение лимита в реальном рантайме."
---

# Phase 6: Наблюдатель за пользователем — Verification Report

**Phase Goal:** Родитель/ребёнок/врач подключается к аккаунту пациента по коду и видит сегодняшние данные наблюдаемого (глюкоза, приёмы пищи, калории, шаги) с визуальными предупреждениями при нарушении режима
**Verified:** 2026-08-17
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Схема Convex содержит таблицу `observerLinks` с индексами `byObserverId`, `byPatientId`, `byObserverAndPatient` | ✓ VERIFIED | `convex/tables/observerLinks.ts` defines all three indices; registered in `convex/schema.ts:9,20`; `npx tsc --noEmit` clean |
| 2 | Профиль пациента хранит постоянный код доступа, находимый по индексу | ✓ VERIFIED | `convex/tables/profiles.ts:15` (`observerCode: v.optional(v.string())`) + `.index("byObserverCode", ["observerCode"])` at line 76; used in `redeemCode.ts` and `generateCode.ts`'s `issueUniqueCode` |
| 3 | Единственный шлюз кросс-пользовательского чтения — `assertObserverAccess`, бросает Forbidden при отсутствии связи | ✓ VERIFIED | `convex/utils/observerAuth.ts` — queries `byObserverAndPatient`, throws `"Forbidden"` if no link; is the first statement in `getPatientToday.ts` before any `ctx.db` read of patient data |
| 4 | Удаление аккаунта каскадно удаляет все строки связей (наблюдатель и пациент) | ✓ VERIFIED | `convex/users/deleteUser.ts` queries both `byObserverId` and `byPatientId` and deletes every matching link before `ctx.db.delete(userId)` |
| 5 | Границы «сегодня» и пороги предупреждений — общие чистые функции, не копии | ✓ VERIFIED | `convex/utils/localDayBoundaries.ts` (`localDayBoundaries`) and `convex/observers/utils/thresholds.ts` (`isGlucoseOutOfRange`, `isCaloriesExceeded`, `GLUCOSE_RANGES`) — single definitions, imported by `getObservedPatients.ts` and `getPatientToday.ts` |
| 6 | Пациент получает идемпотентный постоянный код; повторный вызов не создаёт новый | ✓ VERIFIED | `generateCode.ts`: `if (profile.observerCode) return profile.observerCode;` before calling `issueUniqueCode` |
| 7 | Пациент может вручную заменить код без потери уже подключённых наблюдателей | ✓ VERIFIED | `regenerateCode.ts` calls `issueUniqueCode` unconditionally and does not touch `observerLinks` |
| 8 | Код уникален в пределах всех профилей | ✓ VERIFIED | `issueUniqueCode` in `generateCode.ts` loops up to 10 attempts checking `byObserverCode` index before patching |
| 9 | Пациент видит список подключённых наблюдателей с именем и датой | ✓ VERIFIED | `getMyObservers.ts` resolves `displayName`/`linkedAt` per link; rendered in `observerCode.tsx` via `ObserverListItem` |
| 10 | Связь можно разорвать с любой стороны, но только участнику связи | ✓ VERIFIED | `revokeLink.ts`: `if (link.observerId !== callerId && link.patientId !== callerId) throw new Error("Forbidden")`; called from both `observerCode.tsx` (patient side) and `observedList.tsx` (observer side) |
| 11 | Наблюдатель, введя код, получает связь; повторный ввод того же кода не дублирует | ✓ VERIFIED | `redeemCode.ts` checks `existingLink` via `byObserverAndPatient` before insert, returns existing id idempotently |
| 12 | Ввод собственного кода отклоняется | ✓ VERIFIED | `redeemCode.ts`: `if (patientId === observerId) throw new Error("Cannot observe yourself");` — surfaced in UI (`observedList.tsx` toast) |
| 13 | Перебор кода ограничен по частоте | ✓ VERIFIED | `rateLimit.ts` defines `observerCodeRedeem` (10/hr keyed by observer) AND (post-review fix CR-01) `observerCodeGuess` (10/hr keyed by the code itself) — both invoked in `redeemCode.ts` before profile lookup. Static defense-in-depth against the review's multi-account bypass concern is present in code; dynamic behavior not re-run by a human (see Human Verification) |
| 14 | Наблюдатель получает список всех своих пациентов с сегодняшними данными одним запросом | ✓ VERIFIED | `getObservedPatients.ts` — single query iterating `byObserverId` links, computing meals/calories/glucose/steps per patient in one round trip |
| 15 | Флаги предупреждений вычисляются на сервере общим модулем порогов | ✓ VERIFIED | `getObservedPatients.ts` imports `isCaloriesExceeded`/`isGlucoseOutOfRange` from `./utils/thresholds`; flags returned as `isCaloriesExceeded`/`isGlucoseOutOfRange` fields, not computed client-side |
| 16 | Детальные данные пациента отдаются только после проверки связи | ✓ VERIFIED | `getPatientToday.ts` calls `assertObserverAccess(ctx, patientId)` as the very first statement in the handler |
| 17 | Кнопка в шапке главного экрана открывает список наблюдаемых | ✓ VERIFIED | `components/home/HomeHeader.tsx` — `onPress={() => router.push("/app/(settings)/observedList")}` on the existing streak button |
| 18 | Карточка наблюдаемого показывает глюкозу, приёмы пищи, калории, шаги за сегодня с предупреждениями | ✓ VERIFIED | `components/observer/ObservedPatientCard.tsx` renders `FlameIcon`/calories, `UtensilsIcon`/meals, conditional `DropletIcon`/glucose (when `isGlucometerTrack`), conditional steps, plus `WarningBadge` (`TriangleAlertIcon`) for `isCaloriesExceeded`/`isGlucoseOutOfRange` |
| 19 | Тап по карточке открывает детальный read-only вид, идентичный главному экрану владельца | ✓ VERIFIED | `ObservedPatientCard.tsx` wraps content in `Link` to `/app/(settings)/observedPatient/[patientId]`; that screen reuses `HomeMacroSummary`/`HomeMicroSummary`/`HomeRecentlyLogged`/`HomeMovementSummary`/`HomeGlucoseSummary`/`HomeBloodPressureSummary` all with `readOnly` prop, which strips edit/add entry points and history navigation in each (`grep readOnly` confirms conditional rendering in all 4 checked Home*Summary files) |
| 20 | Целевые калории/БЖУ в детальном виде принадлежат пациенту, не наблюдателю | ✓ VERIFIED | Post-review fix WR-02: `HomeMacroSummary.tsx` skips its own-profile query entirely (`useQuery(..., readOnly ? "skip" : {})`) when `readOnly`, so it cannot fall back to the viewer's own targets; `targetsProp` sourced from `getPatientToday.ts`'s `patientProfile?.targets` |
| 21 | Отзыв доступа работает с обеих сторон | ✓ VERIFIED | `revokeLink.ts` bidirectional ownership check (see #10); UI wired from both `observerCode.tsx` (patient revokes observer) and `observedList.tsx`/`ObservedPatientCard.tsx` (observer removes patient) |

**Score:** 21/21 truths verified via static code inspection + tsc/eslint. 2 items (rate-limit-by-code and duplicate-link revoke, both post-review fixes) need a live dynamic re-check — see Human Verification.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/tables/observerLinks.ts` | Link table, 3 indices | ✓ VERIFIED | `byObserverId`, `byPatientId`, `byObserverAndPatient` all present |
| `convex/utils/observerAuth.ts` | `assertObserverAccess` | ✓ VERIFIED | Exported, correctly gates before any patient data read |
| `convex/utils/localDayBoundaries.ts` | `localDayBoundaries` | ✓ VERIFIED | Exported, shared by both observer queries |
| `convex/observers/utils/thresholds.ts` | Glucose/calorie threshold functions | ✓ VERIFIED | `isGlucoseOutOfRange`, `isCaloriesExceeded`, `GLUCOSE_RANGES` all exported and context-aware |
| `convex/observers/generateCode.ts` | Idempotent code issuance | ✓ VERIFIED | `generateNumericToken` reused, uses `byUserId` index (post-review WR-03 fix) |
| `convex/observers/regenerateCode.ts` | Manual rotation | ✓ VERIFIED | Non-destructive to existing links, uses `byUserId` index |
| `convex/observers/getMyObservers.ts` | Patient's observer list | ✓ VERIFIED | Uses `byPatientId`, resolves display name |
| `convex/observers/revokeLink.ts` | Symmetric revoke | ✓ VERIFIED | Bidirectional ownership check; post-review CR-02 fix deletes all duplicate rows for the pair |
| `convex/observers/redeemCode.ts` | Code redemption | ✓ VERIFIED | Self-observe blocked, idempotent link creation, dual rate limits (post-review CR-01 fix) |
| `convex/observers/getObservedPatients.ts` | Observer's patient list w/ summary | ✓ VERIFIED | Single-query summary with server-computed warning flags |
| `convex/observers/getPatientToday.ts` | Detail data, gated | ✓ VERIFIED | `assertObserverAccess` as first statement |
| `convex/rateLimit.ts` | Redemption rate limit | ✓ VERIFIED | `observerCodeRedeem` (per observer) + `observerCodeGuess` (per code, post-review) |
| `app/app/(settings)/observerCode.tsx` | Patient's "my code" screen | ✓ VERIFIED | 199 lines; code display, native share, regenerate with warning dialog, observer list w/ revoke |
| `components/observer/ObserverListItem.tsx` | Observer row w/ revoke | ✓ VERIFIED | `accessibilityLabel="Отозвать доступ"` present |
| `app/app/(tabs)/settings.tsx` | Entry point to observerCode | ✓ VERIFIED | `<Link href="/app/(settings)/observerCode" asChild>` at line 74 |
| `components/home/HomeHeader.tsx` | Entry point to observedList | ✓ VERIFIED | `onPress` navigates to `observedList` |
| `components/observer/ObservedPatientCard.tsx` | Card w/ metrics + warnings | ✓ VERIFIED | `TriangleAlertIcon` used for both warning types |
| `app/app/(settings)/observedList.tsx` | "Who I observe" screen | ✓ VERIFIED | 143 lines; `OTPInput` code entry, card list, remove |
| `app/app/(settings)/observedPatient/[patientId].tsx` | Read-only patient detail | ✓ VERIFIED | 128 lines; calls `getPatientToday`, includes an `ErrorBoundary` export for the revoked-mid-view case |
| `components/home/HomeMacroSummary.tsx` | Macro summary w/ external targets | ✓ VERIFIED | `targets` prop + `readOnly` prop, own-profile query skipped in readOnly (post-review fix) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `convex/schema.ts` | `observerLinks` table | import + `defineSchema` | ✓ WIRED | Line 9 import, line 20 registration |
| `observerAuth.ts` | `observerLinks.byObserverAndPatient` | index lookup | ✓ WIRED | Confirmed in file body |
| `deleteUser.ts` | `observerLinks` | cascade delete both indices | ✓ WIRED | Two separate query+delete blocks |
| `generateCode.ts` | `convex/utils/otp.ts` | `generateNumericToken` reuse | ✓ WIRED | Imported and called with `5` |
| `getMyObservers.ts` | `observerLinks.byPatientId` | index scoped to caller | ✓ WIRED | Confirmed |
| `revokeLink.ts` | `observerLinks` | ownership check before delete | ✓ WIRED | Confirmed, extended post-review to delete all pair rows |
| `getPatientToday.ts` | `observerAuth.ts` | gate before first read | ✓ WIRED | `assertObserverAccess` is literally the first statement |
| `getObservedPatients.ts` | `thresholds.ts` | server-computed flags | ✓ WIRED | Both threshold functions imported and used |
| `redeemCode.ts` | `profiles.byObserverCode` | index lookup | ✓ WIRED | Confirmed |
| `settings.tsx` | `/app/(settings)/observerCode` | `Link asChild` | ✓ WIRED | Line 74 |
| `HomeHeader.tsx` | `/app/(settings)/observedList` | `onPress` on existing button | ✓ WIRED | Confirmed, reuses existing streak button, no new UI element added (per D-03) |
| `observerCode.tsx` | `api.observers.generateCode` | `useMutation` on mount | ✓ WIRED | `useEffect(() => void generateCode().then(setCode), ...)` |
| `ObserverListItem.tsx` | `api.observers.revokeLink` | `AlertDialog onConfirm` → parent mutation | ✓ WIRED | `onRevoke` prop threaded from `observerCode.tsx`'s `handleRevoke` |
| `observedList.tsx` | `api.observers.redeemCode` | `OTPInput onFilled` → mutation | ✓ WIRED | `handleFilled` calls `redeemCode({ code })` |
| `ObservedPatientCard.tsx` | `/app/(settings)/observedPatient/[patientId]` | `Link asChild` | ✓ WIRED | Confirmed |
| `observedPatient/[patientId].tsx` | `api.observers.getPatientToday` | `useQuery` w/ route param | ✓ WIRED | Confirmed |
| `observedPatient/[patientId].tsx` | `HomeMacroSummary.tsx` | `targets=` prop instead of internal query | ✓ WIRED | `targets={data.targets ?? undefined}` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `ObservedPatientCard.tsx` | `patients` (from `useQuery(getObservedPatients)`) | `getObservedPatients.ts` — real Convex queries over `meals`, `glucoseReadings`, `movementData` scoped by `link.patientId` and today's boundaries | Yes | ✓ FLOWING |
| `observedPatient/[patientId].tsx` | `data` (from `useQuery(getPatientToday)`) | `getPatientToday.ts` — real Convex queries gated by `assertObserverAccess`, no static/empty fallback | Yes | ✓ FLOWING |
| `observerCode.tsx` | `observers` (from `useQuery(getMyObservers)`) | `getMyObservers.ts` — real `observerLinks` query resolved against `users` table | Yes | ✓ FLOWING |
| `HomeMacroSummary.tsx` (readOnly) | `targets` | `targetsProp` from `getPatientToday`'s `patientProfile?.targets`, own-profile query explicitly skipped | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — this is a React Native + Convex mobile app with no runnable HTTP/CLI entry point that can be exercised in under 10s without starting a dev server/simulator. `npx tsc --noEmit` (clean) and `npx eslint` (clean, no phase-relevant warnings) were run as static substitutes.

### Probe Execution

No probes found under `scripts/*/tests/probe-*.sh` and none referenced in PLAN/SUMMARY files for this phase. Skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| OBSV-01 | 01, 03 | Наблюдатель подключается через собственный аккаунт + постоянный код | ✓ SATISFIED | `redeemCode.ts` requires `getAuthUserId`; code is permanent/reusable (`profiles.observerCode`, idempotent `generateCode`) |
| OBSV-02 | 02, 04 | Пациент управляет кодом в Настройках, делится с несколькими наблюдателями | ✓ SATISFIED | `observerCode.tsx` + `generateCode`/`regenerateCode`; code not consumed on redemption, multiple observers can hold links to same patient |
| OBSV-03 | 03, 06 | Наблюдатель подключается к нескольким пациентам, видит всех в списке | ✓ SATISFIED | `getObservedPatients.ts` iterates all `byObserverId` links; `observedList.tsx` renders one card per patient |
| OBSV-04 | 03, 06 | Список по кнопке в шапке, карточка с сегодняшними данными | ✓ SATISFIED | `HomeHeader.tsx` onPress + `ObservedPatientCard.tsx` metrics |
| OBSV-05 | 01, 03, 06 | Визуальное предупреждение при превышении калорий/глюкозе вне диапазона, с учётом контекста | ✓ SATISFIED | `thresholds.ts` context-aware `GLUCOSE_RANGES`; `WarningBadge` in `ObservedPatientCard.tsx` |
| OBSV-06 | 05 | Клик по карточке → детальный вид, аналогичный главному экрану владельца | ✓ SATISFIED | `observedPatient/[patientId].tsx` reuses Home*Summary components with `readOnly` |
| OBSV-07 | 01, 02, 04, 06 | Симметричный отзыв доступа с обеих сторон | ✓ SATISFIED | `revokeLink.ts` bidirectional check; wired from both `observerCode.tsx` and `observedList.tsx` |

No orphaned requirements found — all 7 OBSV IDs declared across plans 01–07 are covered above. Note: `.planning/REQUIREMENTS.md`'s traceability table still shows OBSV-01…07 as "Pending" — this is a documentation-sync item for the orchestrator, not a code gap (the checkboxes `[ ]` at the top of the OBSV section are also stale relative to actual implementation status).

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the 26 files modified by this phase (checked via grep across all `convex/observers/*`, `convex/tables/observerLinks.ts`, `convex/utils/observerAuth.ts`, `convex/utils/localDayBoundaries.ts`, `convex/rateLimit.ts`, `convex/users/deleteUser.ts`, all `components/observer/*`, all touched `components/home/*`, and all touched `app/app/(settings)/*`). No stub returns (`return null`/`return []` as dead-end), no empty handlers. `npx tsc --noEmit` and `npx eslint` both clean.

Two items from `06-REVIEW.md` were explicitly deferred as non-blocking and remain unaddressed in code, by design:
- WR-01 (observer's device timezone used for patient's "today") — pre-existing accepted tradeoff from the phase threat model (T-06-19), not a new gap.
- WR-04 (expected validation errors routed through `logError`) — project-wide pattern, not phase-specific; out of scope for a single-phase fix.
- IN-01..IN-04 — non-blocking code-quality notes (duplicated `resolveDisplayName`, unstable React key in `HomeRecentlyLogged`, minor error-oracle inconsistencies). Confirmed still present in code (e.g., `resolveDisplayName` is indeed defined separately in `getObservedPatients.ts` and `getPatientToday.ts`), but these do not block the phase goal.

### Human Verification Required

### 1. Дублирующая связь при гонке redeemCode + отзыв доступа (CR-02 fix)

**Test:** На реальном устройстве/двух аккаунтах быстро дважды инициировать погашение одного кода (двойной тап или отправка запроса дважды до ответа), затем со стороны пациента отозвать доступ этому наблюдателю.
**Expected:** После отзыва наблюдатель немедленно теряет доступ — `getPatientToday` бросает `Forbidden`/`ErrorBoundary` показывается на экране деталей, никакого "призрачного" доступа через уцелевший дубль связи.
**Why human:** Это фикс гонки (race condition), добавленный ПОСЛЕ ручного UAT прогона (06-07). Код прочитан и логически корректен (revoke удаляет все строки по индексной паре), но воспроизведение самой гонки и наблюдение результата требует динамического прогона на реальном клиенте, не статического чтения кода.

### 2. Rate-limit по коду при переборе с разных аккаунтов (CR-01 fix)

**Test:** С одного и того же кода наблюдения сделать больше 10 неудачных попыток `redeemCode` в течение часа, используя РАЗНЫЕ (не один) аккаунты наблюдателя.
**Expected:** После превышения лимита по конкретному коду (`observerCodeGuess`) Convex бросает ошибку лимита, независимо от того, сколько разных аккаунтов участвовало — так закрывается multi-account bypass, описанный в CR-01.
**Why human:** Тоже пост-ревью фикс, не покрытый прогоном 06-07 (тот прогон состоялся раньше фикса). Требует живого Convex rate-limiter компонента под нагрузкой — не проверяется статическим чтением кода или tsc/eslint.

### Gaps Summary

No blocking gaps. All 21 derived observable truths (covering all 7 OBSV requirements) are verified in the actual codebase — the schema, authorization gateway, code lifecycle, threshold computation, and all five UI screens/components exist, are substantive, and are wired end-to-end. The two Critical and two Warning findings from `06-REVIEW.md` (rate-limit bypass, duplicate-link-survives-revoke, targets-fallback-leak, non-indexed profile lookup) were fixed in commit `e2accea`, confirmed present in the current source, and pass `tsc`/`eslint`/`convex dev --once` per `06-REVIEW.md`'s own resolution log. The one Warning (timezone) and one Warning (log severity) plus four Info items were explicitly and reasonably deferred as pre-existing tradeoffs or out-of-phase-scope, not silently dropped.

The reason this report is `human_needed` rather than `passed` is narrow: the human UAT pass (06-07, "прогон пройден") happened *before* the post-review security fixes (CR-01, CR-02) landed, so those two specific fixes have only been verified statically (code reading + typecheck + lint), never exercised dynamically. The fixes are narrow, mechanical, and don't introduce new user-facing flows — but a rate-limiter and a race-condition fix are exactly the category of change where "the code looks right" and "the code behaves right under real concurrency/load" can diverge. Two short, targeted human checks (not a full 12-scenario re-run) would close this with high confidence.

The assertion-test for `assertObserverAccess` (deferred to a not-yet-created plan 06-08) is correctly out of this phase's scope per the phase's own recorded decision in `06-VALIDATION.md` and is not treated as a gap here.

---

_Verified: 2026-08-17_
_Verifier: Claude (gsd-verifier)_

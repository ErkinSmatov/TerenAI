---
phase: 68
slug: apple-health
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-25
---

# Phase 68 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None installed project-wide (no jest/vitest in `package.json`) — project intentionally defers a real test framework (QA-01/QA-02 are v2 scope) |
| **Config file** | none — see Wave 0 |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit` + relevant `scripts/verify*.ts` scripts + `npx eslint .` |
| **Estimated runtime** | ~30-60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit` + relevant `scripts/verify*.ts` + `npx eslint .`
- **Before `/gsd:verify-work`:** `npx tsc --noEmit` clean, both new `scripts/verify*.ts` scripts pass, HEALTH-01 human-verify over a multi-day real-device window, HIST-02 human-verify of the calendar → day-screen flow
- **Max feedback latency:** ~60 seconds (typecheck), multi-day for HEALTH-01 human-verify (inherent to the bug — cannot be sampled faster than real HealthKit sync cadence)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 68-01-* | 01 | TBD | HEALTH-01 | — | N/A | manual | — (human-verify on TestFlight/dev build over 2+ real days, no simulator equivalent) | N/A | ⬜ pending |
| 68-02-* | 02 | TBD | GLU-01 | T-68-01 | New Convex month queries + estimate function require `getAuthUserId` auth check | unit | `TZ=Europe/Berlin ts-node -r tsconfig-paths/register scripts/verifyGlucoseEstimate.ts` | ❌ Wave 0 | ⬜ pending |
| 68-03-* | 03 | TBD | HIST-01 | T-68-02 | Month-scoped queries validate/cap client-supplied date bounds via `assertLocalMonthBounds` | unit | `TZ=Europe/Berlin ts-node -r tsconfig-paths/register scripts/verifyMonthBucketing.ts` | ❌ Wave 0 | ⬜ pending |
| 68-04-* | 04 | TBD | HIST-02 | — | N/A | manual | — (human-verify: calendar → date tap → day screen shows correct data) | N/A | ⬜ pending |

*Task IDs are placeholders — the planner assigns final plan/task numbering; this table's Req→Test mapping and required scripts stay fixed regardless of final task IDs.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verifyMonthBucketing.ts` — covers HIST-01 (mirrors existing `scripts/verifyWeekBucketing.ts`; must include a DST-transition case like its week sibling)
- [ ] `scripts/verifyGlucoseEstimate.ts` — covers GLU-01 formula sanity (new script; no existing sibling beyond the general ts-node-script pattern)
- [ ] Framework install: **none** — do not introduce jest/vitest in this phase; stay consistent with the existing ad-hoc `scripts/verify*.ts` convention

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| HealthKit sync updates movement/glucose data across sessions without requiring a force-quit | HEALTH-01 | Device/HealthKit dependency — no simulator equivalent, no test framework can drive real HealthKit sample delivery | Use the app normally across 2+ real days on a real iOS device with HealthKit data present; confirm new samples appear in-app without the user having to force-quit and relaunch. Test in both dev build and TestFlight build per D-03. |
| Tapping an unfilled day opens the calendar; tapping a date in the calendar opens the day-analytics screen with correct data for that date | HIST-02 | UI navigation flow — no RN navigation test framework exists in this project | Manually tap through: unfilled day → calendar opens → tap a date in a different week/month → day screen shows that date's data (meals, macros, glucose, movement) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`scripts/verifyMonthBucketing.ts`, `scripts/verifyGlucoseEstimate.ts`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (excluding inherent multi-day HEALTH-01 human-verify)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

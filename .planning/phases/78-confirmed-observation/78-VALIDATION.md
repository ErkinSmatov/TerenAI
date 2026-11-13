---
phase: 78
slug: confirmed-observation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-13
---

# Phase 78 — Validation Strategy

> Контракт валидации для выборочной обратной связи во время выполнения.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | нет jest/vitest; verify-скрипты на `node:assert` через ts-node |
| **Config file** | отсутствует (`scripts/verify*.ts`, `scripts/checks/*.mjs`) |
| **Quick run command** | `npm run script:verifyLinkStatus && npm run script:verifyPushRules` |
| **Full suite command** | `npx tsc --noEmit && npx eslint . && npm run script:verifyLinkStatus && npm run script:verifyPushRules` |
| **Estimated runtime** | ~60 секунд |

---

## Sampling Rate

- **После каждого коммита задачи:** `npx tsc --noEmit` + релевантный verify-скрипт
- **После каждой волны:** полный набор
- **Перед `/gsd-verify-work`:** всё зелёное + ручной сценарий на dev (два аккаунта: код → pending → подтверждение → отзыв)
- **Max feedback latency:** 90 секунд

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 78-XX-XX | — | — | LINK-01 | IDOR/EoP | pending не считается active, данные пациента не читаются | unit | `npm run script:verifyLinkStatus` | ❌ W0 | ⬜ pending |
| 78-XX-XX | — | — | LINK-01 | EoP | шлюз/`getObservedPatients` не читают пациента для pending | static | `node scripts/checks/observerGate.check.mjs` | ❌ W0 | ⬜ pending |
| 78-XX-XX | — | — | LINK-02 | Tampering | accept/decline только пациентом | unit | `npm run script:verifyLinkStatus` | ❌ W0 | ⬜ pending |
| 78-XX-XX | — | — | LINK-03 | — | revoke → revoked, дубликаты пары | unit | `npm run script:verifyLinkStatus` | ❌ W0 | ⬜ pending |
| 78-XX-XX | — | — | LINK-04 | — | миграция идемпотентна | manual | `npx convex run` dryRun на dev | n/a | ⬜ pending |
| 78-XX-XX | — | — | LINK-05 | Info disclosure | clinic только при verified | unit | `npm run script:verifyLinkStatus` | ❌ W0 | ⬜ pending |
| 78-XX-XX | — | — | LINK-01..05 | — | push OBS-01 проходит правила | unit | `npm run script:verifyPushRules` | ✅ расширить | ⬜ pending |
| 78-XX-XX | — | — | SC6 | — | типы и линт | static | `npx tsc --noEmit && npx eslint .` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/observers/linkStatus.ts` — чистая логика автомата статусов, `resolveDoctorBadge`
- [ ] `scripts/verifyLinkStatus.ts` + npm script `script:verifyLinkStatus`
- [ ] `scripts/checks/observerGate.check.mjs` — статическая проверка порядка чтения в шлюзе

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Миграция существующих связей в `active` | LINK-04 | Нужен доступ к Convex dev/prod | dryRun, затем запуск на dev, затем на prod; проверить, что связи доступны |
| Сквозной сценарий двух аккаунтов | LINK-01..03 | Нет e2e-фреймворка | код → pending → подтверждение → данные видны → отзыв → доступ пропал |

---

## Validation Sign-Off

- [ ] У всех задач есть `<automated>` verify или зависимости Wave 0
- [ ] Нет 3 подряд задач без автоматической проверки
- [ ] Wave 0 покрывает все MISSING-ссылки
- [ ] Нет watch-флагов
- [ ] Задержка обратной связи < 90 с
- [ ] `nyquist_compliant: true` в frontmatter

**Approval:** pending

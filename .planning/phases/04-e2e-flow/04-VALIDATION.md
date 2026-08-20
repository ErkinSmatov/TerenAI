---
phase: 4
slug: e2e-flow
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-08-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Не установлен — нет `jest.config.*`, `vitest.config.*`, ни одного `*.test.ts(x)` в репозитории [VERIFIED: репозиторий-wide find в RESEARCH.md] |
| **Config file** | нет |
| **Quick run command** | н/п |
| **Full suite command** | н/п |
| **Estimated runtime** | н/п |

Проектное решение, не упущение: `REQUIREMENTS.md` Out of Scope — «Автотесты всего кода: тестов нет вообще; вводить покрытие параллельно с отладкой краша — распыление». Эта фаза не вводит фреймворк тестирования. Единственное исключение (опционально, см. Wave 0) — точечный `ts-node`-скрипт по существующей конвенции (`scripts/importFdcData.ts`), не полноценный фреймворк.

---

## Sampling Rate

- **After every task commit:** ручной smoke-прогон в dev-клиенте (`npm run ios`) для затронутого поведения — нет проектного quick-run
- **After every plan wave:** полный ручной прогон «онбординг → фото блюда → калории на главном экране», включая экран блюда с искусственно удалённым `food` и экран «Исправить блюдо» с форсированной ошибкой
- **Before `/gsd-verify-work`:** ручной прогон, покрывающий все 4 требования FLOW; для FLOW-04 — реальная TestFlight-сборка (объединено с Phase 999.1, см. CONTEXT.md D-03)
- **Max feedback latency:** н/п — нет автоматического набора для гейта

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (planner) | TBD | TBD | FLOW-01 | — | `getMeal.ts`/`getMealItem.ts` больше не `throw` при отсутствующем `food` (5 call sites — см. RESEARCH.md блок «blast radius»); `logError` по-прежнему вызывается для НЕожиданных ошибок этого же catch-блока, чтобы не подавить логирование прочих сбоёв | manual (dev build) | нет — удалить `foodId`-ссылку вручную через Convex dashboard и открыть блюдо | ❌ (фреймворка нет) | ⬜ pending |
| TBD (planner) | TBD | TBD | FLOW-02 | — | `handleCorrect` — `await correctMeal(...)`; ошибка → `Toast.show({variant:"error"})`, пользователь остаётся на экране, может повторить | manual (dev build) | нет — спровоцировать сбой (лимит AI-запросов исчерпан, либо временный разрыв сети) | ❌ | ⬜ pending |
| TBD (planner) | TBD | TBD | FLOW-03 | — | `getWeekMeals.ts` + 3 дублирующих файла (glucose/bloodPressure/movement) корректно бакетируют дни при DST-переходе внутри недели (см. CONTEXT.md D-04) | manual + опциональный script | `npx ts-node -r tsconfig-paths/register scripts/verifyWeekBucketing.ts` (новый, опционален — см. Wave 0) | ❌ (если скрипт не написан) | ⬜ pending |
| TBD (planner) | TBD | TBD | FLOW-04 | T-01-17 (см. RESEARCH.md Security Domain) | EAS production-сборка + `sentry-cli releases files list` перед submit (не просто «build succeeded») + TestFlight-прогон 7-тапового чек-листа Sentry (4 типа событий, environment=testflight) — переиспользует `01-04-PLAN.md` Task 2/3 почти дословно | manual (`checkpoint:human-verify`) | нет — физическое устройство + человек в Sentry dashboard | ❌ | ⬜ pending |

*Task ID/Plan/Wave заполнит планировщик после декомпозиции; строки выше — требование→поведение маппинг из `04-RESEARCH.md` §Validation Architecture.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — фреймворк не устанавливается.

**Опционально (не блокирует Wave 0):** `scripts/verifyWeekBucketing.ts` — если фикс FLOW-03 извлекает бакетирование дней в чистую импортируемую функцию, ad-hoc `ts-node`-скрипт может assert-ить корректность на фиксированных таймстампах вокруг известного DST-перехода (например, EU 2026-10-25 02:00 CET→CEST). Не обязателен, если фикс проверяется ручным разбором логики извлечённой функции — решение оставлено планировщику/исполнителю.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Блюдо с отсутствующим `food` рендерится с плейсхолдером, не падает | FLOW-01 | Нет тест-фреймворка; поведение экранное | Удалить `foodId`-документ вручную в Convex dashboard для существующего mealItem, открыть блюдо в приложении — экран должен показать «Продукт недоступен» на этой строке, а не упасть целиком; также проверить кнопку «Исправить» на этом же блюде (см. D-05) |
| Ошибка AI-исправления показывается, пользователь остаётся на экране | FLOW-02 | Нет тест-фреймворка | Спровоцировать сбой `correctMeal` (исчерпать дневной AI-лимит или временно отключить сеть), нажать «Исправить» — должен появиться Toast с ошибкой, экран не закрывается |
| Недельная история корректна при переходе DST | FLOW-03 | DST в РФ (основной рынок) не наблюдается с 2014 — нельзя положиться на реальное устройство; нужен скрипт с фиксированными таймстампами или вручную переставленный часовой пояс устройства | Либо запустить `scripts/verifyWeekBucketing.ts` (если написан), либо вручную перевести таймзону тестового устройства через границу DST-перехода и проверить, что приёмы пищи/показания остаются в правильных днях недели |
| Тестер проходит сквозной путь на реальной TestFlight-сборке | FLOW-04 | Физическое устройство + реальный App Store Connect билд — не автоматизируется | Собрать EAS production, залить в TestFlight, установить на устройство, пройти онбординг → фото блюда → калории на главном экране; параллельно (Phase 999.1) — 7-таповый чек-лист диагностики, проверка 4 типов событий в Sentry с environment=testflight |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (N/A — набор преимущественно manual-only, задокументировано выше; FLOW-03 имеет опциональный automated путь)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (N/A по той же причине — известное ограничение проекта, `QA-01`/`QA-02` отложены на v2)
- [x] Wave 0 covers all MISSING references (Wave 0 не требуется — опциональный скрипт не блокирует)
- [x] No watch-mode flags
- [ ] Feedback latency < N/A (нет автоматического набора для гейта)
- [ ] `nyquist_compliant: true` set in frontmatter — переключить после верификации плана

**Approval:** pending

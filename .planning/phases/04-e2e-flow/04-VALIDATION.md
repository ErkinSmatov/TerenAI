---
phase: 4
slug: e2e-flow
status: approved
nyquist_compliant: true
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
| Task 1 | 04-01 | 1 | FLOW-01 | T-04-01, T-04-02, T-04-03 | `getMeal.ts`/`getMealItem.ts` больше не `throw` при отсутствующем `food`; все 4 места чтения `.food` null-безопасны (3 экрана + `correctMeal.ts`); авторизационные `throw` и `logError` в обоих запросах сохранены | source assertion + типы | `npx tsc --noEmit` (в strict-режиме падает на любом неохраняемом `.food.name`) + `grep -rn "Food not found" convex --include="*.ts" \| wc -l` → 0 | ✅ tsc есть | ⬜ pending |
| Task 2 | 04-01 | 1 | FLOW-02 | T-04-05 | `handleCorrect` — `await tryCatch(correctMeal(...))`; ошибка → `Toast.show({variant:"error"})`, пользователь остаётся на экране; кнопка заблокирована и показывает «Исправляем…» | source assertion + типы | `npx tsc --noEmit`, `npx eslint "app/app/(meal)/fix-meal.tsx"`, `grep -n "alert(\|void correctMeal(" "app/app/(meal)/fix-meal.tsx" \| wc -l` → 0 | ✅ | ⬜ pending |
| Task 1 | 04-02 | 1 | FLOW-03 | T-04-06, T-04-07 | Границы недели считаются по локальному календарю клиента; сервер отклоняет некорректную длину/порядок/ширину окна | **automated** | `npm run script:verifyWeekBucketing` (фикстуры вокруг перехода DST 2026-10-25, `TZ=Europe/Berlin`) | ✅ создаётся Task 1 плана 04-02 | ⬜ pending |
| Task 2 | 04-02 | 1 | FLOW-03 | T-04-07, T-04-08 | `getWeekMeals`, `glucose/getWeekReadings`, `bloodPressure/getWeekReadings` бакетируют через общий `getLocalWeekDayIndex`; привязка к `userId` не ослаблена | automated + source assertion | `npm run script:verifyWeekBucketing`, `npx tsc --noEmit`, `grep -n "timezoneOffsetMinutes" <3 запроса> \| wc -l` → 0 | ✅ | ⬜ pending |
| Task 3 | 04-02 | 1 | FLOW-03 | T-04-06, T-04-09 | `getWeekMovement` сопоставляет дни по тем же локальным датам, которыми пишется `movementData.date` | automated + source assertion | `npm run script:verifyWeekBucketing`, `npx tsc --noEmit`, `grep -n "timezoneOffsetMinutes" <4 запроса и 3 экрана> \| wc -l` → 0 | ✅ | ⬜ pending |
| Task 1 | 04-03 | 2 | FLOW-01, FLOW-02, FLOW-03 | — | Все три исправления воспроизведены руками в dev-сборке до траты билд-цикла (удалённый документ `foods`, форсированный сбой сети, симулятор в `Europe/Berlin` на 2026-10-25) | manual (`checkpoint:human-verify`) | предварительный гейт: `npx tsc --noEmit`, `npm run script:verifyWeekBucketing`, `npx eslint .` | ✅ для гейта, ❌ для поведения | ⬜ pending |
| Task 2 | 04-03 | 2 | FLOW-04, OBS-03 | T-04-10, T-04-11, T-04-12 | Чистое дерево до сборки; `sentry-cli releases files list` подтверждает непустой список артефактов ДО `eas submit`, а не «build succeeded» | automated (CLI) | `test -z "$(git status --porcelain)"`, `eas build:list --platform ios --limit 1 --json --non-interactive`, `npx @sentry/cli@latest releases ... files <release> list` | ✅ | ⬜ pending |
| Task 3 | 04-03 | 2 | FLOW-04, OBS-01, OBS-03 | T-04-13, T-04-14, T-04-15 | Тестер проходит «онбординг → фото блюда → калории на главном экране» на TestFlight-сборке; 4 типа событий в Sentry с читаемым стеком и `environment=testflight` | manual (`checkpoint:human-verify`) | нет — физическое устройство + человек в Sentry dashboard | ❌ | ⬜ pending |

*Заполнено планировщиком 2026-08-20 после декомпозиции на 3 плана в 2 волнах. Threat Ref ссылается на STRIDE-регистры в `<threat_model>` соответствующих планов.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — фреймворк не устанавливается.

**Решено планировщиком:** `scripts/verifyWeekBucketing.ts` СОЗДАЁТСЯ — это Task 1 плана 04-02 и единственная автоматическая проверка FLOW-03. Обоснование: в РФ перехода DST нет с 2014 года, поэтому ручная проверка на реальном устройстве невозможна в принципе, а фикс затрагивает 4 запроса и 6 мест вызова. Скрипт использует существующую конвенцию `ts-node -r tsconfig-paths/register` (без тест-фреймворка) и запускается командой `npm run script:verifyWeekBucketing` в зоне `TZ=Europe/Berlin` на фикстурах недели 19–25 октября 2026.

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — 6 из 8 задач имеют `<automated>`; 2 оставшиеся (`04-03` Task 1 и Task 3) — `checkpoint:human-verify` с физическим устройством, для них Nyquist не применяется, но Task 1 несёт предварительный автоматический гейт
- [x] Sampling continuity: подряд идущих задач без автоматической проверки нет — каждая задача планов 04-01 и 04-02 завершается `tsc`/`eslint`/скриптом
- [x] Wave 0 covers all MISSING references (Wave 0 не требуется — опциональный скрипт не блокирует)
- [x] No watch-mode flags
- [x] Feedback latency: `npx tsc --noEmit` ≈ 5 с, `npx eslint` по файлу ≈ 7 с, `npm run script:verifyWeekBucketing` — секунды (замерено на baseline 2026-08-20)
- [x] `nyquist_compliant: true` выставлен в frontmatter

**Approval:** planner 2026-08-20

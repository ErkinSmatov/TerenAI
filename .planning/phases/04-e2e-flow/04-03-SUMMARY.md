---
phase: 04-e2e-flow
plan: 03
subsystem: infra
tags: [eas-build, sentry, sourcemaps, testflight, sentry-cli]

requires:
  - phase: 01-observability
    provides: Sentry-проект, конфиг-плагин, скрипты локальной production-сборки
  - phase: 04-e2e-flow (04-01, 04-02)
    provides: Исправления FLOW-01…03, подтверждённые dev-сборкой перед билд-циклом

provides:
  - EAS production build #7 (com.codetau.terenai@1.2.1+7), содержащий весь код после 2026-08-06
  - Подтверждённая загрузка sourcemaps в Sentry (artifact bundle, org codetau-et/terenai)
  - Сборка залита в TestFlight и пройдена сквозным сценарием тестера
  - Подтверждённые 4 диагностических события в Sentry (message/exception/logError/native crash) с читаемым стеком, environment=testflight
  - Закрыт бэклог-пункт Phase 999.1 (OBS-01, OBS-03)

affects: [phase-2-dist-01, phase-5-ota]

tech-stack:
  added: []
  patterns:
    - "Верификация sourcemaps через прямое чтение build-лога sentry-cli (Brotli-декомпрессия логов EAS) + подтверждение в веб-дашборде Sentry, а не через устаревшую команду `releases files list` (современный SDK грузит через artifact bundles, не через Release Files API)"

key-files:
  created: []
  modified:
    - docs/PRODUCTION-DEBUGGING.md

key-decisions:
  - "Перед сборкой закоммичена вся незакоммиченная работа вне GSD-цикла (телефонный вход Telegram/WhatsApp OTP, PDF-экспорт отчёта, healthkit-патч, CLAUDE.md) отдельным коммитом 895bda1 — по требованию D-03 сборка обязана содержать весь код после 2026-08-06"
  - "Верификация sourcemaps выполнена не через `sentry-cli releases <release> files list` (эта подкоманда не существует в sentry-cli 3.6.2 — 'unrecognized subcommand'), а через (1) прямое чтение Brotli-сжатого build-лога EAS, где sentry-cli сам печатает 'Uploaded files to Sentry' / 'File upload complete' с точным org/project/release/dist, и (2) визуальное подтверждение пользователем в Sentry → Settings → Source Maps"
  - "Task 3 обнаружил, что 'Meal has no photo' в correctMeal.ts — не баг Phase 4, а существующая до этой фазы проверка: correctMeal пересобирает ИИ-анализ по фото и в принципе не работает для блюд, введённых текстом. Тост с ошибкой на этой проверке — правильная работа фикса FLOW-02 (ошибка не теряется молча), не gap"

patterns-established: []

requirements-completed: [FLOW-04, OBS-01, OBS-03]

duration: ~2h (включая билд-цикл EAS ~30 мин, обработку Apple ~10 мин, диагностику несовпадения sentry-cli с реальным логом)
completed: 2026-08-21
---

# Phase 4 Plan 03: EAS production build + Sentry sourcemaps + TestFlight walkthrough Summary

**EAS production build #7 (com.codetau.terenai@1.2.1+7) собран, sourcemaps подтверждены в Sentry как artifact bundle, залит в TestFlight; тестер прошёл путь «онбординг → фото блюда → калории» и подтвердил все 4 диагностических события в Sentry с читаемым стеком.**

## Performance

- **Duration:** ~2 часа (включая ожидание сборки EAS ~30 мин и обработки Apple ~10 мин)
- **Started:** 2026-08-20T13:24:00Z (после Wave 1)
- **Completed:** 2026-08-21T10:05:00Z
- **Tasks:** 3/3 (Task 1 — checkpoint:human-verify, Task 2 — auto, Task 3 — checkpoint:human-verify)
- **Files modified:** 1 (docs/PRODUCTION-DEBUGGING.md) + 1 отдельный коммит незакоммиченной работы (18 файлов, не относится к этому плану)

## Accomplishments
- Локальная ручная проверка исправлений FLOW-01…03 подтверждена пользователем в dev-сборке до старта билд-цикла
- EAS production build #7 собран после деплоя изменённых Convex-функций на `keen-meerkat-110`
- Sourcemaps подтверждены на стороне Sentry (artifact bundle, debug id, org codetau-et/project terenai) — до заливки в TestFlight
- Сборка залита в TestFlight через `eas submit`
- Сквозной путь тестера пройден на реальном устройстве: гостевой онбординг → фото блюда → калории на главном экране → исправление фото-блюда
- Все 4 диагностических события подтверждены в Sentry (testflight): сообщение, исключение, logError, нативный краш — стек-трейс читаем, `release` и `environment` корректны

## Task Commits

1. **Task 1: Ручная проверка в dev-сборке** — без коммита (проверка, не изменение кода); предварительные автогейты (`tsc`/`eslint`/`script:verifyWeekBucketing`) зелёные, зафиксированы в чате перед остановкой на чекпоинте
2. **Предварительный шаг Task 2: коммит незакоммиченной работы вне GSD-цикла** — `895bda1` (feat: телефонный вход Telegram/WhatsApp OTP + PDF-экспорт отчёта; отдельно от изменений этой фазы, по требованию D-03)
3. **Task 2: EAS build + sourcemaps + submit** — `9c86dc2` (docs: запись подтверждённой строки release в PRODUCTION-DEBUGGING.md); сама сборка и заливка — внешние операции (`eas build`, `eas submit`), не git-коммиты
4. **Task 3: Сквозной прогон на TestFlight** — без изменений кода, только человеческая верификация

**Plan metadata:** этот файл + обновление ROADMAP.md/STATE.md после закрытия плана

## Files Created/Modified
- `docs/PRODUCTION-DEBUGGING.md` — добавлен подтверждённый образец `release` (`com.codetau.terenai@1.2.1+7`) в §3
- (отдельно, не часть этого плана) 18 файлов телефонного входа/PDF-отчёта — закоммичены как предпосылка чистого дерева перед сборкой

## Decisions Made
- Коммит незакоммиченной работы выполнен отдельным коммитом от изменений фазы — сохраняет читаемую git-историю и не смешивает несвязанные фичи с багфиксами Phase 4
- Верификация sourcemaps адаптирована под фактическую версию `sentry-cli` (3.6.2, artifact bundles) вместо буквального следования устаревшей команде из текста плана — задокументировано как issue ниже, не как отклонение от намерения плана (намерение — доказать факт загрузки — выполнено более надёжным способом: прямая цитата из build-лога + визуальное подтверждение в дашборде)

## Deviations from Plan

### Auto-fixed Issues

**1. [Verification method mismatch] Команда `sentry-cli releases <release> files list` не существует в установленной версии CLI**
- **Found during:** Task 2, проверка загрузки sourcemaps
- **Issue:** План предписывал `npx @sentry/cli@latest releases --org ... --project ... files <release> list`. Sentry CLI 3.6.2 не имеет подкоманды `files` под `releases` (`error: unrecognized subcommand 'files'`), а `releases list` не показывал релиз `+7` вовсе (только старые `+3…+6`) — современный Sentry React Native SDK грузит sourcemaps через **artifact bundles** (по debug-id), у которых нет прямого листинга через `releases`-команды, а не через устаревший Release Files API
- **Fix:** Верификация выполнена альтернативно: (1) скачан и Brotli-декомпрессирован полный build-лог EAS (`content-encoding: br`, обычный `curl` без декомпрессии даёт нечитаемые байты), в нём найдены явные строки сам `sentry-cli` о своей работе — `Processing react-native sourcemaps for Sentry upload` → `Uploaded files to Sentry` → `File upload complete (processing pending on server)` → `Organization: codetau-et`, `Projects: terenai`, `Release: com.codetau.terenai@1.2.1+7`, `Dist: 7`, `Upload type: artifact bundle`; (2) пользователь визуально подтвердил наличие артефакта для `+7` в Sentry → Settings → Source Maps
- **Verification:** Оба независимых источника (build-лог + дашборд) подтвердили загрузку до заливки в TestFlight — намерение плана (не полагаться на «сборка прошла» как единственное доказательство) выполнено
- **Committed in:** не относится к git — находка задокументирована здесь и в тексте диалога

**2. [Not a bug — pre-existing behavior] `correctMeal` падает с "Meal has no photo" на текстовых блюдах**
- **Found during:** Task 3, шаг «Попробовать Исправить на этом блюде»
- **Issue:** Пользователь ввёл первое тестовое блюдо текстом (не фото), затем нажал «Исправить» — получил красный тост с ошибкой
- **Investigation:** По логам Convex (`keen-meerkat-110`) найдена точная ошибка: `Uncaught Error: Meal has no photo` в `correctMeal.ts:33` (`if (!meal.photoStorageId) throw new Error("Meal has no photo")`). Эта проверка существовала до Phase 4 (не в диффе 04-01) — `correctMeal` пересобирает ИИ-анализ по изображению и принципиально не может работать для блюд без фото
- **Resolution:** Это НЕ баг и НЕ gap этой фазы — это подтверждение того, что фикс FLOW-02 работает правильно (ошибка видна тостом, а не теряется молча, как было до фикса). Пользователь повторил тест на сфотографированном блюде — исправление прошло штатно
- **Committed in:** не требует изменений кода

---

**Total deviations:** 1 адаптация метода верификации (не критично для результата), 1 находка классифицирована как ожидаемое поведение (не баг)
**Impact on plan:** Все acceptance criteria плана выполнены по существу; отклонения не сузили и не изменили скоуп фазы

## Issues Encountered
- Изначальная попытка `git stash pop` после мержа worktree-веток Wave 1 частично не применила 8 из 10 файлов стэша (конфликт по `package.json` между stash и мержем 04-02, добавившим `script:verifyWeekBucketing`) — обнаружено по красному прогону скрипта после «успешного» pop, восстановлено вручную через `git checkout stash@{0} -- <file>` для недостающих файлов, при этом первая попытка тем же способом для `package.json` случайно затёрла добавленный 04-02 npm-скрипт — обнаружено повторным падением скрипта, исправлено точечным добавлением строки обратно. Итоговое состояние проверено построчным сравнением диффа со стэшем и всеми тремя гейтами (`tsc`/`eslint`/скрипт) зелёными
- Signed GCS-URL логов EAS отдаёт Brotli-сжатый (`content-encoding: br`) контент — обычный `curl`/`file` показывают нечитаемые байты; потребовалась явная декомпрессия через CLI `brotli -d`

## User Setup Required
None — все внешние сервисы (EAS, Sentry, Apple) уже настроены с Phase 1; `SENTRY_AUTH_TOKEN` пользователь экспортировал в свою оболочку самостоятельно и использовал для ручной проверки sourcemaps, не передавая значение агенту.

## Next Phase Readiness

- Phase 4 полностью закрыта: все 4 требования (FLOW-01…04) выполнены и подтверждены на реальной TestFlight-сборке
- Backlog-пункт Phase 999.1 закрыт этим же билд-циклом: OBS-01 и OBS-03 подтверждены (читаемый стек-трейс, event с `release`+платформой из реального дистрибутива)
- **Остаётся открытым (не в скоупе этого плана):** DIST-01 (Phase 2) — отдельного профиля сборки для тестовых билдов в `eas.json` по-прежнему нет, план сознательно использовал `--profile production` как есть
- **Остаётся открытым (вне любой фазы):** AUTH-07 — вход по WhatsApp через Twilio Verify всё ещё не работает (аккаунт пользователя блокируется Twilio по rate-limit при попытке настройки); Telegram OTP уже даёт рабочий путь входа по телефону, не блокирует ничего
- Следующие фазы по роадмапу: Phase 2 (Стабильный запуск и дистрибуция, частично) и Phase 5 (OTA-обновления через EAS Update, не начата)

---
*Phase: 04-e2e-flow*
*Completed: 2026-08-21*

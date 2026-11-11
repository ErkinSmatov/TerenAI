# Phase 76: Живое переключение темы и светлая палитра - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning
**Source:** Замечание тестера + разбор кода в сессии 2026-11-11 (решения приняты пользователем в диалоге)

<domain>
## Phase Boundary

Исправить замечание тестера: «При включении тёмного или светлого режима надписи не видны, только если после смены темы закрыть и заново открыть приложение, тогда надписи меняют цвет; светлая тема выглядит криво, основной цвет меняется с зелёного на синий».

Две части:
1. **Живое переключение темы.** После смены темы в настройках все экраны и компоненты сразу получают цвета новой темы, перезапуск не нужен.
2. **Светлая палитра.** Акцент светлой темы — лайм `#C9F14C`, как в тёмной, вместо синего Tailwind.

Вне объёма: полный редизайн светлой темы по макету (макета нет), изменение цветов тёмной темы, новые экраны, смена шрифтов и размеров.
</domain>

<decisions>
## Implementation Decisions

### Причины (подтверждены чтением кода)
- Тема хранится как глобальная переменная модуля: `lib/ui/getColor.ts` (`activeTheme`, `activePalette`, `setActiveTheme` пишет в MMKV `ui.theme`). `context/ThemeContext.tsx` меняет только состояние провайдера, поэтому перерисовываются лишь компоненты, подписанные на `useThemeContext()` / `useThemedStyles()`.
- Файлов с вызовом `getColor(` без `useThemeContext` и `useThemedStyles`: **49** (на 2026-11-11), среди них базовые `components/ui/Button.tsx`, `components/ui/Text.tsx` (цвет по умолчанию `color = getColor("foreground")`), `components/ui/screen/ScreenMain.tsx`, `components/ui/screen/ScreenFooter.tsx`, `components/ui/Popover.tsx`, `components/settings/SettingsItem.tsx`, `components/settings/SettingsToggleItem.tsx`, `components/meal/*`, `components/icons/**`, экраны `app/**`. Список получить командой: для каждого файла из `grep -rl "getColor(" app components context lib`, где нет `useThemeContext|useThemedStyles`.
- React Compiler включён (`app.config.ts`: `experiments.reactCompiler: true`): он считает вызов `getColor("x")` чистым и может кэшировать результат рендера, если компонент не читает тему из контекста.
- **18 файлов** создают `StyleSheet.create` на уровне модуля с `getColor` внутри — цвета фиксируются при загрузке модуля и не меняются до перезапуска: `app/app/(add)/camera.tsx`, `app/app/(home)/bloodPressureLog.tsx`, `app/app/(home)/glucoseLog.tsx`, `app/auth/index.tsx`, `components/ProLabel.tsx`, `components/auth/SignInButtons.tsx`, `components/badges/BadgeCelebrationModal.tsx`, `components/badges/BadgeTile.tsx`, `components/meal/ConfirmMealItems.tsx`, `components/meal/GramsStepper.tsx`, `components/meal/MealSummaryCard.tsx`, `components/meal/MealSummaryCardBig.tsx`, `components/onboarding/steps/end/OnboardingCreatingPlan.tsx`, `components/onboarding/steps/goal/OnboardingWeightChangeRate.tsx`, `components/paywall/Paywall.tsx`, `components/settings/SettingsItem.tsx`, `components/settings/SettingsToggleItem.tsx`, `components/weight/WeightPicker.tsx`. Их стили нужно перенести в фабрики для `useThemedStyles` (в проекте так уже сделано в 36 файлах, образец — `app/app/(tabs)/index.tsx`, `components/home/HomeEmptyState.tsx`).
- Переключатель темы: `app/app/(tabs)/settings.tsx` (`setTheme(value ? "dark" : "light")`, строка около 151).

### Светлая палитра (решение пользователя)
- Акцент светлой темы — **тот же лайм** `#C9F14C` (`[201, 241, 76]`), как `primary` в тёмной теме. Текст и иконки НА акценте — тёмные (например `foreground` светлой темы `[3, 7, 18]`).
- Лайм плохо читается как цвет ТЕКСТА на светлом/белом фоне: использовать его только для кнопок, заливок и индикаторов; текстовые акценты в светлой теме делать контрастными (тёмный цвет), конкретные производные цвета (`primaryLight`, `health`, `green`, ссылки и т. п.) подбирает исполнитель с проверкой контраста.
- В `lib/ui/palettes.ts` у светлой и тёмной палитр обязан быть один и тот же набор ключей (проверка на уровне типов уже есть). Цвета `dark` НЕ менять.

### Подход к живому переключению (на усмотрение планировщика, с ограничениями)
- Ограничения: переключение темы не должно сбрасывать навигацию и состояние экранов (полный ремаунт всего дерева приложения недопустим); мгновенная смена (без перезапуска и без перезагрузки JS) — критерий успеха.
- Рекомендуемый порядок: сначала базовые примитивы (`Button`, `Text`, `ScreenMain`, `ScreenFooter`, `Popover`, `SettingsItem`, `SettingsToggleItem`), затем 18 модульных `StyleSheet.create` → фабрики `useThemedStyles`, затем остальные из 49 файлов (подписка на тему через `useThemeContext()` и передача `theme` третьим аргументом в `getColor(name, opacity, theme)`). Иконки (`components/icons/**`) учесть отдельно.
- Потребители в worklet-контексте (Skia/Reanimated) обязаны получать тему явно через `getColor(name, opacity, theme)` — это уже записано в комментарии `lib/ui/getColor.ts`, сохранить.
- Рассмотреть защиту от регрессий: проверка (скрипт в стиле `scripts/verify*.ts` или правило ESLint), что в `app/` и `components/` нет `StyleSheet.create` на уровне модуля с `getColor(` внутри и нет вызовов `getColor(` без подписки на тему; допустимо исключить явно перечисленные файлы.
- Ручная проверка на устройстве обязательна: автотестов нет, а поведение зависит от React Compiler и нативного рендера.

### Общие ограничения
- Базовая линия: `npx tsc --noEmit` и `npx eslint .` проходят без ошибок на 2026-11-11 и должны проходить после каждого плана.
- Рабочее дерево чистое на 2026-11-11 (переименование TerenAI → Teren закоммичено).
- Комментарии и сообщения — на русском языке (CLAUDE.md). Конвенции: `type` вместо `interface`, цвета через `getColor`, стили через `useThemedStyles`.
- Правка затрагивает почти весь интерфейс: исполнитель коммитит по плану атомарно, чтобы регрессии можно было откатить по частям.

### Claude's Discretion
- Разбиение на планы и волны (рекомендация: план 1 — палитра + примитивы; план 2 — 18 модульных стилей; план 3 — остальные экраны и иконки; план 4 — защита от регрессий и проверка на устройстве, checkpoint).
- Конкретные значения производных цветов светлой палитры и проверка контраста.
- Решение, нужен ли отдельный чекер или правило ESLint.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `lib/ui/getColor.ts` — глобальная тема, `getColor`, `setActiveTheme`
- `lib/ui/palettes.ts` — палитры `light` и `dark`
- `lib/ui/useThemedStyles.ts` — фабрики стилей с подпиской на тему
- `context/ThemeContext.tsx` — провайдер и `useThemeContext`
- `app/app/(tabs)/settings.tsx` — переключатель темы
- `components/ui/Button.tsx`, `components/ui/Text.tsx`, `components/ui/screen/ScreenMain.tsx`, `components/ui/screen/ScreenFooter.tsx`, `components/ui/Popover.tsx` — базовые примитивы без подписки на тему
- `app/app/(tabs)/index.tsx`, `components/home/HomeEmptyState.tsx` — образцы правильного использования `useThemedStyles` и `useThemeContext`
- `components/ThemedStatusBar.tsx` — проверить статус-бар при смене темы
- `app.config.ts` — `experiments.reactCompiler: true`
- `CLAUDE.md`
</canonical_refs>

<specifics>
## Specific Ideas

- Формулировка тестера: «При включении тёмного или светлого режима, надписи не видны, только если после смены темы закрыть и заново открыть приложение тогда надписи меняют цвет, да и в принципе светлая тема выглядит криво и основной цвет меняется с зелёного на синий почему-то».
- Тёмная тема по умолчанию при первом запуске (`getColor.ts`: решение пользователя в прежней фазе) — сохранить.
</specifics>

<deferred>
## Deferred Ideas

- Полный редизайн светлой темы по макету Figma (макета нет; при появлении — отдельная фаза).
- Автоматическое следование системной теме устройства (сейчас тема задаётся вручную; в объёме не обсуждалось).
</deferred>

---

*Phase: 76-theme-switching*
*Context gathered: 2026-11-11*

---
phase: 75-testflight
verified: 2026-11-11T00:00:00Z
status: human_needed
score: 2/3 must-haves verified (SC1 открыт: human_needed)
human_verification:
  - test: "Войти по телефону через WhatsApp после правки Twilio (SC1)"
    expected: "Код доходит в WhatsApp; если нет, у тестера есть рабочий альтернативный канал"
    why_human: "Причина — Twilio 63005 (вне кода); решение A оставляет починку пользователю, результат кодом не проверить"
  - test: "Визуально: экран пациента у наблюдателя и ввод вне диапазона"
    expected: "Нет кнопок/ссылок добавления; кольца от целей пациента; сообщение о диапазоне под полем, кнопка сохранения неактивна"
    why_human: "UI-поведение"
---

# Phase 75: TestFlight — отчёт верификации

**Цель:** исправлены замечания тестера по TestFlight.

## Критерии

| # | Критерий | Статус | Доказательства |
|---|----------|--------|----------------|
| 1 | Причина WhatsApp выяснена, решение принято | ЧАСТИЧНО / human_needed | 75-03: причина Twilio 63005, вариант A (осознанное решение). Код не менялся. Пока пользователь не починит Twilio, «тестер не упирается в нерабочий канал» не подтверждено — открытый вопрос, не провал кода. |
| 2 | Наблюдатель не видит элементов добавления/правки/удаления; кольца от целей пациента | VERIFIED | См. ниже |
| 3 | Сахар/давление/пульс вне диапазона не сохраняются ни из UI, ни мутацией; понятное сообщение | VERIFIED | См. ниже |

### SC2 (код прочитан)
- `observedPatient/[patientId].tsx`: HomeRecentlyLogged, HomeMacroSummary, HomeMicroSummary, HomeGlucoseSummary, HomeBloodPressureSummary все с `readOnly`; единственная навигация — кнопка «История» (просмотр), `observedHistory` не содержит href/добавления.
- `HomeEmptyState`: без href/onPress рендерит текст без иконки «+» и кнопки. Glucose: `href={readOnly ? undefined : ...}`; «Все»-ссылки и Link-обёртки скрыты в readOnly (Glucose/BP/Micro); MealCard в readOnly без Link; `onAddPress` у наблюдателя не передаётся.
- Цели: `data.targets` (из `getPatientToday` — `patientProfile.targets`) передаются в `HomeRecentlyLogged.targetCalories` и `HomeMacroSummary.targets`; в readOnly запрос собственного профиля пропускается (`"skip"`), fallback — только `defaultValues`, если у пациента нет targets (допустимо).
- Экран дня `day/[date].tsx` — собственный экран пользователя, кнопка добавления там по дизайну (D-07), не наблюдательский.

### SC3 (код прочитан)
- `lib/health/healthRanges.ts`: сахар 1.1–33.3 ммоль/л и 20–600 мг/дл, САД 50–300, ДАД 30–200, пульс 20–250, САД>ДАД; NaN/Infinity отвергаются.
- Сервер: `glucose/createReading` и `bloodPressure/createReading` бросают ошибку при невалидном значении; `importHealthKitReadings` молча пропускает невалидные образцы. Других мутаций вставки в glucoseReadings/bloodPressureReadings нет (grep по convex).
- UI: `(add)/glucose.tsx` и `(add)/bloodPressure.tsx` считают `rangeError`/`bpError`, показывают сообщение на русском и блокируют `isValid`.
- Нюанс (info): при прямом вызове мутации серверное сообщение англоязычное и общее («Invalid glucose value»); понятное русское сообщение даёт UI до отправки.

### Команды
| Команда | Результат |
|---------|-----------|
| `npx tsc --noEmit` | чисто (exit 0) |
| `npx eslint .` | без ошибок |
| `npm run script:verifyHealthRanges` | `verifyHealthRanges: OK` |

### Деплой
75-04 not-applicable (осознанно): один Convex-деплой для dev и TestFlight; 75-01 выкачен `convex dev --once`. Оговорка: значение `EXPO_PUBLIC_CONVEX_URL` в EAS production не сверялось — стоит проверить вручную.

### Анти-паттерны
Маркеров TBD/FIXME/XXX в файлах фазы не выявлено в проверенных файлах. Несвязанные незакоммиченные файлы пользователя не трогались.

## Итог
Код по SC2 и SC3 подтверждён. SC1 зависит от внешней починки Twilio — статус **human_needed**.

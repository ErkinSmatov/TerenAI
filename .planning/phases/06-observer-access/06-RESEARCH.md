# Phase 6: Наблюдатель за пользователем - Research

**Researched:** 2026-08-14
**Domain:** Convex many-to-many связи + авторизация по связи + Expo Router UI настроек + клинические пороги глюкозы
**Confidence:** MEDIUM-HIGH (паттерны кодовой базы — HIGH, клинические диапазоны — MEDIUM/CITED, часовой пояс для наблюдателя — LOW/помечено как открытый вопрос)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Аккаунт и привязка (пейринг-код)**
- **D-01:** Наблюдателю нужен собственный аккаунт в приложении — обычный вход или гостевой режим, как у любого пользователя. Переиспользует существующий Convex Auth `userId`, никакого отдельного лёгкого входа
- **D-02:** Код пациента постоянный и многоразовый — один код хранится в профиле пациента, им можно поделиться с несколькими наблюдателями, перегенерируется только вручную по действию пациента (не истекает по времени, не одноразовый)
- **D-03:** Пациент видит и управляет своим кодом в новом разделе Настроек. Там же — список привязанных наблюдателей и отзыв доступа. Кнопка в шапке (рядом со стрик-иконкой, `components/home/HomeHeader.tsx:25-34` — сейчас без `onPress`) открывает противоположный список: «кого я наблюдаю»

**Множественность связей**
- **D-04:** Один пациент может иметь несколько наблюдателей одновременно (например, оба родителя + врач) — связь один-ко-многим со стороны пациента
- **D-05:** Один наблюдатель может наблюдать нескольких пациентов сразу, вводя несколько разных кодов — связь многие-ко-многим. Модель данных: отдельная таблица связей (`observerLinks` или аналог) с парой `(observerId, patientId)`, а не поле на `profiles`

**Пороги предупреждений**
- **D-06:** Порог «глюкоза вне нормы» — фиксированный клинический диапазон, не привязан к `profiles.data.glucometerType` и не задаётся пациентом вручную
- **D-07:** Диапазон учитывает `context` из `glucoseReadings` (fasting/beforeMeal/afterMeal/random) — разные границы для показаний натощак и после еды, а не один плоский диапазон на всё. Конкретные числовые значения диапазонов — на усмотрение планировщика/исполнителя (общепринятые клинические нормы), не переспрашивать пользователя
- **Калории:** порог «превышены калории» не обсуждался отдельно — использовать существующий `profiles.targets.calories` как целевое значение, превышение суммы калорий за сегодня над этим таргетом = предупреждение (Claude's discretion, см. ниже)

**Отзыв доступа**
- **D-08:** Пациент может в любой момент отозвать доступ конкретному наблюдателю из списка привязанных в Настройках (не только через перегенерацию кода целиком)
- **D-09:** Симметрично — сам наблюдатель тоже может убрать пациента из своего списка наблюдаемых без участия пациента. Разрыв связи доступен с обеих сторон

### Claude's Discretion
- Конкретные числовые границы клинического диапазона глюкозы (натощак / после еды, в mmol/L и mg/dL — таблица уже хранит оба варианта unit)
- Точная структура таблицы связей наблюдателей в Convex-схеме (имя таблицы, индексы) — по существующим конвенциям `convex/tables/*.ts`
- Как именно реализовать авторизационную проверку «наблюдатель имеет право на этого пациента» в новых Convex-функциях (сейчас такого паттерна в проекте нет — везде читается только «свой» `userId` через `getAuthUserId(ctx)`)
- Определение «превышены калории» как порог для предупреждения на карточке (использовать `profiles.targets.calories` как есть)
- UI-детали: как именно выглядит новый раздел Настроек с кодом, как оформлен список наблюдаемых/наблюдателей (это не обсуждалось детально — только точки входа и общая структура карточки из seed)

### Deferred Ideas (OUT OF SCOPE)
- **Push-уведомления о нарушениях режима** — сознательно вне этой фазы (см. `.planning/research/questions.md` — открытый research question про push-инфраструктуру для Expo/RN, которой в проекте пока нет вообще). Первая версия ограничена бейджами/предупреждениями, видимыми только когда наблюдатель сам открывает список
- **Полная история данных (не только «сегодня»)** — не обсуждалось, вне скоупа этой фазы по исходному seed
- **Действия наблюдателя сверх просмотра** (заметки, редактирование данных пациента) — не обсуждалось; seed явно ограничивает доступ наблюдателя чтением
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| OBSV-01 | Наблюдатель подключается к аккаунту пациента через собственный аккаунт (обычный вход/гостевой режим) и постоянный многоразовый код пациента | Pattern 5 (генерация кода через `generateNumericToken`), Code Examples → мутация `redeemCode`, Common Pitfalls #4 (коллизии кода) |
| OBSV-02 | Пациент видит и управляет своим кодом в новом разделе Настроек; один пациент может делиться кодом с несколькими наблюдателями одновременно | Pattern 5, Recommended Project Structure (`app/app/(settings)/observerCode.tsx`), Don't Hand-Roll (SettingsGroup/SettingsItem) |
| OBSV-03 | Наблюдатель может подключиться к нескольким пациентам сразу (несколько кодов) и видит их всех в едином списке наблюдаемых | Pattern 2 (индекс `byObserverId` таблицы `observerLinks`), System Architecture Diagram |
| OBSV-04 | Список наблюдаемых доступен по кнопке в шапке главного экрана и показывает карточку на каждого пациента с сегодняшними данными: глюкоза, приёмы пищи, калории, шаги | Pattern 4 (day-boundary математика для «сегодня»), Don't Hand-Roll (переиспользование Home-компонентов) |
| OBSV-05 | Карточка наблюдаемого показывает визуальное предупреждение при превышении целевых калорий или выходе глюкозы за клинический диапазон, с учётом контекста измерения | Code Examples → `thresholds.ts`, Assumptions Log A1/A2 (клинические диапазоны ADA), Security/пороги — не относится |
| OBSV-06 | Клик по карточке наблюдаемого открывает детальный вид его данных за сегодня, аналогичный главному экрану владельца данных | Don't Hand-Roll (переиспользование `HomeMacroSummary`, `HomeGlucoseSummary` и т.д. с внешними данными вместо собственных `useQuery`) |
| OBSV-07 | Пациент может в любой момент отозвать доступ конкретному наблюдателю; наблюдатель может симметрично убрать пациента из своего списка без участия пациента | Common Pitfalls #5 (проверка владения при отзыве), Pitfall #3 (каскад при удалении аккаунта) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Язык ответов и документации:** `./CLAUDE.md` требует «Отвечай пользователю на русском языке». Все планировочные документы фазы (`CONTEXT.md`, `DISCUSSION-LOG.md`, `REQUIREMENTS.md`, `STATE.md`, `ROADMAP.md`) уже написаны на русском — этот RESEARCH.md следует тому же соглашению. Технические идентификаторы (имена файлов, функций, таблиц, библиотек) и цитаты источников остаются на языке оригинала.

## Summary

Эта фаза добавляет в проект принципиально новую концепцию связи (`observerLinks`) — до сих пор кодовая база моделировала только «текущий пользователь читает свои собственные строки». Каждый существующий запрос (`convex/meals/*`, `convex/glucose/*`, `convex/home/getStreak.ts` и т.д.) следует одной и той же форме: `getAuthUserId(ctx)` → запрос `.withIndex("byUserId", ...)` по этому же id. **Нигде в проекте нет прецедента**, когда один аутентифицированный пользователь читает данные другого пользователя. Эту фазу придётся вводить с нуля, и делать это стоит один раз, через общий helper, а не копипастой в каждой новой query.

При этом для всех остальных частей фичи в кодовой базе уже есть сильные, напрямую переиспользуемые прецеденты: `convex/utils/otp.ts` (`generateNumericToken`, построен на `@oslojs/crypto/random` + `crypto.getRandomValues`) — готовый безопасный генератор кода; `components/ui/OTPInput.tsx` — готовый UI для ввода числового кода (уже используется дважды для OTP по email/телефону); `convex/meals/getWeekMeals.ts` / `convex/glucose/getWeekReadings.ts` / `convex/movement/getWeekMovement.ts` задают точную математику границ суток на основе `timezoneOffsetMinutes`, которую можно переиспользовать для «сегодня пациента»; `components/settings/DiagnosticsSection.tsx` + `SettingsGroup`/`SettingsItem` задают паттерн подраздела настроек; а `convex/tables/mealItems.ts` (индекс `byMealId`) — ближайший существующий прецедент таблицы, ссылающейся на родителя по id с индексом, полезный как образец для индексов `observerLinks`.

Единственное клиническое решение, которое кодовая база не может подсказать — диапазоны целевой глюкозы: нигде в `lib/` или `components/` сегодня нет никакой пороговой логики (подтверждено grep-поиском). Согласно D-06/D-07, конкретные числа — на усмотрение Claude с использованием общепринятых клинических норм; ниже используются значения ADA (American Diabetes Association) Standards of Care 2026, помечены `[CITED]`.

**Primary recommendation:** Добавить одну таблицу `observerLinks` с двумя индексами (`byObserverId`, `byPatientId`), плюс постоянное поле `observerCode` в `profiles` (переиспользуя `generateNumericToken`); написать один общий helper `convex/utils/observerAuth.ts`, который (а) резолвит `patientUserId` по коду и (б) проверяет наличие связи наблюдатель→пациент перед любым чтением; переиспользовать day-boundary математику в стиле `getWeekReadings`/`getWeekMeals`/`getWeekMovement` для «сегодня», параметризовав её явным аргументом `targetUserId` вместо `getAuthUserId`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Генерация и хранение пейринг-кода | API / Backend (Convex mutation + таблица `profiles`) | — | Код должен генерироваться на сервере (с проверкой коллизий, криптографически случайно) и является состоянием, принадлежащим пациенту |
| Погашение кода (наблюдатель вводит код → создаётся связь) | API / Backend (Convex mutation) | — | Нужно проверить существование кода, разрешить целевого пользователя, вставить строку связи — чистая серверная логика |
| Хранение связи наблюдатель↔пациент | Database / Storage (новая таблица Convex `observerLinks`) | — | Связь многие-ко-многим, требует отдельной таблицы по D-05 |
| Проверка «имеет ли этот наблюдатель право читать данные этого пациента» | API / Backend (общий Convex-helper) | — | Авторизация должна происходить на сервере до того, как данные покинут Convex; никогда не доверять `targetUserId` от клиента без проверки |
| Сегодняшняя глюкоза/приёмы пищи/шаги пациента (для чтения наблюдателем) | API / Backend (новые observer-scoped Convex-запросы) | Database / Storage (существующие таблицы + индексы) | Читает существующие таблицы (`glucoseReadings`, `meals`, `movementData`) по `targetUserId`, защищено авторизационным helper'ом |
| Оценка порогов (превышены калории / глюкоза вне диапазона) | API / Backend (или общая чистая функция, вызываемая и сервером, и клиентом) | Browser / Client (отрисовка бейджа) | Пороговую математику стоит написать один раз как чистую функцию — тестируемую и переиспользуемую; отрисовка результирующего boolean/уровня серьёзности — забота клиента |
| UI списка наблюдаемых, карточка, бейджи | Browser / Client (React Native компоненты) | — | Чистое представление поверх результатов query |
| Раздел Настроек (код, список привязанных наблюдателей, отзыв) | Browser / Client (экран Expo Router в `app/app/(settings)/`) | API / Backend (мутации: перегенерация кода, отзыв связи) | Стандартный паттерн экрана настроек + мутаций, уже установленный `health.tsx` |
| Симметричный разрыв связи (наблюдатель убирает пациента) | API / Backend (Convex mutation, без согласия пациента по D-09) | — | Мутация должна принимать удаление строки любой из сторон; проверка владения — «запрашивающий пользователь — один из двух id в строке связи» |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | 1.27.3 (verified: `node_modules/convex/package.json`) | Backend данных + функций | Уже единственный бэкенд проекта |
| @convex-dev/auth | ^0.0.90 (verified: `package.json`) | `getAuthUserId(ctx)`, сессия/идентичность пользователя | Уже единственный слой авторизации проекта; Anonymous-провайдер уже подключён для гостевых наблюдателей (D-01) |
| @oslojs/crypto | ^1.0.1 (verified: `package.json`) | `generateRandomString` + `RandomReader` поверх `crypto.getRandomValues` | Уже используется в `convex/utils/otp.ts` для генерации OTP-токена — напрямую переиспользуем для пейринг-кода, не изобретаем случайность заново |
| convex-helpers | ^0.1.104 (verified: `package.json`) | `partial()` для patch-style аргументов мутации | Уже используется в `convex/profiles/updateProfile.ts`; пригодится, если понадобится мутация «обновить настройки наблюдателя» с частичными аргументами |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 (verified: `package.json`) | Форматирование таймстампов в UI списка/деталей наблюдателя | Так же, как во всех остальных экранах-списках (`glucoseLog.tsx`, `bloodPressureLog.tsx`) |
| expo-router | ~6.0.14 (verified: `package.json`) | Новый подраздел настроек + новый роут «список наблюдаемых» | Файловая маршрутизация уже используется для каждого экрана в `app/app/(settings)/` и `app/app/(home)/` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Переиспользование `generateNumericToken` (числовой код) | Буквенно-цифровой короткий код (например, в стиле nanoid, base32) | У буквенно-цифрового кода больше пространство значений на символ (меньше риск коллизии при той же длине), но потребует *нового* компонента ввода — `OTPInput.tsx` жёстко задан на `inputMode="numeric"` и отклоняет `/[^\d]/`. Числовой код сохраняет полное переиспользование UI; 6-8-значный числовой код даёт с запасом достаточное пространство значений для реального масштаба пользователей этого приложения |
| Общий helper `convex/utils/observerAuth.ts` | Дублирование проверки авторизации инлайн в каждом новом файле query | Каждый существующий домен (`meals`, `glucose`, `profiles`) дублирует свою 2-строчную проверку `getAuthUserId` в каждом файле — это нормально для «проверить против самого себя», но проверка наблюдателя — это 3-4 строки с lookup по индексу; дублирование в 4+ новых файлах query (глюкоза, сводка по приёмам пищи, движение, список) рискует разойтись. Единый helper стоит того, чтобы отклониться от нормы «один файл — одна проверка» |
| Новая таблица `observerLinks` | Массив-поле в `profiles` (например, `profiles.observerUserIds`) | Явно отклонено D-05 — многие-ко-многим требует отдельной таблицы, так как оба направления (пациенты наблюдателя, наблюдатели пациента) нуждаются в эффективных индексированных выборках, а запросы array-contains плохо индексируются в Convex |

**Installation:**
Новые пакеты не требуются — все нужные библиотеки уже являются зависимостями проекта.

**Version verification:**
```bash
$ node -e "console.log(require('convex/package.json').version)"
1.27.3
$ grep '"@convex-dev/auth"\|"@oslojs/crypto"' package.json
"@convex-dev/auth": "^0.0.90",
"@oslojs/crypto": "^1.0.1",
```
Проверка через npm registry не требуется — в `package.json` ничего нового не добавляется.

## Architecture Patterns

### System Architecture Diagram

```
Устройство пациента                            Устройство наблюдателя
────────────────────                           ───────────────────────
Настройки → экран "Мой код"                    Кнопка-стрик в HomeHeader (onPress, сейчас не подключена)
   │                                                  │
   │ useQuery(getProfile) → observerCode              │ router.push("/app/(settings)/observedList")
   │ useMutation(regenerateCode) [если нет/ротация]   │
   │                                                  ▼
   │                                          Экран списка наблюдаемых
   │                                                  │
   │                                                  │ (пустое состояние) → "Ввести код" → OTPInput (переиспользован)
   │                                                  │      │
   │                                                  │      ▼
   │                                                  │  useMutation(redeemObserverCode, {code})
   │                                                  │      │
   │                                                  │      ▼
   │                                     ┌────────────┴──────────────────────────┐
   │                                     │ Convex mutation: redeemObserverCode    │
   │                                     │  1. getAuthUserId(ctx) → observerId    │
   │                                     │  2. profiles.byObserverCode(code)      │
   │                                     │     → patientUserId (404 если нет)     │
   │                                     │  3. guard: observerId !== patientUserId│
   │                                     │  4. observerLinks.byObserverAndPatient │
   │                                     │     (идемпотентно — без дубля строки)  │
   │                                     │  5. insert observerLinks row           │
   │                                     └─────────────────────────────────────────┘
   │                                                  │
   │                                                  ▼
   │                                  useQuery(getObservedPatients) → [{patientId, ...todaySummary}]
   │                                                  │      (для каждого пациента: общий авторизационный
   │                                                  │       helper + сегодняшняя глюкоза/приёмы пищи/шаги
   │                                                  │       + оценка порогов)
   │                                                  ▼
   │                                          Список карточек наблюдаемых (бейджи: предупреждения по калориям/глюкозе)
   │                                                  │
   │                                                  │ тап по карточке
   │                                                  ▼
   │                                     Экран деталей (переиспользует компоненты сводки в стиле Home,
   │                                     получая targetUserId=patientId + observer-scoped запросы)
   │
   ▼
Настройки → список "Мои наблюдатели"
   │ useQuery(getMyObservers) → [{observerId, linkedAt}]
   │ useMutation(revokeObserverLink, {linkId})  ── разрыв по инициативе пациента
   ▼
Строка observerLinks удалена (та же мутация используется и со стороны
наблюдателя для симметричного самостоятельного разрыва связи, по D-09,
с проверкой «запрашивающий — одна из двух сторон»)
```

Поток данных при любом чтении со стороны наблюдателя проходит через одну точку авторизации (`assertObserverAccess`) прежде чем коснуться `glucoseReadings` / `meals` / `movementData` — это архитектурный шов, которого пока нигде в кодовой базе нет, и это самая рискованная часть фазы с точки зрения корректности реализации.

### Recommended Project Structure
```
convex/
├── tables/
│   └── observerLinks.ts        # НОВОЕ — xFields + defineTable + два индекса
├── observers/                  # НОВЫЙ домен, по образцу convex/meals, convex/glucose
│   ├── generateCode.ts         # mutation: гарантировать наличие observerCode у профиля (идемпотентно)
│   ├── regenerateCode.ts       # mutation: пациент ротирует свой код
│   ├── redeemCode.ts           # mutation: наблюдатель вводит код → создаётся связь
│   ├── getMyObservers.ts       # query: сторона пациента — кто наблюдает за мной
│   ├── getObservedPatients.ts  # query: сторона наблюдателя — за кем я наблюдаю (список + сводка за сегодня)
│   ├── getPatientToday.ts      # query: сторона наблюдателя, детальный вид одного пациента
│   ├── revokeLink.ts           # mutation: удалить строку связи, симметрично (с любой стороны)
│   └── utils/
│       └── thresholds.ts       # чистые функции: isCaloriesExceeded, isGlucoseOutOfRange
├── utils/
│   └── observerAuth.ts         # НОВЫЙ общий helper: assertObserverAccess(ctx, targetUserId)
└── schema.ts                   # добавить импорт observerLinks + регистрацию

app/app/(settings)/
├── observerCode.tsx             # НОВОЕ — код пациента + список привязанных наблюдателей + отзыв
└── observedList.tsx             # НОВОЕ — список "за кем я наблюдаю" + добавление по коду + карточки

components/
├── settings/
│   └── ObserverSection.tsx      # по паттерну DiagnosticsSection/SettingsGroup
└── observer/
    ├── ObservedPatientCard.tsx  # карточка: глюкоза/приёмы пищи/калории/шаги + бейджи предупреждений
    └── ObserverListItem.tsx     # строка в списке "кто наблюдает за мной" в настройках пациента

lib/
└── observer/
    └── glucoseRange.ts          # (или convex/observers/utils/thresholds.ts — выбрать ОДНО место,
                                  #  см. заметку про дублирование пороговой логики в "Don't Hand-Roll")
```

### Pattern 1: Один файл — одна Convex-функция, сгруппировано по домену
**What:** Каждый query/mutation Convex — отдельный файл, `export default`, сгруппированы по доменной папке (`convex/meals/`, `convex/glucose/` и т.д.), вызываются на клиенте как `api.<domain>.<file>.default`.
**When to use:** Для каждой новой функции наблюдателя — создать `convex/observers/` и следовать той же форме.
**Example:**
```typescript
// Source: convex/glucose/deleteReading.ts (существующий паттерн, проверен в репозитории)
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

const deleteReading = mutation({
  args: { readingId: v.id("glucoseReadings") },
  handler: async (ctx, { readingId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const reading = await ctx.db.get(readingId);
    if (!reading) throw new Error("Not found");
    if (reading.userId !== userId) throw new Error("Forbidden");
    await ctx.db.delete(readingId);
  },
});
export default deleteReading;
```

### Pattern 2: Модуль полей таблицы, композируемый в schema.ts
**What:** `convex/tables/<name>.ts` экспортирует `<name>Fields` (обычный объект валидаторов `v.*`) и `<name>` (`defineTable(fields).index(...)`); `convex/schema.ts` импортирует и регистрирует каждую таблицу.
**When to use:** Для новой таблицы `observerLinks`.
**Example:**
```typescript
// Source: convex/tables/bloodPressureReadings.ts (существующий паттерн, проверен в репозитории) —
// адаптированная форма для observerLinks
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const observerLinksFields = {
  observerId: v.id("users"),
  patientId: v.id("users"),
};

export const observerLinks = defineTable(observerLinksFields)
  .index("byObserverId", ["observerId"])
  .index("byPatientId", ["patientId"])
  // составной индекс даёт O(1)-проверку "связь уже существует"
  // без collect+filter, нужен для идемпотентности redeemCode
  .index("byObserverAndPatient", ["observerId", "patientId"]);
```
Затем в `convex/schema.ts` добавить `import { observerLinks } from "./tables/observerLinks";` и `observerLinks` в объект `defineSchema({...})`, рядом с существующими 7 таблицами.

**Запрос в обоих направлениях:**
```typescript
// "за кем наблюдает этот наблюдатель" (экран списка наблюдаемых)
const links = await ctx.db
  .query("observerLinks")
  .withIndex("byObserverId", (q) => q.eq("observerId", observerId))
  .collect();

// "кто наблюдает за этим пациентом" (экран настроек пациента)
const links = await ctx.db
  .query("observerLinks")
  .withIndex("byPatientId", (q) => q.eq("patientId", patientId))
  .collect();
```

### Pattern 3: Общий кросс-пользовательский helper авторизации (НОВЫЙ паттерн — прецедентов нет)
**What:** Единая функция, которую вызывают и мутации, и query, чтобы проверить «текущий аутентифицированный пользователь имеет право читать данные `targetUserId`», заменяя используемое сейчас по всему проекту `if (doc.userId !== userId) throw new Error("Forbidden")` (которое сегодня всегда сравнивает только со *своим собственным* id).
**When to use:** В каждом новом observer-facing query (`getPatientToday`, `getObservedPatients`, и любом будущем чтении по домену для наблюдателя).
**Example:**
```typescript
// НОВЫЙ ФАЙЛ: convex/utils/observerAuth.ts
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Резолвит вызывающего и проверяет, что у него есть активная строка
 * observerLinks для targetUserId. Бросает "Unauthorized" (нет сессии)
 * или "Forbidden" (сессия есть, но связи нет) — соответствует
 * существующему словарю ошибок в convex/glucose/deleteReading.ts,
 * convex/mealItems/getMealItem.ts.
 */
export async function assertObserverAccess(
  ctx: QueryCtx | MutationCtx,
  targetUserId: Id<"users">
): Promise<Id<"users">> {
  const observerId = await getAuthUserId(ctx);
  if (observerId === null) throw new Error("Unauthorized");

  const link = await ctx.db
    .query("observerLinks")
    .withIndex("byObserverAndPatient", (q) =>
      q.eq("observerId", observerId).eq("patientId", targetUserId)
    )
    .first();

  if (!link) throw new Error("Forbidden");
  return observerId;
}
```
Каждый новый observer-facing query становится: `const observerId = await assertObserverAccess(ctx, args.targetUserId);`, затем тело работает ровно как существующие `getWeekMeals`/`getWeekReadings`, подставляя `targetUserId` вместо `userId` в вызовах `.withIndex(...)`.

### Pattern 4: Day-boundary математика для «сегодня», параметризованная целевым пользователем
**What:** Каждый существующий запрос «неделя/день» принимает клиентский аргумент `timezoneOffsetMinutes: v.number()` и вычисляет границы локальной полуночи по нему (см. `convex/meals/getWeekMeals.ts`, `convex/glucose/getWeekReadings.ts`, `convex/movement/getWeekMovement.ts` — все три независимо реализуют идентичную математику `dayMs`/`offsetMs`/`localMidnightMs`, уже небольшое дублирование в существующей кодовой базе).
**When to use:** Для запросов «сегодня» со стороны наблюдателя. Сократить расчёт границ до однодневной версии (без необходимости полного массива на 7 дней).
**Example:**
```typescript
// Адаптировано из логики "сегодняшнего среза" в convex/glucose/getWeekReadings.ts
const dayMs = 24 * 60 * 60 * 1000;
const offsetMs = timezoneOffsetMinutes * 60_000;
const localNowMs = Date.now() - offsetMs;
const localMidnightMs = Math.floor(localNowMs / dayMs) * dayMs;
const todayStartUtc = localMidnightMs + offsetMs;
const todayEndUtc = todayStartUtc + dayMs;

const readings = await ctx.db
  .query("glucoseReadings")
  .withIndex("byUserIdAndRecordedAt", (q) =>
    q.eq("userId", targetUserId).gte("recordedAt", todayStartUtc).lt("recordedAt", todayEndUtc)
  )
  .collect();
```
**Важная оговорка — см. Open Questions:** `timezoneOffsetMinutes` в каждом существующем запросе — это смещение *запрашивающего клиента* (`new Date().getTimezoneOffset()`, считывается на клиенте и передаётся аргументом). Для запросов наблюдателя клиент, делающий запрос — это устройство **наблюдателя**, а не **пациента**. В схеме сегодня нигде не хранится поле `timezone` для `profiles`. См. Open Question 1.

### Pattern 5: Безопасная генерация кода с переиспользованием существующей OTP-инфраструктуры
**What:** `convex/utils/otp.ts`'s `generateNumericToken(length)` уже оборачивает `@oslojs/crypto/random`'s `generateRandomString` поверх `crypto.getRandomValues` — криптографически надёжный RNG, уже доказавший работоспособность в среде выполнения Convex mutation/action (используется прямо сейчас `ResendOTP`/`WhatsAppOTP`/`TelegramOTP`).
**When to use:** Для генерации постоянного пейринг-кода пациента. Рекомендуется `generateNumericToken(6)` (пространство значений 1 000 000, с запасом достаточно для масштаба этого приложения), чтобы существующий компонент `OTPInput` (проп `length`) можно было переиспользовать как есть для UI ввода кода наблюдателем, без единого нового компонента ввода.
**Example:**
```typescript
// НОВЫЙ ФАЙЛ: convex/observers/generateCode.ts
import generateNumericToken from "../utils/otp";
// ... внутри mutation, после резолва профиля:
let code: string;
let existing;
do {
  code = generateNumericToken(6);
  existing = await ctx.db
    .query("profiles")
    .withIndex("byObserverCode", (q) => q.eq("observerCode", code))
    .first();
} while (existing !== null); // цикл повтора при коллизии — нужен, т.к. код должен быть глобально уникальным
await ctx.db.patch(profile._id, { observerCode: code });
```
Требует добавления `observerCode: v.optional(v.string())` в `profilesFields` и нового `.index("byObserverCode", ["observerCode"])` на таблице `profiles` (`convex/tables/profiles.ts`) — нужен для O(1)-выборки при погашении кода вместо полного сканирования таблицы с фильтром.

### Anti-Patterns to Avoid
- **Авторизация на стороне клиента:** никогда не принимать булев флаг «isObserverForThisPatient» от клиента и не доверять аргументу `targetUserId` без прогона через `assertObserverAccess` на сервере на каждом запросе — это самое важное, что нужно сделать правильно в этой фазе, так как это первая в проекте поверхность кросс-пользовательского чтения.
- **Дублирование day-boundary математики в 4-й и 5-й раз:** в кодовой базе эта логика уже скопирована 3 раза (`getWeekMeals`, `getWeekReadings`, `getWeekMovement`). Добавление ещё 2 копий (глюкоза+приёмы пищи+движение «сегодня» для наблюдателя) даёт 5. Стоит рассмотреть вынесение небольшого общего helper'а `localDayBoundaries(nowMs, timezoneOffsetMinutes)` в `convex/utils/` в рамках этой фазы, раз логика трогается уже в 4-й/5-й раз — не обязательно, но стоит отметить планировщику как недорогую возможность устранения дублирования.
- **Хранение пороговой логики в двух местах:** не писать проверки «глюкоза вне диапазона» / «превышены калории» отдельно для query «сегодня» (сервер, для вычисления бейджа) и для карточки UI (клиент, для отрисовки). Написать один раз как чистую функцию и переиспользовать (Convex-функции и RN/Expo-код могут импортировать из общего модуля `lib/` или `convex/observers/utils/`, так как `convex/` в этом проекте уже импортирует из `@/lib/utils/logError` в нескольких файлах — кросс-импорт между `convex/` и `lib/` уже устоявшийся паттерн здесь).
- **Разрешение наблюдения за самим собой:** `redeemCode` должен явно отклонять `observerId === patientId` (пользователь погашает собственный код) — не упомянуто в решениях CONTEXT.md, дешёвая проверка для добавления.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Генерация безопасного случайного кода | Кастомный генератор строки на `Math.random()` | `generateNumericToken` из `convex/utils/otp.ts` (уже существует, уже доказал работу в среде Convex, уже крипто-безопасен через `@oslojs/crypto`) | Ноль нового кода, ноль новых зависимостей, соответствует существующей планке безопасности, используемой для OTP-токенов авторизации |
| UI ввода числового кода | Новый компонент ввода на основе TextInput | `components/ui/OTPInput.tsx` (проп `length` уже обобщён, уже используется дважды) | Полный визуальный/анимационный паритет и обработка клавиатуры бесплатно, за счёт готовых OTP-флоу |
| Верстка подраздела настроек | Новая карточка/список с нуля | `SettingsGroup` + `SettingsItem` (`components/settings/`), по образцу `DiagnosticsSection.tsx` как ближайшего прецедента подраздела настроек с собственным состоянием | Устоявшийся визуальный язык (строки, разделённые границей, внутри одной Card), ноль новых решений по стилю |
| Кросс-пользовательская авторизация | Разовая проверка «есть ли связь», скопированная в каждый новый файл | Один общий helper `convex/utils/observerAuth.ts` (`assertObserverAccess`) | Эта фаза добавляет не менее 3-4 observer-facing query; общий helper — это разница между одним security-critical участком кода для ревью и четырьмя |
| Детальный вид наблюдаемого пациента | Новый экран деталей с нуля | Переиспользовать существующие компоненты сводки Home (`HomeMacroSummary`, `HomeGlucoseSummary`, `HomeBloodPressureSummary`, `HomeMovementSummary`), параметризовав их так, чтобы они принимали уже загруженные данные вместо внутреннего `useQuery` для «своих» данных (по OBSV-06 — «детальный вид ... аналогичный главному экрану») | Напрямую закрывает требование «детальный вид как на главном экране» и избегает поддержки двух параллельных UI для одной и той же формы данных. **Оговорка:** эти компоненты сейчас сами ничего не вызывают (получают props от родительского экрана), поэтому это прямое переиспользование — родительскому экрану нужно лишь брать props из observer-scoped запросов вместо owner-scoped, уже используемых на `app/app/(tabs)/index.tsx` |

**Key insight:** Самый большой риск hand-rolling в этой фазе — не UI и не случайность (у обоих есть сильные прецеденты) — это соблазн написать проверку авторизации наблюдателя инлайн, по-разному, в каждом новом файле query. Централизовать её один раз.

## Common Pitfalls

### Pitfall 1: Доверие `targetUserId` без серверной проверки
**What goes wrong:** Query/mutation принимает `targetUserId` аргументом и читает данные этого пользователя, не убедившись сначала, что существует строка `observerLinks` для `(callerId, targetUserId)`.
**Why it happens:** Каждый существующий query в кодовой базе выводит вопрос «чьи данные» исключительно из `getAuthUserId(ctx)` — нет устоявшегося паттерна «id в вопросе — это аргумент функции, а не выведенный из сессии», поэтому легко по привычке пропустить дополнительную проверку.
**How to avoid:** Пропускать каждый новый observer-facing query через `assertObserverAccess(ctx, targetUserId)` до любого вызова `ctx.db.query(...)`, касающегося данных пациента.
**Warning signs:** Новый файл query в `convex/observers/`, который принимает `targetUserId: v.id("users")` аргументом, но вызывает `getAuthUserId(ctx)` только для проверки на null, никогда не запрашивая `observerLinks`.

### Pitfall 2: «Сегодня» вычислено в неправильном часовом поясе
**What goes wrong:** Карточка/детальный вид наблюдателя показывает данные не того дня (например, около полуночи), потому что «сегодня» вычислено по часовому поясу устройства *наблюдателя*, а не *пациента*.
**Why it happens:** Существующий паттерн `timezoneOffsetMinutes` спроектирован для «я спрашиваю о своих собственных данных», где смещение клиента по определению равно смещению субъекта данных. Как только вызывающий и субъект данных — разные люди, это предположение незаметно ломается. Поля `timezone` в `profiles` для решения этого не существует.
**How to avoid:** См. Open Question 1 ниже — либо принять приближение (задокументированное), либо хранить часовой пояс пациента.
**Warning signs:** QA замечает, что карточка «сегодня» у наблюдаемого пациента пустая/неверная вскоре после полуночи в одном из двух часовых поясов, особенно для персоны «врач», явно упомянутой в описании фазы, наиболее вероятно находящейся в реально другом часовом поясе относительно пациента.

### Pitfall 3: Удаление пользователя оставляет осиротевшие строки `observerLinks`
**What goes wrong:** `convex/users/deleteUser.ts` сейчас каскадно удаляет данные из `profiles`, `meals`, `mealItems`, `glucoseReadings`, `bloodPressureReadings`, `movementData`, `authSessions`, `authAccounts` — но написан до появления `observerLinks`. Если не обновить, удаление аккаунта пациента или наблюдателя оставит висящие строки связей, указывающие на несуществующего пользователя, что впоследствии либо бросит исключение при `ctx.db.get()` по отсутствующему id, либо тихо покажет сломанную/пустую карточку.
**Why it happens:** `deleteUser.ts` — вручную поддерживаемый список каскадов, не автоматический; легко добавить новую таблицу в `schema.ts` и забыть добавить её очистку здесь.
**How to avoid:** План этой фазы ОБЯЗАТЕЛЬНО должен включать задачу по обновлению `convex/users/deleteUser.ts` для удаления всех строк `observerLinks`, где удаляемый пользователь — либо `observerId`, либо `patientId` (запрос по обоим индексам, удаление обоих наборов результатов).
**Warning signs:** Grep `convex/users/deleteUser.ts` на `observerLinks` — если отсутствует после этой фазы, это пробел.

### Pitfall 4: Коллизия кода при постоянном, не истекающем коде
**What goes wrong:** Поскольку код постоянный (D-02: не одноразовый, не истекает), наивный `generateNumericToken(6)` без проверки уникальности имеет реальный (пусть и небольшой) шанс совпасть с уже существующим кодом другого пациента, незаметно направив нового наблюдателя не к тому пациенту.
**Why it happens:** Существующее использование `generateNumericToken` (`ResendOTP`) никогда не нуждалось в проверке уникальности — OTP-токены эфемерны (`maxAge` 15 минут) и скопированы по идентификатору, поэтому коллизии между разными пользователями там не важны. Постоянный, глобально ищущийся код — другое требование.
**How to avoid:** Всегда генерировать и проверять уникальность в цикле повтора против индекса `byObserverCode` перед сохранением (см. Pattern 5 выше), как при первой генерации, так и при регенерации.
**Warning signs:** Мутация `generateCode`/`regenerateCode`, вызывающая `generateNumericToken` ровно один раз без проверки существования.

### Pitfall 5: Симметричный разрыв связи без проверки владения
**What goes wrong:** D-09 требует, чтобы любая из сторон могла удалить связь в одностороннем порядке — но «любая из сторон» всё ещё должна означать «запрашивающий пользователь действительно является одной из двух сторон именно в этой строке связи», а не «любой аутентифицированный пользователь может удалить любую связь по id».
**Why it happens:** Легко написать `revokeLink(linkId)` как `ctx.db.delete(linkId)` только с проверкой на null-сессию, по аналогии с более простыми существующими мутациями вроде `deleteReading.ts` — но там уже есть проверка `reading.userId !== userId`; связи наблюдателя нужна эквивалентная проверка по любому из двух полей.
**How to avoid:** В обработчике `revokeLink`: получить связь, затем `if (link.observerId !== callerId && link.patientId !== callerId) throw new Error("Forbidden")`.
**Warning signs:** Мутация отзыва без проверки владения помимо `getAuthUserId(ctx) !== null`.

## Code Examples

### Мутация погашения кода (полная форма)
```typescript
// НОВЫЙ ФАЙЛ: convex/observers/redeemCode.ts
// Компонует паттерны, уже проверенные в convex/glucose/createReading.ts (форма auth-проверки)
// и convex/tables/profiles.ts (индекс byObserverCode, после добавления)
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const redeemCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    try {
      const observerId = await getAuthUserId(ctx);
      if (observerId === null) throw new Error("Unauthorized");

      const patientProfile = await ctx.db
        .query("profiles")
        .withIndex("byObserverCode", (q) => q.eq("observerCode", code))
        .first();
      if (!patientProfile) throw new Error("Code not found");

      const patientId = patientProfile.userId;
      if (patientId === observerId) throw new Error("Cannot observe yourself");

      const existingLink = await ctx.db
        .query("observerLinks")
        .withIndex("byObserverAndPatient", (q) =>
          q.eq("observerId", observerId).eq("patientId", patientId)
        )
        .first();
      if (existingLink) return existingLink._id; // идемпотентно

      return await ctx.db.insert("observerLinks", { observerId, patientId });
    } catch (error) {
      logError("redeemCode error", error);
      throw error;
    }
  },
});

export default redeemCode;
```

### Оценка порогов (чистая функция, переиспользуемая сервером и клиентом)
```typescript
// НОВЫЙ ФАЙЛ: convex/observers/utils/thresholds.ts (или lib/observer/thresholds.ts —
// выбрать ОДНО место согласно заметке в "Don't Hand-Roll" выше)
type GlucoseContext = "fasting" | "beforeMeal" | "afterMeal" | "random";
type GlucoseUnit = "mmol/L" | "mg/dL";

// Диапазоны по ADA 2026 Standards of Care in Diabetes (см. Sources) — [CITED]
// Значения [low, high] — включительные границы "нормального" диапазона, в каждой единице.
const GLUCOSE_RANGES: Record<GlucoseContext, Record<GlucoseUnit, [number, number]>> = {
  fasting:    { "mg/dL": [80, 130], "mmol/L": [4.4, 7.2] },
  beforeMeal: { "mg/dL": [80, 130], "mmol/L": [4.4, 7.2] },
  afterMeal:  { "mg/dL": [70, 180], "mmol/L": [3.9, 10.0] },
  // у "random" нет специфической цели ADA — используется общий референсный
  // диапазон как разумный fallback — см. Assumptions Log A2
  random:     { "mg/dL": [70, 140], "mmol/L": [3.9, 7.8] },
};

export function isGlucoseOutOfRange(
  value: number,
  unit: GlucoseUnit,
  context: GlucoseContext | undefined
): boolean {
  const ctx = context ?? "random";
  const [low, high] = GLUCOSE_RANGES[ctx][unit];
  return value < low || value > high;
}

export function isCaloriesExceeded(totalCalories: number, targetCalories: number): boolean {
  return totalCalories > targetCalories;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Нет — прецедентов в этой кодовой базе не было | Это первая фича с кросс-пользовательским доступом к данным в проекте | — | Все паттерны выше — новые внедрения, а не замена чего-то устаревшего |

**Deprecated/outdated:** Ничего в этом домене — существующие паттерны проекта (файл-на-функцию, `xFields`+`defineTable`, `getAuthUserId`) актуальны и должны быть расширены, а не заменены.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Целевые диапазоны ADA — натощак/до еды 80–130 мг/дл (4.4–7.2 ммоль/л), после еды <180 мг/дл (<10 ммоль/л), нижний порог <70 мг/дл (<3.9 ммоль/л) — подходят как пороги для пользователей "глюкометр-трека" этого приложения | Code Examples, Common Pitfalls | Это общие целевые значения ADA для взрослых с диагностированным диабетом; пользователи приложения могут включать пред-диабетиков/просто отслеживающих без диагноза, для которых уместны другие целевые значения. Неверные диапазоны могут дать ложноположительные или ложноотрицательные предупреждающие бейджи. По D-07 это явно на усмотрение Claude и не требует переспрашивания пользователя, но конкретные числа стоит сделать видимыми/проверяемыми пользователем перед мёржем, а не прятать в коде |
| A2 | Диапазон глюкозы для контекста "random" (70–140 мг/дл / 3.9–7.8 ммоль/л) — разумный fallback для показаний без контекста натощак/до/после еды | Code Examples | Специфического стандарта ADA для показаний без указанного контекста не существует; это приближение на основе общепопуляционного нормального диапазона, источники слабее, чем у A1. Риск невысок, так как "random" вероятно меньшинство залогированных показаний |
| A3 | «Сегодня пациента» можно приблизить, используя `timezoneOffsetMinutes` устройства наблюдателя (поля `profiles.timezone` для корректного решения не существует) | Pattern 4, Pitfall 2 | Если наблюдатель и пациент находятся в существенно разных часовых поясах (в описании фазы явно названа персона "врач" — наиболее вероятно удалённая), карточка может показать вчерашние или неполные данные дня около полуночи. См. Open Question 1 — вынесено как явное решение для планировщика/пользователя, а не тихое предположение |
| A4 | 6-значного числового кода достаточно (не слишком уязвим для перебора / не слишком склонен к коллизиям) для реального масштаба пользователей этого приложения | Pattern 5 | Если пользовательская база вырастет намного за пределы начального масштаба TestFlight, риск коллизии по парадоксу дней рождения растёт (смягчается циклом проверки уникальности при генерации, поэтому коллизии не могут тихо создать неверную связь — худший случай — чуть более медленная генерация кода, а не уязвимость безопасности). Риск подбора: 6-значный код, погашаемый через мутацию без ограничения частоты — куда большая поверхность атаки, чем уже принятые в этой кодовой базе истекающие OTP-токены (существующий `ResendOTP` использует 4 цифры с окном 15 минут); сейчас ограничения частоты для `redeemCode` нет — стоит переиспользовать паттерн `RateLimiter` из `convex/rateLimit.ts`, если это станет проблемой (явно не требуется CONTEXT.md, отмечено как дискреционное усиление) |

## Open Questions (RESOLVED)

1. **RESOLVED (пользователь, 2026-08-15):** Оставить как задокументированное приближение — часовой пояс наблюдателя, без поля `timezone` в `profiles`. См. `<context>` плана `06-03-PLAN.md`.

**Чей часовой пояс определяет «сегодня пациента» на карточке наблюдателя?**
   - What we know: Каждый существующий запрос «сегодня/неделя» берёт `timezoneOffsetMinutes` от *запрашивающего* клиента, и нигде в схеме не хранится часовой пояс (у `profiles` нет поля `timezone`).
   - What's unclear: CONTEXT.md вообще не затрагивает этот вопрос — он не обсуждался на `/gsd-discuss-phase`. D-07 покрывает значения диапазона глюкозы, но не «чьи часы».
   - Recommendation: В рамках этой фазы (read-only вид «сегодня», без push, без истории) использовать `timezoneOffsetMinutes` самого наблюдателя как задокументированное приближение — тот же механизм, что уже используется во всём остальном приложении, без изменений схемы, и «ошибка на несколько часов около полуночи» — низкая по серьёзности, самоисправляющаяся проблема (карточка снова покажет верные данные, как только на устройстве наблюдателя наступит локальная полночь). Если планировщику нужна точность, альтернатива — добавить поле `timezone: v.optional(v.string())` (IANA-имя) или `timezoneOffsetMinutes: v.optional(v.number())` в `profiles`, заполняемое с устройства самого пациента при следующем открытии приложения — небольшое расширение скоупа, которое стоит подсветить пользователю перед включением, так как оно не входило в обсуждённые решения.

2. **RESOLVED (планировщик, 2026-08-15):** Да, добавлено — ключ `observerCodeRedeem` (10/час на вызывающего) в `convex/rateLimit.ts`, реализовано в Plan `06-03-PLAN.md` Task 1.

**Нужно ли ограничение частоты для `redeemCode`?**
   - What we know: `convex/rateLimit.ts` уже подключает компонент `RateLimiter` (`@convex-dev/rate-limiter`), сейчас используется только для `aiFeatures`. Постоянный, не истекающий, 6-значный числовой код, погашаемый неограниченное число раз, подбираем перебором при отсутствии ограничения (1 000 000 вариантов ÷ отсутствие лимита = в итоге угадывается скриптованным атакующим).
   - What's unclear: CONTEXT.md не упоминает ограничение частоты; это соображение по усилению безопасности, которое не всплыло на сессии discuss-phase.
   - Recommendation: Отметить пользователю/планировщику как «желательно», но не «обязательно» для этой фазы — ограничение частоты попыток `redeemCode` на вызывающего (например, 10/час) через существующую инфраструктуру `RateLimiter`, по образцу лимитера `aiFeatures` в `convex/rateLimit.ts`. Учитывая `security_enforcement: true` / `security_asvs_level: 1` / `security_block_on: "high"` в `.planning/config.json`, это, вероятно, требует как минимум задокументированного решения в ту или иную сторону.

## Environment Availability

Внешние инструменты, сервисы или среды выполнения сверх уже установленного для этой фазы не требуются — это исключительно схема/функции Convex + UI Expo Router/React Native с использованием существующих зависимостей. Полная таблица аудита пропущена как неприменимая.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **Не установлен** — в `package.json` нет `jest`, `vitest` или `convex-test`; в репозитории нет ни одного файла `*.test.ts(x)` (проверено поиском) |
| Config file | нет |
| Quick run command | н/п |
| Full suite command | н/п |

Это известное, явное состояние проекта, а не упущение: `.planning/STATE.md` документирует `QA-01`/`QA-02` (автотесты бизнес-логики Convex, валидация аргументов) как **отложенные на v2**, и ни одна фаза до сих пор не вводила фреймворк тестирования. Внедрение его сейчас — вне скоупа этой фазы согласно этому уже принятому решению.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OBSV-01 | Наблюдатель погашает код пациента, создаётся связь | manual-only | н/п — фреймворка нет; проверка через Convex dashboard/dev-клиент | ❌ (фреймворка нет) |
| OBSV-02 | Пациент видит/перегенерирует код, делится с несколькими наблюдателями | manual-only | н/п | ❌ |
| OBSV-03 | Один наблюдатель привязывает несколько пациентов, видит всех в одном списке | manual-only | н/п | ❌ |
| OBSV-04 | Кнопка в шапке открывает список наблюдаемых, карточки показывают сегодняшние данные | manual-only | н/п | ❌ |
| OBSV-05 | Карточка показывает предупреждающий бейдж при превышении калорий / глюкозе вне диапазона | manual-only | н/п | ❌ |
| OBSV-06 | Тап по карточке открывает детальный вид, соответствующий главному экрану | manual-only | н/п | ❌ |
| OBSV-07 | Пациент отзывает наблюдателя; наблюдатель самостоятельно убирает пациента | manual-only | н/п | ❌ |

**Обоснование manual-only по всей таблице:** В этом репозитории нет тест-раннера, и его добавление явно вне скоупа текущего майлстоуна проекта (отложено на v2 согласно STATE.md). Вся верификация для этой фазы должна следовать паттерну, уже использованному в предыдущих фазах проекта (см. файлы SUMMARY.md фаз 1/2/3) — ручная проверка через dev-клиент `npm run ios` на реальном dev-деплойменте Convex, с использованием двух разных залогиненных сессий (например, один реальный аккаунт + один гостевой/анонимный) для проверки и роли наблюдателя, и роли пациента.

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (typecheck — подтвердить, что это существующая проверка проекта; автоматической команды тестов, которую можно было бы запустить вместо этого, нет) и ручная smoke-проверка в dev-клиенте для конкретно построенного поведения
- **Per wave merge:** Полный ручной прогон потока погашение→список→карточка→детали→отзыв с двумя аккаунтами
- **Phase gate:** Ручной прогон, покрывающий все 7 требований OBSV, перед `/gsd-verify-work`, так как автоматического набора для гейта нет

### Wave 0 Gaps
- Фреймворка тестирования не существует. Его установка — уже принятое отложенное решение (v2), **не** рекомендуется как часть Wave 0 этой фазы — отметить планировщику/пользователю, если они хотят пересмотреть это решение конкретно для security-чувствительной авторизационной логики этой фазы (Pattern 3 выше), так как «первый в приложении кросс-пользовательский доступ к данным» — это как раз тот случай, для которого настоящий assertion-based тест был бы уместнее ручного тыканья. Это решение для пользователя, а не действие по умолчанию.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | Косвенно | Переиспользует существующую сессию `@convex-dev/auth` (Anonymous/Google/Apple/пароль) — новой поверхности аутентификации не вводится |
| V3 Session Management | Нет | Без изменений — та же сессия Convex Auth, что и у любой другой фичи |
| V4 Access Control | **Да — основная забота этой фазы** | Новая граница авторизации: `assertObserverAccess` (Pattern 3) должен быть единственным, серверным, необходимым (non-bypassable) шлюзом для каждого observer-facing чтения. Это основная ASVS-релевантная поверхность фазы — до сих пор в приложении не было риска broken object-level authorization (BOLA), потому что каждый query по построению читал только данные вызывающего; эта фаза впервые вводит место, где этот инвариант больше не выполняется автоматически |
| V5 Input Validation | Да | Аргумент `code: v.string()` стоит валидировать на ожидаемую форму (6 числовых цифр) до запроса к индексу, чтобы избежать лишних сканирований на некорректном вводе; валидаторы `v.*` Convex уже обеспечивают базовую проверку формы на уровне типов |
| V6 Cryptography | Да — переиспользуется, не новое | Опора `generateNumericToken` на RNG `@oslojs/crypto`, построенный на `crypto.getRandomValues`, уже принятый в проекте источник криптослучайности (используется для OTP-токенов авторизации); новый криптопримитив не нужен |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Broken Object-Level Authorization (BOLA) — query наблюдателя читает произвольный `targetUserId` без проверки существования связи | Elevation of Privilege / Information Disclosure | `assertObserverAccess(ctx, targetUserId)` вызывается в начале каждого observer-facing query/mutation, до любого чтения `ctx.db` данных пациента (Pattern 3) |
| Перебор пейринг-кода — постоянный, не истекающий числовой код угадывается повторными вызовами `redeemCode` | Information Disclosure / Elevation of Privilege | Ограничение частоты `redeemCode` на вызывающего через существующую инфраструктуру `RateLimiter` из `convex/rateLimit.ts` (см. Open Question 2) |
| IDOR в `revokeLink` — удаление произвольной строки связи по id без проверки, что вызывающий — одна из сторон | Tampering / Elevation of Privilege | Проверка владения: `link.observerId === callerId \|\| link.patientId === callerId` перед удалением (Pitfall 5) |
| Осиротевшие строки авторизации после удаления аккаунта — старые строки `observerLinks` удалённого пользователя всё ещё подразумевают доступ к теперь несуществующему аккаунту либо мешают чисто перепривязаться | Elevation of Privilege (устаревший доступ) / Tampering | Расширить каскад `convex/users/deleteUser.ts` для удаления всех строк `observerLinks`, ссылающихся на удаляемого пользователя (Pitfall 3) |

## Sources

### Primary (HIGH confidence)
- Инспекция кодовой базы (этот репозиторий, 2026-08-14): `convex/tables/*.ts`, `convex/schema.ts`, `convex/meals/getWeekMeals.ts`, `convex/glucose/getWeekReadings.ts`, `convex/movement/getWeekMovement.ts`, `convex/home/getStreak.ts`, `convex/glucose/deleteReading.ts`, `convex/mealItems/getMealItem.ts`, `convex/users/deleteUser.ts`, `convex/utils/otp.ts`, `convex/ResendOTP.ts`, `convex/rateLimit.ts`, `convex/auth.ts`, `components/ui/OTPInput.tsx`, `components/settings/DiagnosticsSection.tsx`, `components/settings/SettingsGroup.tsx`, `components/settings/SettingsItem.tsx`, `components/home/HomeHeader.tsx`, `components/home/HomeGlucoseSummary.tsx`, `components/home/HomeBloodPressureSummary.tsx`, `app/app/(tabs)/index.tsx`, `app/app/(tabs)/settings.tsx`, `app/app/(settings)/health.tsx`, `app/app/_layout.tsx`, `lib/ui/getColor.ts`, `package.json`, `node_modules/convex/package.json` — все проверены прямым чтением/выполнением команд в ходе этой исследовательской сессии
- `.planning/phases/06-observer-access/06-CONTEXT.md` — зафиксированные решения D-01…D-09 из `/gsd-discuss-phase`
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/seeds/observer-access.md`, `.planning/ROADMAP.md` — история решений проекта

### Secondary (MEDIUM confidence)
- [ADA Checking Your Blood Sugar](https://diabetes.org/living-with-diabetes/treatment-care/checking-your-blood-sugar) — натощак/до еды 80–130 мг/дл, после еды <180 мг/дл, получено напрямую 2026-08-14
- [ADA 2026 Standards of Care — Glycemic Goals, Hypoglycemia, and Hyperglycemic Crises](https://diabetesjournals.org/care/article/49/Supplement_1/S132/163927/6-Glycemic-Goals-Hypoglycemia-and-Hyperglycemic) — порог тревоги по гипогликемии <70 мг/дл (<3.9 ммоль/л), Level 1 hypoglycemia 54–70 мг/дл
- Пересчёт значений ADA из мг/дл в ммоль/л выполнен по стандартному коэффициенту (мг/дл ÷ 18.0182 = ммоль/л), не проверен по каждому значению отдельно во внешнем источнике — небольшой остаточный риск расхождения в округлении с любой конкретной внешней таблицей

### Tertiary (LOW confidence)
- Общий референсный диапазон сахара крови «в произвольный момент» (70–140 мг/дл) — агрегирован из общемедицинских источников (MedicineNet, обсуждения Mayo Clinic Connect) через WebSearch, не конкретная пронумерованная цель ADA; отмечено в Assumptions Log A2

## Metadata

**Confidence breakdown:**
- Стандартный стек / архитектура / паттерны кода: HIGH — каждый паттерн напрямую обнаружен в текущей кодовой базе через Read/Bash, а не выведен из обучающих данных
- Клинические диапазоны глюкозы: MEDIUM — цифры ADA по натощак/после еды/гипогликемии хорошо устоявшиеся и перекрёстно проверены по двум источникам ADA; fallback для контекста "random" слабее (Tertiary/LOW), а применимость общепопуляционных диабетических целей к конкретному составу пользователей этого приложения — явное допущение (A1)
- Пороговые проблемы (pitfalls): HIGH для авторизации/каскадного удаления/коллизии кода (выведены напрямую из чтения реальных путей кода, с которыми они взаимодействуют); MEDIUM для проблемы часового пояса (пробел определён верно, но «правильное» решение — продуктовое, а не техническое)

**Research date:** 2026-08-14
**Valid until:** 30 дней (стабильные внутренние паттерны кодовой базы; клинические диапазоны — стабильные многолетние рекомендации, маловероятны изменения в пределах срока действия)

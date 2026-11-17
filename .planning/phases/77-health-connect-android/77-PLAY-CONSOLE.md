# Phase 77: Play Console — тексты для Data safety и Health apps declaration

Готовые обоснования для Task 3 плана 77-07. Приложение: Teren (TerenAI). Все 4 разрешения только на чтение (`READ_*`), запись в Health Connect не выполняется.

Политика конфиденциальности (ссылка из приложения, Paywall.tsx и экран «Здоровье»):
https://docs.google.com/document/d/e/2PACX-1vTyNCLjuAHdtZmdZQpIfOolwZ2nE7pA5kKTH3jrszZEgkSzfJMMBXdawf7yva_GFIoMiJ9vS63IplTy/pub

Исходник политики в репозитории: `docs/privacy-policy.html`.

## Политика конфиденциальности (обновлено 2026-11-13)

`docs/privacy-policy.html` (EN и RU) обновлён: в разделе B добавлен пункт про Health Connect (шаги, активные калории, дистанция, глюкоза только для треков «диабет»/«биохакинг», только чтение, отзыв доступа), абзац «не для рекламы, не продаётся, не передаётся третьим лицам, хранится только на Convex», Health Connect в правах пользователя, дата 13 ноября 2026.

Осталось вручную: перенести те же изменения в Google Doc по ссылке выше (её открывает приложение и указывает Play Console) и опубликовать.

## Data safety (App content -> Data safety)

| Раздел | Что указать |
|--------|-------------|
| Data collected | Health info (Health Connect: blood glucose); Fitness info (steps, active calories, distance) |
| Collected / Shared | Collected: да. Shared: нет (не передаётся третьим лицам; хранение на Convex как обработчик сервиса не считается sharing по определению Google) |
| Processing | Обрабатывается и отправляется на сервер приложения, шифруется при передаче |
| Required / Optional | Optional (пользователь сам подключает на экране «Здоровье»), можно отозвать в Health Connect |
| Purposes | App functionality, Personalization. НЕ Advertising/Marketing |
| Deletion | Пользователь может удалить аккаунт и данные в настройках приложения |

## Health apps declaration: функции

- Activity and fitness (шаги, активная энергия, дистанция)
- Nutrition and weight management (учёт активности рядом с калориями)
- Diseases and conditions management (глюкоза; категория уточняется по подсказкам формы, в исследовании помечена как допущение)

## Обоснования по типам данных

### 1. Steps (READ_STEPS)

EN: Teren is a calorie and nutrition tracker. We read the user's daily step count from Health Connect to show steps for the day on the home screen next to eaten calories, so the user sees their activity and food balance in one place. Read-only; we never write steps to Health Connect. Data is used only to display this to the user, is not shared with third parties and is not used for advertising.

RU: Teren — трекер калорий и питания. Мы читаем дневное количество шагов из Health Connect, чтобы показать шаги за день на главном экране рядом с съеденными калориями: пользователь видит баланс активности и питания в одном месте. Только чтение, запись в Health Connect не выполняется. Данные используются только для показа пользователю, не передаются третьим лицам и не используются для рекламы.

### 2. Active calories burned (READ_ACTIVE_CALORIES_BURNED)

EN: We read active calories burned per day to show the user's activity energy on the home screen and day history next to calories consumed, helping them judge their daily energy balance toward their weight goal. Read-only. Used solely to display this to the user; not shared with third parties, not used for advertising.

RU: Мы читаем активные сожжённые калории за день, чтобы показать расход энергии на активность на главном экране и в истории дня рядом с потреблёнными калориями. Это помогает пользователю оценивать дневной энергетический баланс относительно цели по весу. Только чтение. Данные используются только для показа пользователю, не передаются третьим лицам и не используются для рекламы.

### 3. Distance (READ_DISTANCE)

EN: We read the distance the user walked or ran per day to show it as part of the daily activity summary on the home screen and day history, alongside steps and active calories. Read-only. Used only to display the summary to the user; not shared with third parties, not used for advertising.

RU: Мы читаем пройденную за день дистанцию, чтобы показать её в сводке дневной активности на главном экране и в истории дня вместе с шагами и активными калориями. Только чтение. Данные используются только для показа сводки пользователю, не передаются третьим лицам и не используются для рекламы.

### 4. Blood glucose (READ_BLOOD_GLUCOSE)

EN: For users who chose the Diabetes or Biohacking tracking track, we import blood glucose readings from Health Connect (for example from a connected glucometer or CGM) into the in-app glucose diary, so the user does not have to enter every reading manually and can see glucose next to their meals. The data type is requested only for these tracks, only after the user's explicit consent, and is read-only. Readings are shown to the user in their own diary with a "Health Connect" source label; they are not shared with third parties, not used for advertising, credit, insurance or employment decisions. The app is informational and is not a medical device.

RU: Для пользователей с треком «Диабет» или «Биохакинг» мы импортируем показания глюкозы из Health Connect (например, с подключённого глюкометра или CGM) в дневник сахара в приложении, чтобы не вводить каждое показание вручную и видеть глюкозу рядом с приёмами пищи. Тип данных запрашивается только для этих треков, только после явного согласия пользователя и только на чтение. Показания видны пользователю в его дневнике с подписью «Health Connect»; не передаются третьим лицам и не используются для рекламы, решений о кредите, страховке или найме. Приложение носит информационный характер и не является медицинским изделием.

## Порядок действий

1. Обновить политику конфиденциальности (см. предупреждение выше).
2. Play Console -> Приложение Teren -> Policy -> App content -> Data safety: заполнить по таблице.
3. App content -> Health apps: выбрать функции, вставить обоснования 1-4.
4. Отправить на ревью до релиза в closed testing/production. Dev/internal-сборки можно проверять до одобрения.

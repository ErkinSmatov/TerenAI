import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import { DataModel } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

// Фаза 71, D-10: бэкфилл eatenAt до переключения чтений. Идемпотентна —
// строки с уже заполненным eatenAt пропускаются.
export const backfillMealEatenAt = migrations.define({
  table: "meals",
  migrateOne: (_ctx, meal) => {
    if (meal.eatenAt === undefined) return { eatenAt: meal._creationTime };
  },
});

// Фаза 78, D-13: все связи, созданные до подтверждаемого наблюдения, становятся
// active; идемпотентна — строки со статусом пропускаются.
export const backfillObserverLinkStatus = migrations.define({
  table: "observerLinks",
  migrateOne: (_ctx, link) => {
    // status стал обязательным (шаг 2 схемы), но миграция остаётся как история
    // и защита при повторном запуске на данных без статуса.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (link.status === undefined) {
      return {
        status: "active" as const,
        confirmedAt: link._creationTime,
        requestedAt: link._creationTime,
      };
    }
  },
});

// npx convex run migrations:run '{"fn": "migrations:{MIGRATION_NAME}"}'
// npx convex run --component migrations lib:getStatus --watch
//
// Бэкфилл eatenAt:
// 1. npx convex run migrations:run '{"fn": "migrations:backfillMealEatenAt", "dryRun": true}'
// 2. npx convex run migrations:run '{"fn": "migrations:backfillMealEatenAt"}'
// 3. npx convex run --component migrations lib:getStatus
// Для prod — те же команды с флагом --prod.
//
// Бэкфилл статуса observerLinks:
// 1. npx convex run migrations:run '{"fn": "migrations:backfillObserverLinkStatus", "dryRun": true}'
// 2. npx convex run migrations:run '{"fn": "migrations:backfillObserverLinkStatus"}'
// 3. npx convex run --component migrations lib:getStatus
// Для prod — те же команды с флагом --prod. После завершения на всех
// деплойментах — план 11 (обязательный status).

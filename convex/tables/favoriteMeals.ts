import { defineTable } from "convex/server";
import { v } from "convex/values";

// Снимок блюда (D-01): избранное — отдельная сущность.
// sourceMealId — только ключ «уже в избранном», не зависимость:
// исходный meal может быть удалён или изменён.
export const favoriteMealsFields = {
  userId: v.id("users"),
  name: v.string(),
  items: v.array(
    v.object({
      name: v.string(),
      nameRu: v.optional(v.string()),
      grams: v.number(),
    })
  ),
  photoStorageId: v.optional(v.id("_storage")),
  sourceMealId: v.optional(v.id("meals")),
};

export const favoriteMeals = defineTable(favoriteMealsFields)
  .index("byUserId", ["userId"])
  .index("byUserIdAndSourceMealId", ["userId", "sourceMealId"]);

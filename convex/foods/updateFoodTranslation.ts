import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const updateFoodTranslation = internalMutation({
  args: {
    id: v.id("foods"),
    nameRu: v.string(),
    categoryRu: v.optional(v.string()),
  },
  handler: async (ctx, { id, nameRu, categoryRu }) => {
    const food = await ctx.db.get(id);
    if (!food) return;

    await ctx.db.patch(id, {
      name: { ...food.name, ru: nameRu },
      category: food.category
        ? { ...food.category, ru: categoryRu ?? food.category.ru }
        : undefined,
    });
  },
});

export default updateFoodTranslation;

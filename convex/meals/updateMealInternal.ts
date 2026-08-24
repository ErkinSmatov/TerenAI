import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { mealsFields } from "../tables/meals";
import { partial } from "convex-helpers/validators";
import logError from "@/lib/utils/logError";

const {
  userId: _userId,
  totalMacros,
  totalNutrients,
  ...updatableFields
} = mealsFields;

export const updateMealInternal = internalMutation({
  args: {
    id: v.id("meals"),
    userId: v.id("users"),
    meal: v.object(partial(updatableFields)),
  },
  handler: async (ctx, { id, userId, meal }): Promise<null> => {
    try {
      const existingMeal = await ctx.db.get(id);
      if (!existingMeal) throw new Error("Not found");
      if (existingMeal.userId !== userId) throw new Error("Forbidden");

      await ctx.db.patch(id, meal);
      return null;
    } catch (error) {
      logError("updateMealInternal error", error);
      throw error;
    }
  },
});

export default updateMealInternal;

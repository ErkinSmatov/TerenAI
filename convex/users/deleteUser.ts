import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import logError from "@/lib/utils/logError";

const deleteUser = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const profiles = await ctx.db
      .query("profiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();
    for (const profile of profiles) {
      await ctx.db.delete(profile._id);
    }

    // Фото делится между meals и favoriteMeals — удаляем каждый файл один раз.
    const deletedStorageIds = new Set<Id<"_storage">>();
    const deleteStorageOnce = async (storageId: Id<"_storage">) => {
      if (deletedStorageIds.has(storageId)) return;
      deletedStorageIds.add(storageId);
      try {
        await ctx.storage.delete(storageId);
      } catch (error) {
        logError("deleteUser storage delete error", error);
      }
    };

    const meals = await ctx.db
      .query("meals")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    for (const meal of meals) {
      const mealItems = await ctx.db
        .query("mealItems")
        .withIndex("byMealId", (q) => q.eq("mealId", meal._id))
        .collect();

      for (const item of mealItems) {
        await ctx.db.delete(item._id);
      }

      if (meal.photoStorageId) {
        await deleteStorageOnce(meal.photoStorageId);
      }

      await ctx.db.delete(meal._id);
    }

    const favorites = await ctx.db
      .query("favoriteMeals")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();
    for (const favorite of favorites) {
      if (favorite.photoStorageId) {
        await deleteStorageOnce(favorite.photoStorageId);
      }
      await ctx.db.delete(favorite._id);
    }

    const glucoseReadings = await ctx.db
      .query("glucoseReadings")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();
    for (const reading of glucoseReadings) {
      await ctx.db.delete(reading._id);
    }

    const bloodPressureReadings = await ctx.db
      .query("bloodPressureReadings")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();
    for (const reading of bloodPressureReadings) {
      await ctx.db.delete(reading._id);
    }

    const movementData = await ctx.db
      .query("movementData")
      .withIndex("byUserIdAndDate", (q) => q.eq("userId", userId))
      .collect();
    for (const day of movementData) {
      await ctx.db.delete(day._id);
    }

    const sessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    const observedLinks = await ctx.db
      .query("observerLinks")
      .withIndex("byObserverId", (q) => q.eq("observerId", userId))
      .collect();
    for (const link of observedLinks) {
      await ctx.db.delete(link._id);
    }

    const observingLinks = await ctx.db
      .query("observerLinks")
      .withIndex("byPatientId", (q) => q.eq("patientId", userId))
      .collect();
    for (const link of observingLinks) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(userId);
  },
});

export default deleteUser;

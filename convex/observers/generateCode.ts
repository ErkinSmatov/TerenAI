import { mutation, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";
import generateNumericToken from "../utils/otp";
import logError from "@/lib/utils/logError";

const MAX_ATTEMPTS = 10;

/**
 * Генерирует уникальный пятизначный код доступа и записывает его в профиль.
 * Общий хелпер для generateCode (первичная выдача) и regenerateCode (ротация).
 */
export async function issueUniqueCode(
  ctx: MutationCtx,
  profileId: Id<"profiles">
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateNumericToken(5);

    const existing = await ctx.db
      .query("profiles")
      .withIndex("byObserverCode", (q) => q.eq("observerCode", code))
      .first();

    if (!existing) {
      await ctx.db.patch(profileId, { observerCode: code });
      return code;
    }
  }

  throw new Error("Не удалось сгенерировать код");
}

const generateCode = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const profile = await ctx.db
        .query("profiles")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
      if (!profile) throw new Error("Profile not found");

      if (profile.observerCode) return profile.observerCode;

      return await issueUniqueCode(ctx, profile._id);
    } catch (error) {
      logError("generateCode error", error);
      throw error;
    }
  },
});

export default generateCode;

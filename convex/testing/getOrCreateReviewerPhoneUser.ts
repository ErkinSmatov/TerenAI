import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { profilesConfig } from "../../config/profilesConfig";
import testingConfig from "../../config/testingConfig";

const getOrCreateReviewerPhoneUser = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    if (args.phone !== testingConfig.reviewerPhone) {
      throw new Error("Invalid phone");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("phone"), args.phone))
      .first();
    if (user) return user._id;

    const userId = await ctx.db.insert("users", {
      phone: args.phone,
      phoneVerificationTime: Date.now(),
    });
    await ctx.db.insert("profiles", {
      userId,
      ...profilesConfig.defaultValues,
    });
    return userId;
  },
});

export default getOrCreateReviewerPhoneUser;

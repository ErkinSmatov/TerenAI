import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const getFoodByIdentityInternal = internalQuery({
  args: {
    identity: v.union(
      v.object({
        source: v.literal("fdc"),
        id: v.number(),
      }),
      v.object({
        source: v.literal("off"),
        id: v.string(),
      })
    ),
  },
  handler: async (ctx, { identity }) => {
    const food = await ctx.db
      .query("foods")
      .withIndex("byIdentitySourceId", (q) =>
        q.eq("identity.source", identity.source).eq("identity.id", identity.id)
      )
      .first();

    return food;
  },
});

export default getFoodByIdentityInternal;

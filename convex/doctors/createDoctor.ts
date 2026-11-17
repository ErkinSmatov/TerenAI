import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import logError from "@/lib/utils/logError";

// Вызывается только вручную администратором, клиенту недоступна (internal), D-11:
// npx convex run doctors/createDoctor:default '{"userId":"...","fullName":"...","clinic":"...","status":"verified"}'
const MAX_LEN = 200;

const createDoctor = internalMutation({
  args: {
    userId: v.id("users"),
    fullName: v.string(),
    clinic: v.string(),
    status: v.union(v.literal("pending"), v.literal("verified")),
  },
  handler: async (ctx, args) => {
    try {
      const fullName = args.fullName.trim();
      const clinic = args.clinic.trim();
      if (
        fullName.length === 0 ||
        clinic.length === 0 ||
        fullName.length > MAX_LEN ||
        clinic.length > MAX_LEN
      ) {
        throw new Error("Invalid doctor data");
      }

      const user = await ctx.db.get(args.userId);
      if (!user) throw new Error("User not found");

      const existing = await ctx.db
        .query("doctors")
        .withIndex("byUserId", (q) => q.eq("userId", args.userId))
        .first();
      const data = {
        userId: args.userId,
        fullName,
        clinic,
        status: args.status,
      };
      if (existing) {
        await ctx.db.patch(existing._id, data);
        return existing._id;
      }
      return await ctx.db.insert("doctors", data);
    } catch (error) {
      logError("createDoctor error", error);
      throw error;
    }
  },
});

export default createDoctor;

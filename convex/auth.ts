import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import Apple, { AppleProfile } from "@auth/core/providers/apple";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { ResendOTP } from "./ResendOTP";
import { WhatsAppOTP } from "./WhatsAppOTP";
import { TelegramOTP } from "./TelegramOTP";
import { MutationCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { profilesConfig } from "../config/profilesConfig";
import testingConfig from "../config/testingConfig";

type AppleProfileWithUser = AppleProfile & {
  user?: {
    name: {
      firstName: string;
      lastName: string;
    };
  };
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    Apple({
      profile: (appleInfo: AppleProfileWithUser) => {
        const name = appleInfo.user
          ? `${appleInfo.user.name.firstName} ${appleInfo.user.name.lastName}`
          : undefined;
        return {
          id: appleInfo.sub,
          name: name,
          email: appleInfo.email,
        };
      },
    }),
    ResendOTP,
    WhatsAppOTP,
    TelegramOTP,
    // Гостевой вход: создаёт настоящего пользователя без email/провайдера,
    // поэтому все auth-гейтнутые функции и <Stack.Protected> работают без правок.
    Anonymous,
    ConvexCredentials({
      id: "password",
      authorize: async (credentials, ctx) => {
        const email = credentials.email as string;
        const password = credentials.password as string;

        if (
          email === testingConfig.testEmail &&
          password === testingConfig.testPassword
        ) {
          const userId = await ctx.runMutation(
            api.testing.getOrCreateTestUser.default,
            { email, password }
          );
          return { userId };
        }
        return null;
      },
    }),
    // Вход для ревьюера App Store по тестовому номеру: без отправки и проверки
    // кода. Принимает только testingConfig.reviewerPhone.
    ConvexCredentials({
      id: "phone-review",
      authorize: async (credentials, ctx) => {
        if (credentials.phone !== testingConfig.reviewerPhone) return null;
        const userId = await ctx.runMutation(
          internal.testing.getOrCreateReviewerPhoneUser.default,
          { phone: testingConfig.reviewerPhone }
        );
        return { userId };
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx: MutationCtx, { userId }) {
      const profile = await ctx.db
        .query("profiles")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();

      if (profile === null) {
        await ctx.db.insert("profiles", {
          userId,
          ...profilesConfig.defaultValues,
        });
      }
    },
  },
});

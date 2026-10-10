import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

const DAY = 24 * HOUR;

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  aiFeatures: {
    kind: "fixed window",
    rate: 50,
    period: DAY,
  },
  observerCodeRedeem: {
    kind: "fixed window",
    rate: 10,
    period: HOUR,
  },
  // Ключ — сам угадываемый код, а не вызывающий аккаунт. observerCodeRedeem
  // выше сбрасывается созданием нового аккаунта (100 000 значений кода —
  // перебираемое пространство при неограниченном числе аккаунтов); этот
  // лимитер ограничивает попытки против ОДНОГО конкретного кода независимо
  // от того, сколько аккаунтов их делает.
  observerCodeGuess: {
    kind: "fixed window",
    rate: 10,
    period: HOUR,
  },
  // Ключ — mealId (см. retryProcessDetectedItems.ts, план 07-03), а не
  // userId: ограничивает число повторных попыток фонового шага для ОДНОГО
  // конкретного блюда независимо от общего лимита aiFeatures.
  mealRetry: {
    kind: "fixed window",
    rate: 10,
    period: HOUR,
  },
  // Ключ — номер телефона, общий для обоих каналов (Telegram и WhatsApp).
  // Защищает платную отправку ($0.01 Telegram, Twilio) от спама.
  otpSend: {
    kind: "fixed window",
    rate: 5,
    period: HOUR,
  },
  // Вызывается без key (один счётчик на деплоймент): закрывает обход otpSend
  // перебором номеров. 500 кодов/сутки ≈ $5 Telegram; значение поднимается
  // при росте аудитории.
  otpSendGlobal: {
    kind: "fixed window",
    rate: 500,
    period: DAY,
  },
});

export const { getRateLimit: getAiFeaturesRateLimit, getServerTime } =
  rateLimiter.hookAPI("aiFeatures", {
    key: async (ctx) => {
      const userId = await getAuthUserId(ctx);
      return userId ?? "anonymous";
    },
  });

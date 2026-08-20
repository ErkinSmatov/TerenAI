import { Phone } from "@convex-dev/auth/providers/Phone";
import generateNumericToken from "./utils/otp";

export const TelegramOTP = Phone({
  id: "telegram-otp",
  maxAge: 60 * 15, // 15 minutes
  generateVerificationToken() {
    return Promise.resolve(generateNumericToken(4));
  },
  async sendVerificationRequest({ identifier: phone, token }) {
    const response = await fetch(
      "https://gatewayapi.telegram.org/sendVerificationMessage",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TELEGRAM_GATEWAY_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: phone,
          code: token,
        }),
      }
    );

    const result = (await response.json()) as {
      ok: boolean;
      error?: string;
    };

    if (!result.ok) {
      throw new Error(`Telegram Gateway error: ${result.error}`);
    }
  },
});

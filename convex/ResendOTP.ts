import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";
import generateNumericToken from "./utils/otp";

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15, // 15 minutes
  generateVerificationToken() {
    return generateNumericToken(4);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "TerenAI <sign-in@terenaiapp.com>",
      to: [email],
      subject: `Вход в TerenAI`,
      text: "Ваш код: " + token,
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});

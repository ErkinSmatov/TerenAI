import { Phone } from "@convex-dev/auth/providers/Phone";
import { encodeBase64 } from "@oslojs/encoding";
import generateNumericToken from "./utils/otp";

export const WhatsAppOTP = Phone({
  id: "whatsapp-otp",
  maxAge: 60 * 15, // 15 minutes
  generateVerificationToken() {
    return Promise.resolve(generateNumericToken(4));
  },
  async sendVerificationRequest({ identifier: phone, token }) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    const credentials = encodeBase64(
      new TextEncoder().encode(`${accountSid}:${authToken}`)
    );

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          Channel: "whatsapp",
          CustomCode: token,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio Verify error: ${await response.text()}`);
    }
  },
});

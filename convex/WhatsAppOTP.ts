import { Phone } from "@convex-dev/auth/providers/Phone";
import { encodeBase64 } from "@oslojs/encoding";
import { ConvexError } from "convex/values";
import logError from "../lib/utils/logError";
import tryCatch from "../lib/utils/tryCatch";
import { rateLimiter } from "./rateLimit";
import generateNumericToken from "./utils/otp";
import {
  classifyTwilioError,
  maskPhone,
  type OtpErrorCode,
  type OtpErrorData,
} from "./utils/otpErrors";

const CHANNEL = "whatsapp" as const;

type TwilioError = { code?: number; message?: string; more_info?: string };

function fail(code: OtpErrorCode): never {
  throw new ConvexError<OtpErrorData>({ code, channel: CHANNEL });
}

export const WhatsAppOTP = Phone({
  id: "whatsapp-otp",
  maxAge: 60 * 15, // 15 minutes
  generateVerificationToken() {
    return Promise.resolve(generateNumericToken(4));
  },
  async sendVerificationRequest({ identifier: phone, token }, ctx) {
    const { ok } = await rateLimiter.limit(ctx, "otpSend", { key: phone });
    if (!ok) fail("RATE_LIMITED");

    const global = await rateLimiter.limit(ctx, "otpSendGlobal");
    if (!global.ok) {
      logError(
        "otpSendGlobal limit reached",
        new Error(`channel ${CHANNEL}`)
      );
      fail("SERVICE_UNAVAILABLE");
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    const missing = [
      !accountSid && "TWILIO_ACCOUNT_SID",
      !authToken && "TWILIO_AUTH_TOKEN",
      !verifyServiceSid && "TWILIO_VERIFY_SERVICE_SID",
    ].filter(Boolean);
    if (!accountSid || !authToken || !verifyServiceSid) {
      logError(
        "WhatsAppOTP config error",
        new Error(`${missing.join(", ")} is not set`)
      );
      return fail("SERVICE_UNAVAILABLE");
    }

    const credentials = encodeBase64(
      new TextEncoder().encode(`${accountSid}:${authToken}`)
    );

    const { data: response, error: fetchError } = await tryCatch(
      fetch(
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
      )
    );
    if (fetchError) {
      logError(
        "WhatsAppOTP network error",
        new Error(`${fetchError.message} ${maskPhone(phone)}`)
      );
      return fail("UNKNOWN");
    }

    if (!response.ok) {
      const { data: body } = await tryCatch(
        response.json() as Promise<TwilioError>
      );
      const message = body?.message ?? "";
      const code = classifyTwilioError(response.status, body?.code, message);
      const isCustomCodeRejected =
        body?.code === 60200 && message.includes("CustomCode");
      const prefix = isCustomCodeRejected
        ? "CUSTOM_CODE_REJECTED: see 72-RESEARCH Open Question 4. "
        : "";
      logError(
        "WhatsAppOTP send error",
        new Error(
          `${prefix}Twilio Verify ${response.status} ${body?.code}: ${message} ${maskPhone(phone)}`
        )
      );
      fail(code);
    }
  },
});

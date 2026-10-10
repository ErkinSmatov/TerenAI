import { Phone } from "@convex-dev/auth/providers/Phone";
import { ConvexError } from "convex/values";
import logError from "../lib/utils/logError";
import tryCatch from "../lib/utils/tryCatch";
import { rateLimiter } from "./rateLimit";
import generateNumericToken from "./utils/otp";
import {
  classifyTelegramError,
  maskPhone,
  type OtpErrorCode,
  type OtpErrorData,
} from "./utils/otpErrors";

const CHANNEL = "telegram" as const;
const GATEWAY_URL = "https://gatewayapi.telegram.org";

type GatewayResponse = {
  ok: boolean;
  error?: string;
  result?: { request_id?: string };
};

function fail(code: OtpErrorCode): never {
  throw new ConvexError<OtpErrorData>({ code, channel: CHANNEL });
}

async function callGateway(
  method: "checkSendAbility" | "sendVerificationMessage",
  accessToken: string,
  body: Record<string, string>,
  phone: string
): Promise<GatewayResponse> {
  const { data: response, error: fetchError } = await tryCatch(
    fetch(`${GATEWAY_URL}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
  );
  if (fetchError) {
    logError(
      "TelegramOTP network error",
      new Error(`${method} ${fetchError.message} ${maskPhone(phone)}`)
    );
    return fail("UNKNOWN");
  }

  const { data: result, error: parseError } = await tryCatch(
    response.json() as Promise<GatewayResponse>
  );
  if (parseError) {
    logError(
      "TelegramOTP send error",
      new Error(
        `${method} invalid JSON, HTTP ${response.status} ${maskPhone(phone)}`
      )
    );
    return fail("UNKNOWN");
  }
  return result;
}

export const TelegramOTP = Phone({
  id: "telegram-otp",
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

    const accessToken = process.env.TELEGRAM_GATEWAY_TOKEN;
    if (!accessToken) {
      logError(
        "TelegramOTP config error",
        new Error("TELEGRAM_GATEWAY_TOKEN is not set")
      );
      return fail("SERVICE_UNAVAILABLE");
    }

    // Шаг A: достижим ли номер через Telegram (D-09/D-12).
    const check = await callGateway(
      "checkSendAbility",
      accessToken,
      { phone_number: phone },
      phone
    );
    if (!check.ok) {
      logError(
        "TelegramOTP send error",
        new Error(`checkSendAbility ${check.error} ${maskPhone(phone)}`)
      );
      fail(classifyTelegramError(check.error, "check"));
    }
    const requestId = check.result?.request_id;
    if (!requestId) {
      logError(
        "TelegramOTP send error",
        new Error(`checkSendAbility no request_id ${maskPhone(phone)}`)
      );
      fail("UNKNOWN");
    }

    // Шаг B: отправка с request_id (повторная оплата не взимается).
    const sent = await callGateway(
      "sendVerificationMessage",
      accessToken,
      { phone_number: phone, code: token, request_id: requestId },
      phone
    );
    if (!sent.ok) {
      logError(
        "TelegramOTP send error",
        new Error(`sendVerificationMessage ${sent.error} ${maskPhone(phone)}`)
      );
      fail(classifyTelegramError(sent.error, "send"));
    }
  },
});

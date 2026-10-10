// Чистый модуль без runtime-импортов: используется в Convex, на клиенте и в
// node-скрипте scripts/checks/otpErrors.check.mjs.

export type OtpChannel = "telegram" | "whatsapp";

export const OTP_ERROR_CODES = [
  "CHANNEL_UNREACHABLE",
  "INVALID_PHONE",
  "RATE_LIMITED",
  "SERVICE_UNAVAILABLE",
  "UNKNOWN",
] as const;

export type OtpErrorCode = (typeof OTP_ERROR_CODES)[number];

export type OtpErrorData = { code: OtpErrorCode; channel: OtpChannel };

// Строки ошибок, кроме ACCESS_TOKEN_INVALID, — допущение A3 из RESEARCH.
export function classifyTelegramError(
  error: string | undefined,
  stage: "check" | "send"
): OtpErrorCode {
  if (error) {
    if (error.startsWith("FLOOD_WAIT")) return "RATE_LIMITED";
    if (error === "PHONE_NUMBER_INVALID") return "INVALID_PHONE";
    if (
      error === "BALANCE_NOT_ENOUGH" ||
      error === "ACCESS_TOKEN_INVALID" ||
      error === "ACCESS_TOKEN_REQUIRED"
    ) {
      return "SERVICE_UNAVAILABLE";
    }
    if (
      error === "PHONE_NUMBER_NOT_FOUND" ||
      error === "PHONE_NUMBER_NOT_AVAILABLE"
    ) {
      return "CHANNEL_UNREACHABLE";
    }
  }
  // Цель проверки — выяснить, достижим ли номер через Telegram.
  return stage === "check" ? "CHANNEL_UNREACHABLE" : "UNKNOWN";
}

// Коды Twilio — допущение A6 из RESEARCH.
export function classifyTwilioError(
  httpStatus: number,
  code: number | undefined,
  message: string
): OtpErrorCode {
  if (code === 63015 || code === 63016 || code === 63003 || code === 60410) {
    return "CHANNEL_UNREACHABLE";
  }
  if (code === 60203 || httpStatus === 429) return "RATE_LIMITED";
  if (code === 60200) {
    // Отказ по CustomCode — проблема конфигурации сервиса, не номера.
    return message.includes("To") ? "INVALID_PHONE" : "SERVICE_UNAVAILABLE";
  }
  if (
    code === 20003 ||
    code === 20404 ||
    httpStatus === 401 ||
    httpStatus === 403 ||
    httpStatus === 404
  ) {
    return "SERVICE_UNAVAILABLE";
  }
  return "UNKNOWN";
}

export function maskPhone(phone: string): string {
  if (phone.length <= 6) return "*".repeat(phone.length);
  return phone.slice(0, 2) + "*".repeat(phone.length - 6) + phone.slice(-4);
}

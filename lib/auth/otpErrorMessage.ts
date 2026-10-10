import type { OtpErrorData, OtpErrorCode } from "@/convex/utils/otpErrors";

export type PhoneOtpProvider = "whatsapp-otp" | "telegram-otp";

// Дублирует OTP_ERROR_CODES из convex/utils/otpErrors.ts (runtime-импорт из
// convex/ в чистый клиентский модуль нежелателен). Держать в синхроне.
const ERROR_CODES: readonly OtpErrorCode[] = [
  "CHANNEL_UNREACHABLE",
  "INVALID_PHONE",
  "RATE_LIMITED",
  "SERVICE_UNAVAILABLE",
  "UNKNOWN",
];

export function isOtpErrorData(value: unknown): value is OtpErrorData {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.code === "string" &&
    (ERROR_CODES as readonly string[]).includes(v.code) &&
    (v.channel === "telegram" || v.channel === "whatsapp")
  );
}

const channelNames: Record<PhoneOtpProvider, string> = {
  "telegram-otp": "Telegram",
  "whatsapp-otp": "WhatsApp",
};

export function getOtpErrorMessage(
  data: unknown,
  provider: PhoneOtpProvider
): { text: string; suggestedProvider?: PhoneOtpProvider } {
  // Канал в тексте берётся из выбранного provider, а не из data.
  const other: PhoneOtpProvider =
    provider === "telegram-otp" ? "whatsapp-otp" : "telegram-otp";
  const name = channelNames[provider];
  const otherName = channelNames[other];
  const code: OtpErrorCode = isOtpErrorData(data) ? data.code : "UNKNOWN";

  switch (code) {
    case "CHANNEL_UNREACHABLE":
      return {
        text: `Не удалось отправить код в ${name} — попробуйте ${otherName}`,
        suggestedProvider: other,
      };
    case "RATE_LIMITED":
      return {
        text: "Слишком много запросов кода. Попробуйте позже",
        suggestedProvider: undefined,
      };
    case "INVALID_PHONE":
      return {
        text: "Проверьте номер телефона",
        suggestedProvider: undefined,
      };
    case "SERVICE_UNAVAILABLE":
    case "UNKNOWN":
    default:
      return {
        text: `Не удалось отправить код в ${name} — попробуйте ${otherName} или повторите позже`,
        suggestedProvider: other,
      };
  }
}

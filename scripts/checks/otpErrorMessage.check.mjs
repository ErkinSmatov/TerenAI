// Проверка текстов ошибок отправки OTP без тестового фреймворка.
// Запуск: node --experimental-strip-types --no-warnings scripts/checks/otpErrorMessage.check.mjs
import assert from "node:assert/strict";

const { getOtpErrorMessage: g, isOtpErrorData: is } = await import(
  "../../lib/auth/otpErrorMessage.ts"
);

assert.deepEqual(
  g({ code: "CHANNEL_UNREACHABLE", channel: "telegram" }, "telegram-otp"),
  {
    text: "Не удалось отправить код в Telegram — попробуйте WhatsApp",
    suggestedProvider: "whatsapp-otp",
  }
);
assert.deepEqual(
  g({ code: "CHANNEL_UNREACHABLE", channel: "whatsapp" }, "whatsapp-otp"),
  {
    text: "Не удалось отправить код в WhatsApp — попробуйте Telegram",
    suggestedProvider: "telegram-otp",
  }
);

const unknownTg =
  "Не удалось отправить код в Telegram — попробуйте WhatsApp или повторите позже";
assert.equal(
  g({ code: "SERVICE_UNAVAILABLE", channel: "telegram" }, "telegram-otp").text,
  unknownTg
);
assert.equal(
  g({ code: "UNKNOWN", channel: "telegram" }, "telegram-otp").text,
  unknownTg
);

const rl = g({ code: "RATE_LIMITED", channel: "whatsapp" }, "whatsapp-otp");
assert.equal(rl.text, "Слишком много запросов кода. Попробуйте позже");
assert.equal(rl.suggestedProvider, undefined);

assert.equal(
  g({ code: "INVALID_PHONE", channel: "telegram" }, "telegram-otp").text,
  "Проверьте номер телефона"
);

for (const bad of [undefined, "Server Error", { code: "WEIRD" }]) {
  assert.equal(g(bad, "telegram-otp").text, unknownTg);
}

assert.equal(is({ code: "RATE_LIMITED", channel: "telegram" }), true);
assert.equal(is({ code: "X", channel: "telegram" }), false);
assert.equal(is(null), false);

console.log("otpErrorMessage: OK");

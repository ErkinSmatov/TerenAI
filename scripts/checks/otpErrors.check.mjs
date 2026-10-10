// Проверка классификаторов ошибок OTP без тестового фреймворка.
// Запуск: node --experimental-strip-types --no-warnings scripts/checks/otpErrors.check.mjs
import assert from "node:assert/strict";

const m = await import("../../convex/utils/otpErrors.ts");
const { classifyTelegramError: tg, classifyTwilioError: tw, maskPhone } = m;

assert.equal(tg("PHONE_NUMBER_INVALID", "check"), "INVALID_PHONE");
assert.equal(tg("FLOOD_WAIT_120", "send"), "RATE_LIMITED");
assert.equal(tg("BALANCE_NOT_ENOUGH", "check"), "SERVICE_UNAVAILABLE");
assert.equal(tg("ACCESS_TOKEN_INVALID", "send"), "SERVICE_UNAVAILABLE");
assert.equal(tg("PHONE_NUMBER_NOT_FOUND", "send"), "CHANNEL_UNREACHABLE");
assert.equal(tg("SOMETHING_NEW", "check"), "CHANNEL_UNREACHABLE");
assert.equal(tg("SOMETHING_NEW", "send"), "UNKNOWN");
assert.equal(tg(undefined, "send"), "UNKNOWN");

for (const code of [63015, 63016, 63003, 60410]) {
  assert.equal(tw(400, code, "..."), "CHANNEL_UNREACHABLE");
}
assert.equal(tw(429, 60203, "..."), "RATE_LIMITED");
assert.equal(tw(429, undefined, ""), "RATE_LIMITED");
assert.equal(tw(400, 60200, "Invalid parameter `To`: +7..."), "INVALID_PHONE");
assert.equal(
  tw(400, 60200, "Invalid parameter: CustomCode"),
  "SERVICE_UNAVAILABLE"
);
assert.equal(tw(401, 20003, ""), "SERVICE_UNAVAILABLE");
assert.equal(tw(404, 20404, ""), "SERVICE_UNAVAILABLE");
assert.equal(tw(500, undefined, ""), "UNKNOWN");

assert.equal(maskPhone("+77011234567"), "+7******4567");

console.log("otpErrors: OK");

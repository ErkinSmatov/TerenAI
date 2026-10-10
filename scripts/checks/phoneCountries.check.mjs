import assert from "node:assert/strict";

const m = await import("../../lib/auth/phoneCountries.ts");
const {
  PHONE_COUNTRIES,
  DEFAULT_PHONE_COUNTRY,
  extractNationalDigits,
  formatNationalNumber,
  toE164,
  isCompleteNationalNumber,
} = m;

const c = (iso) => PHONE_COUNTRIES.find((x) => x.iso === iso);
const KZ = c("KZ");
const UZ = c("UZ");
const AM = c("AM");

assert.equal(DEFAULT_PHONE_COUNTRY.iso, "KZ");
assert.equal(toE164(KZ, "7011234567"), "+77011234567");
assert.equal(toE164(UZ, "901234567"), "+998901234567");

assert.equal(extractNationalDigits(KZ, "8 701 123 45 67"), "7011234567");
assert.equal(extractNationalDigits(KZ, "+7 701 123 45 67"), "7011234567");
assert.equal(extractNationalDigits(UZ, "+998 90 123 45 67"), "901234567");
assert.equal(extractNationalDigits(UZ, "90 123 45 67 99"), "901234567");
assert.equal(extractNationalDigits(UZ, "8901234567"), "890123456");

assert.equal(formatNationalNumber(KZ, "7011234567"), "+7 701 123 45 67");
assert.equal(formatNationalNumber(KZ, "70"), "+7 70");
assert.equal(formatNationalNumber(UZ, "901234567"), "+998 90 123 45 67");
assert.equal(formatNationalNumber(AM, "77123456"), "+374 77 123 456");
assert.equal(formatNationalNumber(KZ, ""), "+7 ");

assert.equal(isCompleteNationalNumber(UZ, "90123456"), false);
assert.equal(isCompleteNationalNumber(UZ, "901234567"), true);

for (const country of PHONE_COUNTRIES) {
  const full = "1".repeat(country.nationalDigits);
  assert.match(toE164(country, full), /^\+[1-9]\d{7,14}$/, country.iso);
  assert.equal(
    country.groups.reduce((a, b) => a + b, 0),
    country.nationalDigits,
    `${country.iso} groups`,
  );
}

console.log("phoneCountries: OK");

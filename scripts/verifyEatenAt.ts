import assert from "node:assert/strict";
import { getMealTime } from "@/lib/meals/getMealTime";
import {
  MAX_CLOCK_SKEW_MS,
  resolveEatenAt,
} from "@/convex/utils/resolveEatenAt";
import {
  parseLocalDate,
  resolveAddDate,
  toLocalDateString,
} from "@/lib/utils/parseLocalDate";
import { buildEatenAt, getDefaultBarcodeEatenAt } from "@/lib/meals/mealSlots";

// getMealTime
assert.strictEqual(getMealTime({ _creationTime: 100 }), 100);
assert.strictEqual(getMealTime({ _creationTime: 100, eatenAt: 50 }), 50);

// resolveEatenAt
const now = Date.now();
assert.strictEqual(resolveEatenAt(undefined, now), now);
const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000;
assert.strictEqual(resolveEatenAt(twoYearsAgo, now), twoYearsAgo);
assert.strictEqual(resolveEatenAt(now + 60_000, now), now + 60_000);
assert.strictEqual(MAX_CLOCK_SKEW_MS, 5 * 60_000);
for (const bad of [now + 6 * 60_000, NaN, Infinity, 0, -1]) {
  assert.throws(() => resolveEatenAt(bad, now), /Invalid eatenAt/);
}

// parseLocalDate
assert.strictEqual(parseLocalDate("2026-02-31"), null);
assert.strictEqual(parseLocalDate("2026-3-1"), null);
assert.strictEqual(parseLocalDate(undefined), null);
const parsed = parseLocalDate("2026-03-29");
assert.ok(parsed);
assert.strictEqual(parsed.target.getFullYear(), 2026);
assert.strictEqual(parsed.target.getMonth(), 2);
assert.strictEqual(parsed.target.getDate(), 29);
assert.strictEqual(parsed.day, 29);

// toLocalDateString
assert.strictEqual(toLocalDateString(new Date(2026, 0, 5)), "2026-01-05");

// resolveAddDate
const nowDate = new Date();
const dayOffset = (n: number) =>
  toLocalDateString(
    new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + n)
  );
assert.strictEqual(resolveAddDate(dayOffset(1), now), null);
assert.strictEqual(resolveAddDate(dayOffset(0), now)?.isToday, true);
assert.strictEqual(resolveAddDate(dayOffset(-1), now)?.isToday, false);
assert.strictEqual(resolveAddDate("мусор", now), null);

// buildEatenAt в день перехода на летнее время (TZ=Europe/Berlin)
const built = new Date(buildEatenAt(new Date(2026, 2, 29), 20, 0));
assert.strictEqual(built.getHours(), 20);
assert.strictEqual(built.getDate(), 29);

// getDefaultBarcodeEatenAt
const yesterday = new Date(
  nowDate.getFullYear(),
  nowDate.getMonth(),
  nowDate.getDate() - 1
);
const barcodeAt = getDefaultBarcodeEatenAt(yesterday, now);
assert.ok(barcodeAt <= now);
const barcodeDate = new Date(barcodeAt);
assert.strictEqual(barcodeDate.getDate(), yesterday.getDate());
assert.strictEqual(barcodeDate.getMonth(), yesterday.getMonth());
assert.strictEqual(barcodeDate.getHours(), nowDate.getHours());
assert.strictEqual(barcodeDate.getMinutes(), nowDate.getMinutes());

console.log("verifyEatenAt: OK");

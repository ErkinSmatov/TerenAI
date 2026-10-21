import assert from "node:assert/strict";
import { pickLatestTokenRows } from "@/lib/notifications/tokenDedupe";

type Row = { id: string; expoPushToken: string; updatedAt: number };

// 1. Пустой список
assert.deepStrictEqual(pickLatestTokenRows<Row>([]), { keep: [], remove: [] });

// 2. Три строки одного токена — остаётся с максимальным updatedAt
const three: Row[] = [
  { id: "a", expoPushToken: "T", updatedAt: 1 },
  { id: "b", expoPushToken: "T", updatedAt: 3 },
  { id: "c", expoPushToken: "T", updatedAt: 2 },
];
const r3 = pickLatestTokenRows(three);
assert.deepStrictEqual(r3.keep.map((r) => r.id), ["b"]);
assert.deepStrictEqual(r3.remove.map((r) => r.id).sort(), ["a", "c"]);

// 3. Два разных токена
const r2 = pickLatestTokenRows<Row>([
  { id: "a", expoPushToken: "A", updatedAt: 1 },
  { id: "b", expoPushToken: "B", updatedAt: 1 },
]);
assert.strictEqual(r2.keep.length, 2);
assert.strictEqual(r2.remove.length, 0);

// 4. Кейс dev: 16 строк токена A и 5 строк токена B
const dev: Row[] = [];
for (let i = 0; i < 16; i++) {
  dev.push({ id: `a${i}`, expoPushToken: "A", updatedAt: i });
}
for (let i = 0; i < 5; i++) {
  dev.push({ id: `b${i}`, expoPushToken: "B", updatedAt: i });
}
const rDev = pickLatestTokenRows(dev);
assert.strictEqual(rDev.keep.length, 2);
assert.strictEqual(rDev.remove.length, 19);
assert.deepStrictEqual(rDev.keep.map((r) => r.id).sort(), ["a15", "b4"]);

// 5. Равный updatedAt — одна остаётся, вторая в remove
const tie = pickLatestTokenRows<Row>([
  { id: "x", expoPushToken: "T", updatedAt: 5 },
  { id: "y", expoPushToken: "T", updatedAt: 5 },
]);
assert.strictEqual(tie.keep.length, 1);
assert.strictEqual(tie.remove.length, 1);

console.log("verifyPushTokenDedupe: OK");

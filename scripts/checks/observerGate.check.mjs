// Статическая проверка шлюза доступа наблюдателя и проверок роли (Фаза 78, план 04).
// Запуск из корня: node scripts/checks/observerGate.check.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (p) => readFileSync(p, "utf8");

const auth = read("convex/utils/observerAuth.ts");
assert.ok(auth.includes("links.some(isActiveLink)"), "observerAuth: нет links.some(isActiveLink)");
assert.ok(auth.includes(".collect()"), "observerAuth: нет .collect()");
const authCode = auth
  .split("\n")
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join("\n");
assert.ok(!authCode.includes(".first()"), "observerAuth: .first() запрещён, доступ решает любая активная строка");

for (const f of ["convex/observers/getPatientToday.ts", "convex/observers/getPatientHistory.ts"]) {
  const src = read(f);
  const gate = src.indexOf("await assertObserverAccess(ctx, patientId)");
  assert.ok(gate >= 0, `${f}: нет await assertObserverAccess(ctx, patientId)`);
  const handler = src.indexOf("handler:");
  const firstDb = src.indexOf("ctx.db", handler);
  assert.ok(firstDb === -1 || gate < firstDb, `${f}: шлюз должен быть раньше первого чтения ctx.db`);
}

const revoke = read("convex/observers/revokeLink.ts");
assert.ok(!revoke.includes("ctx.db.delete"), "revokeLink: физическое удаление запрещено (D-09)");

const respond = read("convex/observers/respondToRequest.ts");
assert.ok(respond.includes("link.patientId !== callerId"), "respondToRequest: нет проверки роли пациента");
const cancel = read("convex/observers/cancelRequest.ts");
assert.ok(cancel.includes("link.observerId !== callerId"), "cancelRequest: нет проверки роли наблюдателя");

for (const [name, src] of [
  ["respondToRequest", respond],
  ["cancelRequest", cancel],
  ["revokeLink", revoke],
]) {
  assert.ok(
    !/(observerId|patientId):\s*v\./.test(src),
    `${name}: observerId/patientId нельзя принимать аргументами`
  );
}

const observed = read("convex/observers/getObservedPatients.ts");
const firstDbGet = observed.indexOf("ctx.db.get(");
assert.ok(firstDbGet >= 0, "getObservedPatients: нет ctx.db.get(");
const pendingIdx = observed.indexOf('status === "pending"');
assert.ok(pendingIdx >= 0 && pendingIdx < firstDbGet, "getObservedPatients: ветка pending должна быть раньше первого ctx.db.get(");
const pickIdx = observed.indexOf("pickEffectiveLink(");
assert.ok(pickIdx >= 0 && pickIdx < firstDbGet, "getObservedPatients: pickEffectiveLink( должен быть раньше первого ctx.db.get(");

const redeem = read("convex/observers/redeemCode.ts");
const limitIdx = redeem.indexOf("rateLimiter.limit");
const catchIdx = redeem.indexOf("} catch");
assert.ok(limitIdx >= 0 && catchIdx > limitIdx, "redeemCode: не найден участок после rateLimiter.limit");
assert.ok(
  !redeem.slice(limitIdx, catchIdx).includes("throw new Error("),
  "redeemCode: после списания лимитов бросать ошибку нельзя (откатит лимиты), возвращайте { ok: false }"
);

assert.ok(
  observed.includes("supportsPending !== true"),
  "getObservedPatients: pending должен отдаваться только клиентам с supportsPending (старое приложение 1.2.1(24) падает на заглушке)"
);

console.log("observerGate.check: OK");

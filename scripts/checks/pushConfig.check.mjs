// Статическая проверка push-конфига (гипотезы D-13). Запуск из корня: node scripts/checks/pushConfig.check.mjs
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const read = (p) => readFileSync(p, "utf8");

// 1. app.config.ts
const appConfig = read("app.config.ts");
assert.ok(
  appConfig.includes("com.codetau.terenai"),
  "app.config.ts: не найден prod bundle id com.codetau.terenai"
);
assert.ok(
  appConfig.includes('"expo-notifications"'),
  "app.config.ts: плагин expo-notifications не подключён"
);
const projectIdMatch = appConfig.match(/projectId:\s*"([0-9a-f-]{36})"/);
assert.ok(projectIdMatch, "app.config.ts: extra.eas.projectId (UUID) не задан");
const projectId = projectIdMatch[1];
console.log("projectId:", projectId);

// 2. NotificationsProvider.tsx
const provider = read("components/notifications/NotificationsProvider.tsx");
const lines = provider.split("\n");
const callIdx = lines.findIndex((l) => l.includes("getExpoPushTokenAsync({"));
assert.ok(callIdx >= 0, "NotificationsProvider: нет вызова getExpoPushTokenAsync({");
assert.ok(
  lines.slice(callIdx, callIdx + 4).some((l) => l.includes("projectId")),
  "NotificationsProvider: projectId не передаётся в getExpoPushTokenAsync"
);
assert.ok(
  provider.includes("extra?.eas?.projectId"),
  "NotificationsProvider: projectId не читается из extra?.eas?.projectId"
);
assert.ok(
  provider.includes("Missing extra.eas.projectId"),
  "NotificationsProvider: ветка без projectId не логируется"
);

// 3. eas.json
const eas = JSON.parse(read("eas.json"));
const prod = eas.build?.production;
assert.ok(prod, "eas.json: нет build.production");
assert.equal(prod.env?.APP_VARIANT, "production", "eas.json: APP_VARIANT !== production");
assert.equal(prod.environment, "production", "eas.json: environment !== production");
const cs = prod.ios?.credentialsSource;
assert.ok(
  cs === undefined || cs === "remote",
  "eas.json: задан локальный credentialsSource (ожидаются remote credentials)"
);

// 4. introspect-конфиг production
let raw;
try {
  raw = execFileSync("npx", ["expo", "config", "--type", "introspect", "--json"], {
    env: { ...process.env, APP_VARIANT: "production" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (e) {
  console.error("expo config упал:", e.stderr ?? e.message);
  process.exit(1);
}
const cfg = JSON.parse(raw.slice(raw.indexOf("{")));
assert.equal(
  cfg.ios?.bundleIdentifier,
  "com.codetau.terenai",
  "introspect: ios.bundleIdentifier != com.codetau.terenai"
);
const apsEnvironment = cfg.ios?.entitlements?.["aps-environment"];
assert.ok(apsEnvironment, "introspect: нет ios.entitlements[aps-environment]");

console.log("pushConfig: OK", { projectId, apsEnvironment });

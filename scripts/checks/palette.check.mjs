// Проверка палитры: ключи, снимок dark из HEAD, лайм в light, контраст WCAG.
// Запуск: node --experimental-strip-types --no-warnings scripts/checks/palette.check.mjs
import assert from "node:assert/strict";

const { palettes } = await import("../../lib/ui/palettes.ts");
const { light, dark } = palettes;

// Снимок тёмной палитры до фазы 76 (34 ключа, значения из HEAD): менять нельзя.
const DARK_SNAPSHOT = {
  base: [39, 44, 53],
  primary: [201, 241, 76],
  primaryLight: [201, 241, 76],
  background: [10, 13, 18],
  foreground: [243, 245, 249],
  muted: [21, 24, 31],
  mutedForeground: [146, 153, 165],
  secondary: [255, 255, 255],
  destructive: [233, 69, 69],
  calorie: [243, 245, 249],
  carb: [234, 179, 8],
  protein: [239, 68, 68],
  fat: [16, 185, 129],
  health: [134, 151, 129],
  fiber: [249, 115, 22],
  sugar: [236, 72, 153],
  sodium: [6, 182, 212],
  red: [233, 69, 69],
  orange: [249, 115, 22],
  amber: [245, 158, 11],
  yellow: [234, 179, 8],
  lime: [132, 204, 22],
  green: [134, 151, 129],
  emerald: [16, 185, 129],
  teal: [20, 184, 166],
  cyan: [6, 182, 212],
  sky: [14, 165, 233],
  blue: [59, 130, 246],
  indigo: [99, 102, 241],
  violet: [139, 92, 246],
  purple: [168, 85, 247],
  fuchsia: [217, 70, 239],
  pink: [236, 72, 153],
  rose: [244, 63, 94],
};

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

assert.deepEqual(
  Object.keys(light).sort(),
  Object.keys(dark).sort(),
  "наборы ключей light и dark должны совпадать",
);

assert.deepEqual([...light.primary], [201, 241, 76], "light.primary должен быть лаймом");
assert.deepEqual([...light.primaryForeground], [3, 7, 18]);
assert.deepEqual([...light.accentText], [77, 99, 9]);

assert.equal(Object.keys(DARK_SNAPSHOT).length, 34, "снимок dark должен содержать 34 ключа");
for (const [key, value] of Object.entries(DARK_SNAPSHOT)) {
  assert.deepEqual([...dark[key]], value, `dark.${key} изменился относительно снимка`);
}
assert.deepEqual([...dark.primaryForeground], [10, 13, 18]);
assert.deepEqual([...dark.accentText], [201, 241, 76]);

const checks = [
  ["light.primaryForeground/primary", light.primaryForeground, light.primary, 4.5],
  ["dark.primaryForeground/primary", dark.primaryForeground, dark.primary, 4.5],
  ["light.accentText/base", light.accentText, light.base, 4.5],
  ["light.accentText/background", light.accentText, light.background, 4.5],
  ["dark.accentText/base", dark.accentText, dark.base, 4.5],
  ["light.health/base", light.health, light.base, 3.0],
  ["light.foreground/primary", light.foreground, light.primary, 4.5],
  ["light.foreground/background", light.foreground, light.background, 4.5],
  ["light.mutedForeground/background", light.mutedForeground, light.background, 4.5],
  ["light.mutedForeground/base", light.mutedForeground, light.base, 4.5],
];
for (const [name, fg, bg, min] of checks) {
  const ratio = contrast(fg, bg);
  assert.ok(ratio >= min, `контраст ${name} = ${ratio.toFixed(2)}, нужно >= ${min}`);
}

// Самопроверка: функция контраста даёт эталонные значения.
assert.ok(Math.abs(contrast([0, 0, 0], [255, 255, 255]) - 21) < 0.01, "самопроверка: чёрный/белый = 21");
assert.ok(contrast([255, 255, 255], [255, 255, 255]) < 1.01, "самопроверка: одинаковые цвета = 1");

console.log("palette: OK");

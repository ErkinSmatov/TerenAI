// Проверка против регрессий темы: getColor с темой, без getActiveTheme, без модульного StyleSheet.create с getColor.
// Запуск: node scripts/checks/themeColors.check.mjs [файлы...]  (без аргументов: весь app/ и components/)
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// Добавлять файл только с письменным обоснованием в SUMMARY плана;
// на момент фазы 76 исключений нет.
const ALLOWED_FILES = new Set([]);

const FUNCTION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
]);

function isGetColorCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "getColor"
  );
}

function containsGetColor(node) {
  let found = false;
  const visit = (n) => {
    if (found) return;
    if (isGetColorCall(n)) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

function insideFunction(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (FUNCTION_KINDS.has(p.kind)) return true;
  }
  return false;
}

// Возвращает { violations, getColorCalls }.
function checkSource(text, fileName) {
  const sf = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations = [];
  let getColorCalls = 0;
  const add = (node, rule, message) =>
    violations.push({
      file: fileName,
      line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      rule,
      message,
    });

  const visit = (node) => {
    if (isGetColorCall(node)) {
      getColorCalls++;
      if (node.arguments.length !== 3) {
        add(node, "R1-theme-arg", "getColor без темы третьим аргументом");
      }
    }
    if (ts.isIdentifier(node) && node.text === "getActiveTheme") {
      add(
        node,
        "R2-active-theme",
        "getActiveTheme в компоненте: тема берётся из useThemeContext",
      );
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "StyleSheet" &&
      node.expression.name.text === "create" &&
      !insideFunction(node) &&
      node.arguments.some(containsGetColor)
    ) {
      add(
        node,
        "R3-module-stylesheet",
        "модульный StyleSheet.create с getColor: перенести в фабрику useThemedStyles",
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { violations, getColorCalls };
}

// Самопроверка: каждое правило обязано ловить нарушение, хороший код чист.
function selfTest() {
  const rulesOf = (src) =>
    checkSource(src, "x.tsx").violations.map((v) => v.rule);
  const bad = [
    ['const a = getColor("foreground");', "R1-theme-arg"],
    ['const t = getActiveTheme() === "dark";', "R2-active-theme"],
    [
      'const styles = StyleSheet.create({ a: { color: getColor("x", undefined, "dark") } });',
      "R3-module-stylesheet",
    ],
  ];
  for (const [src, rule] of bad) {
    if (!rulesOf(src).includes(rule)) {
      console.error(`Самопроверка провалена: правило ${rule} не сработало`);
      process.exit(2);
    }
  }
  const good = `
    const createStyles = (theme) => ({ a: { color: getColor("x", undefined, theme) } });
    function C() {
      const styles = StyleSheet.create({ a: { color: getColor("x", undefined, theme) } });
      return getColor("y", 0.5, theme);
    }
  `;
  if (rulesOf(good).length !== 0) {
    console.error("Самопроверка провалена: хороший пример дал нарушения");
    process.exit(2);
  }
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
}

selfTest();

const root = path.resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2);
let files;
if (args.length > 0) {
  files = args.map((f) => path.resolve(process.cwd(), f));
} else {
  files = [];
  walk(path.join(root, "app"), files);
  walk(path.join(root, "components"), files);
}
files = files.filter((f) => !ALLOWED_FILES.has(path.relative(root, f)));

const all = [];
let calls = 0;
for (const f of files) {
  const rel = path.relative(root, f);
  const r = checkSource(fs.readFileSync(f, "utf8"), rel);
  calls += r.getColorCalls;
  all.push(...r.violations);
}

if (all.length > 0) {
  for (const v of all) console.log(`${v.file}:${v.line} [${v.rule}] ${v.message}`);
  const bad = new Set(all.map((v) => v.file)).size;
  console.log(`themeColors: нарушений ${all.length} в ${bad} файлах`);
  process.exit(1);
}
console.log(`themeColors: OK (${calls} вызовов getColor в ${files.length} файлах)`);

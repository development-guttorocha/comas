import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
const preservedKeys = new Set(["name", "href", "src", "url", "institution", "year", "date", "company"]);
const dataNames = new Set(["roles", "testimonials", "summary", "experience", "education", "skills", "tools", "projects", "navItems", "pageCopy", "EXACT_ROUTE_LABEL", "teams", "impact", "model", "voices"]);
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts") ? [path.join(dir, e.name)] : []);
}
export function collectSiteSources(root = process.cwd()) {
  const sources = new Map<string, Set<string>>();
  const add = (text: string, file: string) => { if (!/[A-Za-zÀ-ÿ]/.test(text) || /^(https?:|mailto:|tel:|\/)/.test(text)) return; const locations = sources.get(text) ?? new Set(); locations.add(file); sources.set(text, locations); };
  for (const file of ["app", "components", "lib"].flatMap(d => files(path.join(root, d)))) {
    const relative = path.relative(root, file).replaceAll(path.sep, "/");
    const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function data(node: ts.Node) {
      if (ts.isPropertyAssignment(node) && preservedKeys.has(node.name.getText(sf).replaceAll('"', ""))) return;
      if (ts.isStringLiteral(node)) add(node.text, relative);
      else ts.forEachChild(node, data);
    }
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) add(node.arguments[0].text, relative);
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && dataNames.has(node.name.text) && node.initializer) {
        if (/components\/pages\/StoryPage|lib\/curriculum|lib\/leadership|PrimaryNav|i18n\/metadata/.test(relative)) data(node.initializer);
      }
      if (relative === "lib/seo.ts" && ts.isPropertyAssignment(node) && node.name.getText(sf) === "description" && ts.isStringLiteral(node.initializer)) add(node.initializer.text, relative);
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
  return sources;
}

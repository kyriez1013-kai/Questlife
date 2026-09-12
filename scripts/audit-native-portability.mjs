import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const out = path.join(root, 'reports/native');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(name);
    else if (/\.[jt]sx?$/.test(name)) files.push(name);
  }
}
walk(path.join(root, 'src'));
for (const name of ['App.tsx', 'App.native.tsx', 'App.web.tsx', 'index.ts']) {
  if (fs.existsSync(name)) files.push(path.join(root, name));
}
function resolveNative(from, specifier, platform) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), specifier);
  for (const suffix of [`.${platform}.tsx`, `.${platform}.ts`, '.native.tsx', '.native.ts', '.tsx', '.ts', '.js', '/index.native.tsx', '/index.tsx', '/index.ts', '']) {
    if (fs.existsSync(base + suffix) && fs.statSync(base + suffix).isFile()) return base + suffix;
  }
  return null;
}
const graphs = { ios:new Set(), android:new Set() };
function visit(file, platform) {
  const reachable=graphs[platform];
  if (!file || reachable.has(file)) return;
  reachable.add(file);
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function node(n) {
    if (ts.isImportDeclaration(n) && !n.importClause?.isType && ts.isStringLiteral(n.moduleSpecifier)) visit(resolveNative(file, n.moduleSpecifier.text,platform),platform);
    if (ts.isExportDeclaration(n) && !n.isType && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) visit(resolveNative(file, n.moduleSpecifier.text,platform),platform);
    ts.forEachChild(n, node);
  }
  node(source);
}
for(const platform of ['ios','android'])visit(path.join(root,'index.ts'),platform);
const reachable=new Set([...graphs.ios,...graphs.android]);
const patterns = {
  css: /(?:import|require).*['"].*\.css['"]/, dom: /\b(?:document|window|localStorage|URLSearchParams|HTMLElement|HTMLDivElement|ResizeObserver|MutationObserver|ReactDOM)\b/,
  markup: /className|<(?:div|button|input|canvas|svg)\b/, chart: /from ['"]lightweight-charts/,
  style: /var\(--|--[a-z].*:/, pointer: /onMouse|onPointer|:hover/,
};
const issues = [];
for (const file of files.sort()) {
  const relative = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) for (const [kind, pattern] of Object.entries(patterns)) {
    if (!pattern.test(lines[i])) continue;
    const guarded = /typeof (?:document|window)|Platform.OS/.test(lines.slice(Math.max(0, i - 10), i + 1).join('\n'));
    const debug = /fixture|stage0|stage1|rebaseline|debug|\.test\./i.test(relative);
    const inNativeGraph = reachable.has(file);
    const classification = /\.web\./.test(file) ? 'PLATFORM_ADAPTER'
      : kind === 'css' && inNativeGraph ? 'BLOCKER'
      : !inNativeGraph && debug ? 'WEB_ONLY_DEBUG'
      : guarded ? 'SAFE_GUARD'
      : kind === 'dom' || kind === 'chart' || kind === 'markup' ? 'PLATFORM_ADAPTER' : 'NO_ACTION';
    issues.push({ file: relative, line: i + 1, kind, classification, inNativeGraph });
  }
}
const counts = Object.fromEntries(['BLOCKER','PLATFORM_ADAPTER','WEB_ONLY_DEBUG','SAFE_GUARD','NO_ACTION'].map(key => [key, issues.filter(i => i.classification === key).length]));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'NATIVE_PORTABILITY_AUDIT.json'), JSON.stringify({ version: 1, counts, scannedFiles: files.length, nativeGraph: [...reachable].map(f => path.relative(root, f)).sort(), platformGraphs:Object.fromEntries(Object.entries(graphs).map(([platform,set])=>[platform,[...set].map(f=>path.relative(root,f)).sort()])), issues }, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'NATIVE_PORTABILITY_AUDIT.md'), `# Native portability inventory\n\nScanned ${files.length} application modules. Static native graph: ${reachable.size} modules.\n\n${Object.entries(counts).map(([key,n]) => `- ${key}: ${n}`).join('\n')}\n\nClassification is a conservative static triage, not proof of device behaviour.\nThe JSON records every match and native reachability. Type-only imports are excluded.\nCSS in the native graph blocks acceptance; guarded DOM references still need runtime QA.\nDynamic imports and native module linking are additionally verified by platform exports/builds.\n`);
console.log(JSON.stringify({ counts, scannedFiles: files.length, nativeModules: reachable.size }));

import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import ts from 'typescript';
import postcss from 'postcss';

// Follow the entire application-owned demo graph, including dynamic imports.
// Only explicitly enumerated browser UI packages may cross this boundary.
const root = resolve('src/demo');
assert(!existsSync(resolve(root, 'mock-data/qualitativePortfolioSnapshot.json')), 'Legacy qualitative portfolio snapshot must not be present');
const allowed = new Set(['react', 'react-dom', 'lucide-react',
  '@radix-ui/react-checkbox', '@radix-ui/react-popover', '@radix-ui/react-scroll-area',
  '@radix-ui/react-select', '@radix-ui/react-tooltip', 'clsx', 'tailwind-merge',
  'react-simple-maps', 'world-atlas', 'plotly.js-basic-dist-min', '@fontsource/onest']);
const visited = new Set(), packages = new Set();
const resolveFile = path => [path, ...['.tsx','.ts','.json','.css'].map(ext => path + ext)]
  .find(candidate => existsSync(candidate));
function visit(file) {
  assert(file?.startsWith(root + '/'), `Import escaped the demo boundary: ${file}`);
  if (visited.has(file)) return;
  visited.add(file);
  const source = readFileSync(file, 'utf8');
  if (!/\.tsx?$/.test(file)) return;
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b/.test(source),
    `Unexpected network or persisted-data access in ${file}`);
  assert(!/import\.meta\.env|process\.env|loadPublished|loadFundScatter|createClient|createBrowserClient/i.test(
    source.replace(/source_status: \{[^}]*\}/g, '')), `Unexpected production dependency in ${file}`);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function scan(node) {
    let specifier;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (node.isTypeOnly || node.importClause?.isTypeOnly) return;
      specifier = node.moduleSpecifier.text;
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      assert(ts.isStringLiteral(node.arguments[0]), 'Dynamic imports must have static targets');
      specifier = node.arguments[0].text;
    }
    if (specifier) {
      if (specifier.startsWith('.') || specifier.startsWith('@demo/')) {
        visit(resolveFile(specifier.startsWith('@demo/') ? resolve(root, specifier.slice(6)) : resolve(dirname(file), specifier)));
      } else {
        const dependency = specifier.startsWith('@') ? specifier.split('/').slice(0,2).join('/') : specifier.split('/')[0];
        assert(allowed.has(dependency), `Unapproved demo dependency: ${dependency}`);
        packages.add(dependency);
      }
    }
    ts.forEachChild(node, scan);
  }
  scan(ast);
}
visit(resolve(root, 'InvestorPortalDemo.tsx'));
const css = postcss.parse(readFileSync(resolve(root, 'theme.generated.css'), 'utf8'));
css.walkRules(rule => {
  if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
  let parent = rule.parent;
  while (parent) { if (parent.type === 'rule') return; parent = parent.parent; }
  assert(rule.selectors.every(selector => selector.startsWith('.aldea-demo')), `Unscoped CSS: ${rule.selector}`);
});
const assetFiles = readdirSync('dist/assets').filter(name => /\.(js|css)$/.test(name));
for (const file of assetFiles) {
  const source = readFileSync(resolve('dist/assets', file), 'utf8');
  assert(!/supabase\.(?:co|com)|api\.airtable\.com|api\.attio\.com|VITE_SUPABASE|SUPABASE_SERVICE_ROLE|loadPublishedReportPackage/.test(source), `Production endpoint/client in ${file}`);
  assert(!/Preview synthetic demo|tests\/fixtures\/investor-demo/.test(source), `Local review harness shipped in ${file}`);
  assert(!/eyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/.test(source), `Credential-like token in ${file}`);
}
const entryHtml = readFileSync('dist/index.html', 'utf8');
assert(!/InvestorPortalDemo|plotly|world-atlas|onest/.test(entryHtml), 'Heavy demo assets were preloaded');
const builtScripts = assetFiles.filter(name => name.endsWith('.js')).map(name => readFileSync(resolve('dist/assets', name), 'utf8')).join('\n');
assert(builtScripts.includes('Aldea Synthetic Fund') && builtScripts.includes('ALDEA_FULLY_SYNTHETIC_V1'), 'Synthetic public demo was not included in the production bundle');
const demoSources = [...visited].filter(file => /\.tsx?$/.test(file)).map(file => readFileSync(file, 'utf8')).join('\n');
assert(!/Aldea Tech Fund I/.test(demoSources), 'Original fund identity remains in the isolated demo source');
console.log(`Audited ${visited.size} local modules/assets, ${assetFiles.length} built JS/CSS assets, and all generated CSS selectors.`);
console.log(`External packages: ${[...packages].sort().join(', ')}`);
console.log(`Local graph:\n${[...visited].map(file => relative(process.cwd(), file)).sort().join('\n')}`);

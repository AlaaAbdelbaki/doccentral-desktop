// i18n audit: finds user-facing strings in the React source that bypass the
// translator, and t('…') keys missing from the French / Arabic dictionaries.
//
//   node scripts/i18n-audit.mjs          report
//   node scripts/i18n-audit.mjs --json   machine-readable (used by tests)
import { parse } from '@babel/parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
// Attributes whose string values are shown to the user.
const UI_ATTRS = new Set(['placeholder', 'title', 'label', 'alt', 'aria-label', 'hint', 'subtitle', 'searchPlaceholder']);
const LETTERS = /[A-Za-z]{2,}/;
// Shown as-is in every language: the product name and an example address.
const ALLOWED = new Set(['DocCentral', 'dentist@clinic.tn']);

const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === 'locales' ? [] : files(p);
  return /\.(jsx?|mjs)$/.test(e.name) ? [p] : [];
});

function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, visit, node));
    else if (v && typeof v.type === 'string') walk(v, visit, node);
  }
}

export function audit() {
  const untranslated = [];
  const keys = new Map(); // key → first location
  for (const file of files(SRC)) {
    const code = fs.readFileSync(file, 'utf8');
    let ast;
    try { ast = parse(code, { sourceType: 'module', plugins: ['jsx'] }); } catch { continue; }
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    walk(ast.program, (node, parent) => {
      const at = `${rel}:${node.loc.start.line}`;
      if (node.type === 'JSXText' && LETTERS.test(node.value) && !ALLOWED.has(node.value.trim())) {
        untranslated.push({ at, text: node.value.trim().replace(/\s+/g, ' '), kind: 'text' });
      }
      if (node.type === 'JSXAttribute' && UI_ATTRS.has(node.name.name) && node.value?.type === 'StringLiteral'
          && LETTERS.test(node.value.value) && !ALLOWED.has(node.value.value)) {
        untranslated.push({ at, text: node.value.value, kind: `attr ${node.name.name}` });
      }
      // t('literal') / t(`literal`) calls → dictionary keys
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 't') {
        const a = node.arguments[0];
        const key = a?.type === 'StringLiteral' ? a.value
          : a?.type === 'TemplateLiteral' && !a.expressions.length ? a.quasis[0].value.cooked : null;
        if (key && !keys.has(key)) keys.set(key, at);
      }
    });
  }
  return { untranslated, keys };
}

export async function missingTranslations(keys) {
  const out = {};
  for (const lang of ['fr', 'ar']) {
    const file = path.join(SRC, 'lib', 'locales', `${lang}.js`);
    const dict = fs.existsSync(file) ? (await import(pathToFileURL(file).href)).default : {};
    out[lang] = [...keys.keys()].filter((k) => !(k in dict));
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { untranslated, keys } = audit();
  const missing = await missingTranslations(keys);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ untranslated, keys: [...keys.keys()], missing }, null, 1));
  } else {
    console.log(`Untranslated strings: ${untranslated.length}`);
    for (const u of untranslated) console.log(`  ${u.at}  [${u.kind}]  ${u.text}`);
    console.log(`\nt() keys: ${keys.size}; missing fr: ${missing.fr.length}; missing ar: ${missing.ar.length}`);
  }
}

// @ts-check
/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = fs.existsSync(path.join(ROOT, 'apps/bot/src')) ? path.join(ROOT, 'apps/bot/src') : path.join(ROOT, 'src');
const LOCALES_DIR = path.join(SRC, 'locales');
const SUPPORTED = ['en-US', 'en-GB', 'id'] as const;

// === WARNA ===
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['locales', 'node_modules', 'dist'].includes(entry.name)) continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx|js)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

function findKeys(): Map<string, { file: string; line: number }[]> {
  const files = walk(SRC);
  const keys = new Map<string, { file: string; line: number }[]>();

  const patterns = [
    /localized\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /(?<!\.)\bt\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\.t\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /resolveKey\s*\([^,]+,\s*['"`]([^'"`]+)['"`]/g,
  ];

  const add = (key: string, file: string, content: string, idx: number) => {
    if (key.includes('${') || key.includes('+') || !key.includes(':')) return;
    const line = getLineNumber(content, idx);
    const relFile = path.relative(SRC, file);
    if (!keys.has(key)) keys.set(key, []);
    keys.get(key)!.push({ file: relFile, line });
  };

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const regex of patterns) {
      let m;
      while ((m = regex.exec(content))) {
        add(m[1].trim(), file, content, m.index);
      }
    }
    // dynamic helpers literal
    let m;
    const re1 = /i18nMonster\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;
    while ((m = re1.exec(content))) add(`${m[1]}/monsters:${m[2]}.name`, file, content, m.index);
    const re2 = /i18nItem\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;
    while ((m = re2.exec(content))) add(`${m[1]}/items:${m[2]}.name`, file, content, m.index);
    const re3 = /i18nItemDesc\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;
    while ((m = re3.exec(content))) add(`${m[1]}/items:${m[2]}.desc`, file, content, m.index);
  }

  // === SCAN ITEM REGISTRY ===
  const reg = path.join(SRC, 'lib/rpg/item-registry.ts');
  if (fs.existsSync(reg)) {
    const txt = fs.readFileSync(reg, 'utf8');
    const re = /^\s*([a-z0-9_]+):\s*\{\s*ns:\s*['"`]([^'"`]+)['"`]/gm;
    let m;
    while ((m = re.exec(txt))) {
      add(`${m[2]}:${m[1]}.name`, reg, txt, m.index);
      add(`${m[2]}:${m[1]}.desc`, reg, txt, m.index);
    }
  }

  return keys;
}

function loadLocale(locale: string) {
  const dir = path.join(LOCALES_DIR, locale);
  const data: Record<string, string> = {};
  if (!fs.existsSync(dir)) return data;

  const walkJson = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walkJson(p);
      else if (e.name.endsWith('.json')) {
        try {
          const rel = path.relative(dir, p);
          const ns = rel.replace(/\\/g, '/').replace(/\.json$/, '');
          const json = JSON.parse(fs.readFileSync(p, 'utf8'));
          const flatten = (obj: any, prefix = '') => {
            for (const [k, v] of Object.entries(obj)) {
              const key = prefix ? `${prefix}.${k}` : k;
              if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key);
              else data[`${ns}:${key}`] = String(v);
            }
          };
          flatten(json);
        } catch (e: any) {
          console.error(`${c.red}✗ Failed to parse ${path.relative(ROOT, p)}: ${e.message}${c.reset}`);
        }
      }
    }
  };
  walkJson(dir);
  return data;
}

function main() {
  const keysMap = findKeys();
  const keys = [...keysMap.keys()].sort();
  console.log(`${c.cyan}${c.bold}🔍 Found ${keys.length} i18n keys${c.reset}\n`);

  const locales = SUPPORTED.map((l) => ({ locale: l, data: loadLocale(l) }));
  let error = false;

  for (const key of keys) {
    const missing = locales.filter((l) => !(key in l.data)).map((l) => l.locale);
    if (missing.length) {
      error = true;
      console.log(`${c.red}${c.bold}❌ ${key}${c.reset}`);
      console.log(` ${c.yellow}missing in:${c.reset} ${missing.map((m) => `${c.magenta}${m}${c.reset}`).join(', ')}`);
      const usages = keysMap.get(key)!;
      const unique = [...new Map(usages.map((u) => [`${u.file}:${u.line}`, u])).values()]
        .slice(0, 3)
        .map((u) => `${c.reset}${u.file}:${u.line}${c.reset}`)
        .join(', ');
      console.log(` ${c.reset}used in:${c.reset} ${unique}`);
    }
  }

  if (!error) {
    console.log(`${c.green}${c.bold}✅ All keys present in en-US, en-GB, id${c.reset}`);
  } else {
    process.exit(1);
  }
}

main();

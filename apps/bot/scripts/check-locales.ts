import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const LOCALES_DIR = path.join(SRC, 'locales');
const SUPPORTED = ['en-US', 'en-GB', 'id'] as const;

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

function findKeys(): Map<string, string[]> {
  const files = walk(SRC);
  const keys = new Map<string, string[]>();

  const patterns = [
    /localized\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /(?<!\.)\bt\s*\(\s*['"`]([^'"`]+)['"`]/g, // t('key'...) tapi bukan i18n.t
    /\.t\s*\(\s*['"`]([^'"`]+)['"`]/g, //.t('key'...) untuk i18n.t, fetchT().t
    /resolveKey\s*\([^,]+,\s*['"`]([^'"`]+)['"`]/g,
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const regex of patterns) {
      let m;
      while ((m = regex.exec(content))) {
        const key = m[1].trim();
        if (key.includes('${') || key.includes('+')) continue;
        if (!key.includes(':')) continue;

        // const root = key.split(':')[0].split('/')[0];
        // if (!['commands','common','errors','listeners'].includes(root)) continue;

        if (!keys.has(key)) keys.set(key, []);
        keys.get(key)!.push(path.relative(SRC, file));
      }
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
        } catch {}
      }
    }
  };
  walkJson(dir);
  return data;
}

function main() {
  const keysMap = findKeys();
  const keys = [...keysMap.keys()].sort();
  console.log(`🔍 Found ${keys.length} i18n keys\n`);

  const locales = SUPPORTED.map((l) => ({ locale: l, data: loadLocale(l) }));
  let error = false;

  for (const key of keys) {
    const missing = locales.filter((l) => !(key in l.data)).map((l) => l.locale);
    if (missing.length) {
      error = true;
      console.log(`❌ ${key}`);
      console.log(`   missing in: ${missing.join(', ')}`);
      console.log(`   used in: ${[...new Set(keysMap.get(key))].slice(0, 3).join(', ')}`);
    }
  }

  if (!error) {
    console.log('✅ All keys present in en-US, en-GB, id');
  } else {
    process.exit(1);
  }
}

main();

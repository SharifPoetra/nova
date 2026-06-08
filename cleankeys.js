import fs from "fs";
import path from "path";

const RAW = `
  commands/sell:balance
  commands/sell:coins
`;

const KEYS = RAW.trim()
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const LOCALES = ["en-US", "en-GB", "id"];
const BASE = "apps/bot/src/locales";

KEYS.forEach((fullKey) => {
  const [ns, key] = fullKey.split(":");
  if (!ns || !key) return;
  const parts = key.split(".");

  LOCALES.forEach((locale) => {
    const file = path.join(BASE, locale, `${ns}.json`);
    if (!fs.existsSync(file)) return;

    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    let obj = json;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) return;
      obj = obj[parts[i]];
    }

    const lastKey = parts[parts.length - 1];
    if (lastKey in obj) {
      delete obj[lastKey];
      fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
      console.log(`✓ ${locale}/${ns}.json - ${key}`);
    }
  });
});

console.log(`\nDone: ${KEYS.length} keys`);

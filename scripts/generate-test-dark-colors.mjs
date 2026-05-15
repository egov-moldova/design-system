import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LIGHT_FILE = path.join(ROOT, 'tokens/age/base/color.tokens.json');
const DARK_FILE = path.join(ROOT, 'tokens/age.dark/base/color.tokens.json');

function invertHexColor(hex) {
  // supports #RRGGBB only (good enough for your current tokens)
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;

  const n = parseInt(m[1], 16);
  const r = 255 - ((n >> 16) & 0xff);
  const g = 255 - ((n >> 8) & 0xff);
  const b = 255 - (n & 0xff);

  return (
    '#' +
    [r, g, b]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function transform(obj) {
  if (Array.isArray(obj)) return obj.map(transform);
  if (obj && typeof obj === 'object') {
    // token leaf: { value: "#...", type: "color" }
    if (typeof obj.value === 'string' && obj.type === 'color') {
      return { ...obj, value: invertHexColor(obj.value) };
    }
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = transform(v);
    return out;
  }
  return obj;
}

const light = JSON.parse(fs.readFileSync(LIGHT_FILE, 'utf8'));
const dark = transform(light);

fs.mkdirSync(path.dirname(DARK_FILE), { recursive: true });
fs.writeFileSync(DARK_FILE, JSON.stringify(dark, null, 2) + '\n', 'utf8');

console.log(`Wrote inverted dark colors to: ${DARK_FILE}`);

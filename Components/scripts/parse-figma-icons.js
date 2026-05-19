
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const text = fs.readFileSync(file, 'utf8');
const lines = text.split(/\r?\n/);

const sectionRegex = /^  <frame id="([0-9:]+)" name="Container" x="0" y="(\d+)" width="\d+" height="(\d+)">/;
const symbolRegex = /<symbol id="[^"]+" name="(\d+)\/([^"]+)"/;

const sections = [];
let current = null;
for (let i = 0; i < lines.length; i++) {
  const m = sectionRegex.exec(lines[i]);
  if (m) {
    current = { id: m[1], y: +m[2], height: +m[3], icons: [] };
    sections.push(current);
    continue;
  }
  if (!current) continue;
  const s = symbolRegex.exec(lines[i]);
  if (s) {
    current.icons.push({ size: +s[1], name: s[2] });
  }
}

const out = sections.map((s) => {
  const sizes = new Set(s.icons.map(i => i.size));
  const size = [...sizes][0] || 0;
  return {
    y: s.y,
    height: s.height,
    size,
    names: s.icons.map(i => i.name)
  };
});
console.log(JSON.stringify(out, null, 2));

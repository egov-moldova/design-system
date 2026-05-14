/**
 * Replaces inline favicon + manifest <link> blocks with
 * <script src="js/include-head-assets.js"></script> in Components/*.html
 * (single source: elements/head-assets.html).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsDir = path.join(__dirname, "..", "Components");

/** Do not use `\s*` after manifest — it can eat the next line’s indentation. */
const blockRe =
  /<link rel="icon" type="image\/png" href="favicon-96x96\.png"[\s\S]*?<link rel="manifest" href="site\.webmanifest"[^>]*>/m;

/** After migration: ensure the line following include-head-assets keeps the same indent. */
const indentRepairRe =
  /^([ \t]*)<script src="js\/include-head-assets\.js"><\/script>(\r?\n)(<link rel="stylesheet"|<style\b|<link rel="canonical")/m;

const repairOnly = process.argv.includes("--repair");

function normalizeEightSpaceHeadBlock(html) {
  return html
    .replace(/        <script src="js\/include-head-assets\.js"><\/script>/g, "    <script src=\"js/include-head-assets.js\"></script>")
    .replace(/        <link rel="stylesheet" href="css\/main\.css" \/>/g, "    <link rel=\"stylesheet\" href=\"css/main.css\" />")
    .replace(/        <link rel="stylesheet" href="css\/main\.css">/g, '    <link rel="stylesheet" href="css/main.css">')
    .replace(/        <link rel="canonical"/g, '    <link rel="canonical"');
}

function repairFollowingLineIndent(html) {
  return html.replace(
    indentRepairRe,
    (_, ind, nl, next) =>
      `${ind}<script src="js/include-head-assets.js"></script>${nl}${ind}${next}`
  );
}

function runRepair(html) {
  let out = repairFollowingLineIndent(html);
  out = normalizeEightSpaceHeadBlock(out);
  return out;
}

for (const name of fs.readdirSync(componentsDir)) {
  if (!name.endsWith(".html")) continue;
  const fp = path.join(componentsDir, name);
  let html = fs.readFileSync(fp, "utf8");

  if (repairOnly) {
    const fixed = runRepair(html);
    if (fixed !== html) {
      fs.writeFileSync(fp, fixed, "utf8");
      console.log("repaired indent:", name);
    }
    continue;
  }

  if (!blockRe.test(html)) continue;
  if (html.includes("include-head-assets.js")) {
    console.log("skip (already migrated):", name);
    continue;
  }
  blockRe.lastIndex = 0;
  const m = blockRe.exec(html);
  if (!m) continue;
  const matchStart = m.index;
  const match = m[0];
  const before = html.slice(0, matchStart);
  const lastNl = before.lastIndexOf("\n");
  const lineStart = lastNl === -1 ? 0 : lastNl + 1;
  const indent = before.slice(lineStart, matchStart).match(/^[ \t]*/)[0];
  const replacement = `${indent}<script src="js/include-head-assets.js"></script>\n`;
  let out = before + replacement + html.slice(matchStart + match.length);
  out = runRepair(out);
  fs.writeFileSync(fp, out, "utf8");
  console.log("updated:", name);
}

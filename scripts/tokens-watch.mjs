#!/usr/bin/env node
/**
 * Lightweight token file watcher — replaces nodemon for tokens.watch.
 * Uses Node's built-in fs.watch (no extra deps). Debounces changes and
 * runs style-dictionary builds in parallel via child_process.
 *
 * Cross-platform: works on Windows (NTFS) and macOS (FSEvents).
 */
import { watch } from 'node:fs';
import { exec } from 'node:child_process';
import { resolve } from 'node:path';

const DEBOUNCE_MS = 300;
const ROOT = resolve(import.meta.dirname, '..');
const DIRS = ['tokens/core', 'tokens/core.dark'];
const CONFIGS = ['tokens/core/style-dictionary.config.json', 'tokens/core.dark/style-dictionary.config.json'];

let debounce = null;
let building = false;
let queued = null;

function runCmd(cmd) {
  return new Promise((ok, fail) => {
    exec(cmd, { cwd: ROOT }, (err, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (err) {
        fail(err);
      } else {
        ok();
      }
    });
  });
}

async function rebuild(trigger) {
  if (building) {
    queued = trigger;
    return;
  }
  building = true;
  const start = Date.now();
  console.log(`[tokens-watch] ${trigger} changed, rebuilding...`);
  try {
    // Run both configs in parallel — each is independent
    await Promise.all(CONFIGS.map(c => runCmd(`style-dictionary build --config ${c}`)));
    console.log(`[tokens-watch] Done in ${Date.now() - start}ms`);
  } catch (e) {
    console.error(`[tokens-watch] Build failed:`, e.message);
  }
  building = false;
  // If a change came in while building, rebuild again
  if (queued) {
    const next = queued;
    queued = null;
    rebuild(next);
  }
}

for (const dir of DIRS) {
  const absDir = resolve(ROOT, dir);
  try {
    watch(absDir, { recursive: true }, (_event, filename) => {
      if (!filename || !filename.endsWith('.tokens.json')) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => rebuild(`${dir}/${filename}`), DEBOUNCE_MS);
    });
    console.log(`[tokens-watch] Watching ${dir}/`);
  } catch (e) {
    console.warn(`[tokens-watch] Could not watch ${dir}:`, e.message);
  }
}

console.log('[tokens-watch] Ready. Press Ctrl+C to stop.');

#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Hardcoded paths to delete (relative to project root)
const pathsToDelete = [
  '.specs/',
  '.claude/',
  '.vscode/',
  '.windsurf/',
  '_agents/',
  'tokens/_agents/',
  'AGENTS.md',
  'tokens/AGENTS.md',
  'src/components/AGENTS.md',
  '.stencil/',
  '.wireit/',
  'coverage/',
];

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipConfirmation = args.includes('--yes');

// Show help message
if (args.includes('--help') || args.includes('-h')) {
  log('AI Files Cleanup Script', colors.blue);
  log('');
  log('Usage: node scripts/cleanup-ai-files.mjs [options]', colors.gray);
  log('');
  log('Options:', colors.gray);
  log('  --dry-run    Preview what would be deleted without actually deleting', colors.gray);
  log('  --yes        Skip confirmation prompt (auto-confirm deletion)', colors.gray);
  log('  --help, -h   Show this help message', colors.gray);
  process.exit(0);
}

function confirmAction() {
  return new Promise(resolve => {
    // Auto-reject in non-TTY environments (safer default)
    if (!process.stdin.isTTY) {
      log('Not running in interactive mode. Use --yes flag to auto-confirm.', colors.yellow);
      resolve(false);
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Do you want to proceed with deletion? (yes/no): ', answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

const SEPARATOR = '='.repeat(50);

async function main() {
  log('=== AI Files Cleanup Script ===', colors.blue);
  log(`Project root: ${projectRoot}`, colors.gray);
  log(`Mode: ${dryRun ? 'DRY RUN (no actual deletion)' : 'LIVE DELETION'}`, dryRun ? colors.yellow : colors.red);
  log('');

  const projectRootPrefix = projectRoot + path.sep;
  const results = {
    toDelete: [],
    skipped: [],
    errors: [],
  };

  // Validate, resolve, and stat each entry in one pass
  log('Scanning for AI-related files and folders...', colors.gray);
  for (const p of pathsToDelete) {
    if (!p || typeof p !== 'string') throw new Error(`Invalid path entry: ${JSON.stringify(p)}`);
    const absolutePath = path.resolve(projectRoot, p);
    if (absolutePath !== projectRoot && !absolutePath.startsWith(projectRootPrefix)) {
      throw new Error(`Unsafe path detected (outside project root): ${absolutePath}`);
    }
    try {
      const stats = fs.statSync(absolutePath);
      const relativePath = path.relative(projectRoot, absolutePath);
      results.toDelete.push({ absolutePath, relativePath, type: stats.isDirectory() ? 'directory' : 'file' });
    } catch (error) {
      if (error.code === 'ENOENT') {
        results.skipped.push(path.relative(projectRoot, absolutePath));
      } else {
        results.errors.push({ path: absolutePath, error: error.message });
      }
    }
  }

  // Abort if scan produced unexpected errors (e.g. permission denied)
  if (results.errors.length > 0) {
    log(`\n${results.errors.length} error(s) encountered during scan — aborting:`, colors.red);
    for (const err of results.errors) {
      log(`  ${err.path}: ${err.error}`, colors.red);
    }
    process.exit(1);
  }

  // Show what will be deleted
  if (results.toDelete.length > 0) {
    log(`\nFound ${results.toDelete.length} item(s) to delete:`, colors.yellow);
    for (const item of results.toDelete) {
      log(`  [${item.type === 'directory' ? 'DIR' : 'FILE'}] ${item.relativePath}`, colors.gray);
    }
  } else {
    log('\nNo AI-related files or folders found to delete.', colors.green);
    return;
  }

  if (results.skipped.length > 0) {
    log(`\n${results.skipped.length} item(s) not found (will be skipped):`, colors.gray);
    for (const p of results.skipped) {
      log(`  ${p}`, colors.gray);
    }
  }

  // Confirmation prompt (unless --yes flag)
  if (!dryRun && !skipConfirmation) {
    log('');
    const confirmed = await confirmAction();
    if (!confirmed) {
      log('Deletion cancelled by user.', colors.yellow);
      return;
    }
  }

  // Perform deletion
  log(`\n${SEPARATOR}`, colors.blue);
  if (dryRun) {
    log('DRY RUN - No actual deletion performed', colors.yellow);
  } else {
    log('Deleting files and folders...', colors.red);
  }
  log(SEPARATOR, colors.blue);

  let successCount = 0;
  let failCount = 0;

  for (const item of results.toDelete) {
    try {
      if (dryRun) {
        log(`[DRY RUN] Would delete: ${item.relativePath}`, colors.yellow);
      } else {
        fs.rmSync(item.absolutePath, { recursive: true, force: true });
        log(`Deleted: ${item.relativePath}`, colors.green);
      }
      successCount++;
    } catch (error) {
      log(`Failed to delete ${item.relativePath}: ${error.message}`, colors.red);
      failCount++;
    }
  }

  // Summary
  log(`\n${SEPARATOR}`, colors.blue);
  log('Summary:', colors.blue);
  log(`  Successfully processed: ${successCount}`, colors.green);
  log(`  Failed: ${failCount}`, failCount > 0 ? colors.red : colors.green);
  log(`  Skipped (not found): ${results.skipped.length}`, colors.gray);
  log(SEPARATOR, colors.blue);

  if (dryRun) {
    log('\nRun without --dry-run flag to actually delete these files.', colors.yellow);
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  log(`\nFatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});

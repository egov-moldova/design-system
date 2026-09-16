# AGE Design System - merge-driver setup (PowerShell mirror of setup-merge-drivers.sh)
#
# `.gitattributes` marks generated files `merge=ours`. `ours` is NOT a built-in
# git merge driver (the built-ins are `text`, `binary` and `union`): while
# `merge.ours.driver` is undefined, git runs an ordinary text merge on those
# files and reports conflicts. This script registers it so a merge keeps the
# current branch's copy, which `yarn build` then regenerates.
#
# The post-merge hint lives in the tracked `.husky/post-merge`; hooks in
# `.git/hooks` never run once Husky sets `core.hooksPath`.
#
# Invoked by the package.json `postinstall`. Idempotent; safe to re-run.

$ErrorActionPreference = 'Stop'

try {
    $null = git rev-parse --is-inside-work-tree 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[setup-merge-drivers] not inside a git work tree, skipping'
        exit 0
    }
} catch {
    Write-Host '[setup-merge-drivers] git not available, skipping'
    exit 0
}

# Native commands never trip $ErrorActionPreference, so check each exit code like `set -e` in the .sh.
git config merge.ours.name "keep the current branch's generated file; regenerate with yarn build"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git config merge.ours.driver true
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[OK] AGE merge-driver setup complete (merge.ours.driver registered)'

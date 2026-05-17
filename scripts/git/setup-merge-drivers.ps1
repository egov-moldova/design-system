# AGE Design System - merge-driver setup (PowerShell mirror of setup-merge-drivers.sh)
#
# The built-in `merge=ours` strategy declared in `.gitattributes` requires NO
# `git config` registration when used at file-attribute level. This script:
#   1. Verifies we are inside a git work tree.
#   2. Installs a `post-merge` hook into the SHARED hooks dir (works for linked
#      worktrees because `git rev-parse --git-common-dir` resolves to the
#      original .git, not the per-worktree pointer).
#   3. Hook prints a hint to run `yarn build` when a merge touches auto-gen files.
#
# Idempotent; safe to re-run.

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

$commonDir = git rev-parse --git-common-dir
$hookDir = Join-Path $commonDir 'hooks'
if (-not (Test-Path $hookDir)) {
    New-Item -ItemType Directory -Force -Path $hookDir | Out-Null
}

# Write the post-merge hook with LF line endings (Git Bash will execute it).
$hookPath = Join-Path $hookDir 'post-merge'
$hookContent = @'
#!/usr/bin/env sh
# Installed by scripts/git/setup-merge-drivers.ps1
CHANGED=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD 2>/dev/null | \
  grep -E '^(src/components\.d\.ts|src/components/.*/readme\.md|src/hidden/.*/readme\.md|\.storybook/custom-elements\.json|tokens/generated/)' || true)
if [ -n "$CHANGED" ]; then
  printf "\n[i] Auto-generated files changed during merge. Run:\n    yarn build\n  then commit any residual diff.\n\n"
fi
'@

# Force LF endings + no BOM so Git Bash sh executes the hook cleanly.
$lfContent = $hookContent -replace "`r`n", "`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($hookPath, $lfContent, $utf8NoBom)

Write-Host "[OK] AGE merge-driver setup complete (built-in 'ours' + post-merge hint at $hookPath)"

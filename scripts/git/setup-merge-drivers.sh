#!/usr/bin/env sh
# AGE Design System — merge-driver setup (POSIX / Git Bash on Windows)
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

set -e

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[setup-merge-drivers] not inside a git work tree, skipping"
  exit 0
fi

HOOK_DIR="$(git rev-parse --git-common-dir)/hooks"
mkdir -p "$HOOK_DIR"

cat > "$HOOK_DIR/post-merge" <<'EOF'
#!/usr/bin/env sh
# Installed by scripts/git/setup-merge-drivers.sh
CHANGED=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD 2>/dev/null | \
  grep -E '^(src/components\.d\.ts|src/components/.*/readme\.md|src/hidden/.*/readme\.md|(react|angular|vue)-design-system/.*stencil-generated|angular-design-system/src/directives|angular-design-system/src/public-api\.ts|components/|\.storybook/custom-elements\.json|tokens/generated/)' || true)
if [ -n "$CHANGED" ]; then
  printf "\n[i] Auto-generated files changed during merge. Run:\n    yarn build && yarn build.react && yarn build.angular && yarn build.vue\n  then commit any residual diff.\n\n"
fi
EOF

chmod +x "$HOOK_DIR/post-merge"
echo "[OK] AGE merge-driver setup complete (built-in 'ours' + post-merge hint at $HOOK_DIR/post-merge)"

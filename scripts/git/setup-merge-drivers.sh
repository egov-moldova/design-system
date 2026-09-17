#!/usr/bin/env sh
# AGE Design System — merge-driver setup (POSIX / Git Bash on Windows)
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
# Invoked by scripts/git/install-hooks.mjs. Idempotent; safe to re-run.

set -e

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[setup-merge-drivers] not inside a git work tree, skipping"
  exit 0
fi

git config merge.ours.name "keep the current branch's generated file; regenerate with yarn build"
git config merge.ours.driver true

echo "[OK] AGE merge-driver setup complete (merge.ours.driver registered)"

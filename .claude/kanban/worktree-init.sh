#!/usr/bin/env bash
# worktree-init.sh — Initialize a redesign worktree for a single component (Mac/Linux)
#
# Usage:
#   ./.claude/kanban/worktree-init.sh cor-button
#   ./.claude/kanban/worktree-init.sh cor-input 6010
#
# Behavior:
#   1. Creates `redesign/<ComponentName>` branch from `main` if it doesn't exist
#   2. Adds a git worktree at `../age-design-redesign-<ComponentName>`
#   3. Allocates a free Storybook port starting at $START_PORT (default 6007)
#   4. Installs deps in the worktree (yarn install --immutable)
#   5. Starts `yarn sp.dev.watch` in the background on the allocated port
#   6. Writes a `worktree.info` file in the worktree with port + branch + timestamp
#   7. Prints: WORKTREE_PATH=... ; STORYBOOK_PORT=... (parseable by orchestrators)

set -euo pipefail

COMPONENT_NAME="${1:?Usage: $0 <component-name> [start-port]}"
START_PORT="${2:-6007}"
END_PORT="${END_PORT:-6020}"
BASE_BRANCH="${BASE_BRANCH:-main}"
WORKTREE_ROOT="${WORKTREE_ROOT:-..}"
SKIP_INSTALL="${SKIP_INSTALL:-0}"
SKIP_STORYBOOK="${SKIP_STORYBOOK:-0}"

# Disable ANSI colors so chat output stays readable
export FORCE_COLOR=0
export NO_COLOR=1

# --- Validate inputs ---

if [[ ! "$COMPONENT_NAME" =~ ^cor- ]]; then
  echo "Error: ComponentName must start with 'cor-'. Got: $COMPONENT_NAME" >&2
  exit 1
fi

# --- Resolve paths ---

REPO_ROOT="$(git rev-parse --show-toplevel)"
if [[ -z "$REPO_ROOT" ]]; then
  echo "Error: Not inside a git repository." >&2
  exit 1
fi

WORKTREE_DIR_NAME="age-design-redesign-$COMPONENT_NAME"
# Resolve absolute path for worktree
ABS_WORKTREE_ROOT="$(cd "$WORKTREE_ROOT" && pwd)"
WORKTREE_PATH="$ABS_WORKTREE_ROOT/$WORKTREE_DIR_NAME"
BRANCH_NAME="redesign/$COMPONENT_NAME"

# --- Find free Storybook port ---

is_port_free() {
  local port="$1"
  if command -v lsof > /dev/null 2>&1; then
    ! lsof -i ":$port" > /dev/null 2>&1
  elif command -v ss > /dev/null 2>&1; then
    ! ss -tln "sport = :$port" 2>/dev/null | grep -q LISTEN
  else
    ! netstat -an 2>/dev/null | grep -q ":$port .* LISTEN"
  fi
}

STORYBOOK_PORT=""
for ((p=START_PORT; p<=END_PORT; p++)); do
  if is_port_free "$p"; then
    STORYBOOK_PORT="$p"
    break
  fi
done

if [[ -z "$STORYBOOK_PORT" ]]; then
  echo "Error: No free port in range $START_PORT..$END_PORT. Free one and retry." >&2
  exit 1
fi

echo "[init] Allocated Storybook port: $STORYBOOK_PORT"

# --- Create worktree ---

if [[ -d "$WORKTREE_PATH" ]]; then
  echo "[init] Worktree path already exists: $WORKTREE_PATH"
  echo "[init] Skipping creation; verifying it's a valid git worktree..."
  EXISTING_BRANCH="$(cd "$WORKTREE_PATH" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
  if [[ "$EXISTING_BRANCH" != "$BRANCH_NAME" ]]; then
    echo "Error: Worktree exists but is on branch '$EXISTING_BRANCH', expected '$BRANCH_NAME'. Aborting." >&2
    exit 1
  fi
else
  echo "[init] Fetching $BASE_BRANCH from origin..."
  git fetch origin "$BASE_BRANCH" --quiet

  if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    echo "[init] Branch $BRANCH_NAME exists locally — adding worktree on it"
    git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
  elif git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME"; then
    echo "[init] Branch $BRANCH_NAME exists on origin — checking out as worktree"
    git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" "origin/$BRANCH_NAME"
  else
    echo "[init] Creating new branch $BRANCH_NAME from origin/$BASE_BRANCH"
    git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" "origin/$BASE_BRANCH"
  fi
fi

# --- Install deps ---

if [[ "$SKIP_INSTALL" != "1" ]]; then
  echo "[init] Running yarn install in $WORKTREE_PATH..."
  (cd "$WORKTREE_PATH" && yarn install --immutable)
fi

# --- Write worktree.info ---

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
cat > "$WORKTREE_PATH/worktree.info" <<EOF
componentName: $COMPONENT_NAME
branchName: $BRANCH_NAME
storybookPort: $STORYBOOK_PORT
createdAt: $TIMESTAMP
createdBy: worktree-init.sh
EOF

# --- Start Storybook ---

if [[ "$SKIP_STORYBOOK" != "1" ]]; then
  echo "[init] Starting Storybook on port $STORYBOOK_PORT (background)..."
  (
    cd "$WORKTREE_PATH"
    STORYBOOK_PORT="$STORYBOOK_PORT" FORCE_COLOR=0 NO_COLOR=1 nohup yarn sp.dev.watch --port "$STORYBOOK_PORT" > "$WORKTREE_PATH/storybook.log" 2>&1 &
    echo $! > "$WORKTREE_PATH/storybook.pid"
  )
  sleep 8
fi

# --- Output (parseable by orchestrator) ---

echo ""
echo "===== WORKTREE READY ====="
echo "WORKTREE_PATH=$WORKTREE_PATH"
echo "STORYBOOK_PORT=$STORYBOOK_PORT"
echo "BRANCH_NAME=$BRANCH_NAME"
echo "==========================="
echo ""
echo "Next steps:"
echo "  cd $WORKTREE_PATH"
echo "  # Invoke redesign-component agent with --worktree-aware --write-mode=parallel-write"
echo ""
echo "To stop Storybook later:"
echo "  kill \$(cat $WORKTREE_PATH/storybook.pid)"
echo ""
echo "To clean up the worktree after PR merges:"
echo "  git worktree remove $WORKTREE_PATH"
echo "  git branch -d $BRANCH_NAME"

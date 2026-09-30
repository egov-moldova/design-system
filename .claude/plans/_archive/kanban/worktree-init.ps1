# worktree-init.ps1 — Initialize a redesign worktree for a single component (Windows)
#
# Usage:
#   .\.claude\kanban\worktree-init.ps1 -ComponentName mud-button
#   .\.claude\kanban\worktree-init.ps1 -ComponentName mud-input -StartPort 6010
#
# Behavior:
#   1. Creates `redesign/<ComponentName>` branch from `main` if it doesn't exist
#   2. Adds a git worktree at `..\age-design-redesign-<ComponentName>`
#   3. Allocates a free Storybook port starting at $StartPort (default 6007)
#   4. Installs deps in the worktree (yarn install --immutable)
#   5. Starts `yarn sp.dev.watch` in the background on the allocated port
#   6. Writes a `worktree.info` file in the worktree with port + branch + timestamp
#   7. Prints: WORKTREE_PATH=... ; STORYBOOK_PORT=... (parseable by orchestrators)

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ComponentName,

    [int]$StartPort = 6007,
    [int]$EndPort = 6020,

    [string]$BaseBranch = "main",
    [string]$WorktreeRoot = "..",

    [switch]$SkipInstall,
    [switch]$SkipStorybook
)

$ErrorActionPreference = "Stop"

# --- Validate inputs ---

if (-not $ComponentName.StartsWith("mud-")) {
    Write-Error "ComponentName must start with 'mud-'. Got: $ComponentName"
    exit 1
}

# --- Resolve paths ---

$repoRoot = (git rev-parse --show-toplevel)
if (-not $repoRoot) {
    Write-Error "Not inside a git repository."
    exit 1
}

$worktreeDirName = "age-design-redesign-$ComponentName"
$worktreePath = Join-Path -Path (Resolve-Path $WorktreeRoot) -ChildPath $worktreeDirName
$branchName = "redesign/$ComponentName"

# --- Find free Storybook port ---

function Test-PortFree {
    param([int]$Port)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

$storybookPort = $null
for ($p = $StartPort; $p -le $EndPort; $p++) {
    if (Test-PortFree -Port $p) {
        $storybookPort = $p
        break
    }
}

if (-not $storybookPort) {
    Write-Error "No free port in range $StartPort..$EndPort. Free one and retry."
    exit 1
}

Write-Host "[init] Allocated Storybook port: $storybookPort" -ForegroundColor Cyan

# --- Create worktree ---

if (Test-Path $worktreePath) {
    Write-Host "[init] Worktree path already exists: $worktreePath" -ForegroundColor Yellow
    Write-Host "[init] Skipping creation; verifying it's a valid git worktree..." -ForegroundColor Yellow
    Push-Location $worktreePath
    $existingBranch = (git rev-parse --abbrev-ref HEAD 2>$null)
    Pop-Location
    if ($existingBranch -ne $branchName) {
        Write-Error "Worktree exists but is on branch '$existingBranch', expected '$branchName'. Aborting."
        exit 1
    }
} else {
    # Ensure base branch is up-to-date
    Write-Host "[init] Fetching $BaseBranch from origin..." -ForegroundColor Cyan
    git fetch origin $BaseBranch --quiet

    # Check if branch already exists locally or remotely
    $localExists = (git show-ref --verify --quiet "refs/heads/$branchName"; $LASTEXITCODE -eq 0)
    $remoteExists = (git show-ref --verify --quiet "refs/remotes/origin/$branchName"; $LASTEXITCODE -eq 0)

    if ($localExists) {
        Write-Host "[init] Branch $branchName exists locally — adding worktree on it" -ForegroundColor Cyan
        git worktree add $worktreePath $branchName
    } elseif ($remoteExists) {
        Write-Host "[init] Branch $branchName exists on origin — checking out as worktree" -ForegroundColor Cyan
        git worktree add $worktreePath -b $branchName "origin/$branchName"
    } else {
        Write-Host "[init] Creating new branch $branchName from origin/$BaseBranch" -ForegroundColor Cyan
        git worktree add $worktreePath -b $branchName "origin/$BaseBranch"
    }
}

# --- Install deps ---

if (-not $SkipInstall) {
    Write-Host "[init] Running yarn install in $worktreePath..." -ForegroundColor Cyan
    Push-Location $worktreePath
    try {
        $env:FORCE_COLOR = "0"
        $env:NO_COLOR = "1"
        yarn install --immutable
    } finally {
        Pop-Location
    }
}

# --- Write worktree.info ---

$timestamp = (Get-Date -Format "o")
$infoLines = @(
    "componentName: $ComponentName",
    "branchName: $branchName",
    "storybookPort: $storybookPort",
    "createdAt: $timestamp",
    "createdBy: worktree-init.ps1"
)
$infoLines | Set-Content -Path (Join-Path $worktreePath "worktree.info") -Encoding UTF8

# --- Start Storybook ---

if (-not $SkipStorybook) {
    Write-Host "[init] Starting Storybook on port $storybookPort (background)..." -ForegroundColor Cyan
    $env:STORYBOOK_PORT = $storybookPort
    Push-Location $worktreePath
    try {
        # Try to pass port via env (Storybook respects STORYBOOK_PORT in most configs);
        # alternatively, sp.dev.watch script may need --port forwarding configured in package.json
        Start-Job -Name "storybook-$ComponentName" -ScriptBlock {
            param($cwd, $port)
            Set-Location $cwd
            $env:STORYBOOK_PORT = $port
            $env:FORCE_COLOR = "0"
            $env:NO_COLOR = "1"
            yarn sp.dev.watch --port $port
        } -ArgumentList $worktreePath, $storybookPort | Out-Null
        Start-Sleep -Seconds 8
    } finally {
        Pop-Location
    }
}

# --- Output (parseable by orchestrator) ---

Write-Host ""
Write-Host "===== WORKTREE READY =====" -ForegroundColor Green
Write-Output "WORKTREE_PATH=$worktreePath"
Write-Output "STORYBOOK_PORT=$storybookPort"
Write-Output "BRANCH_NAME=$branchName"
Write-Host "===========================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  cd $worktreePath" -ForegroundColor Cyan
Write-Host "  # Invoke redesign-component agent with --worktree-aware --write-mode=parallel-write" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop Storybook later:" -ForegroundColor Yellow
Write-Host "  Stop-Job -Name storybook-$ComponentName; Remove-Job -Name storybook-$ComponentName" -ForegroundColor Yellow
Write-Host ""
Write-Host "To clean up the worktree after PR merges:" -ForegroundColor Yellow
Write-Host "  git worktree remove $worktreePath" -ForegroundColor Yellow
Write-Host "  git branch -d $branchName" -ForegroundColor Yellow

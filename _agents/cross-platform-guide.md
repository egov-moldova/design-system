# Cross-Platform AI & Developer Usage Guide

This guide provides a quick reference for developers and AI agents working on the `@egovmd/mud` across different operating systems.

## 1. Environment & Process Management

| Action | Windows (PowerShell) | macOS / Linux (Unix) |
|---|---|---|
| **Check Port 6007** | `netstat -ano \| findstr :6007` | `lsof -i :6007` |
| **Kill Process on 6007**| `Stop-Process -Id (Get-NetTCPConnection -LocalPort 6007).OwningProcess` | `kill -9 $(lsof -ti:6007)` |
| **Check Node Version** | `node -v` (>= 22) | `node -v` (>= 22) |
| **Check Yarn Version** | `yarn -v` (4.x) | `yarn -v` (4.x) |

## 2. Filesystem Operations

| Action | Windows (PowerShell) | macOS / Linux (Unix) |
|---|---|---|
| **List Token CSS** | `ls dist/design-system/tokens/*.css` | `ls dist/design-system/tokens/*.css` |
| **Check Directory** | `Test-Path src/components/mud-button` | `ls -d src/components/mud-button` |
| **Move Component** | `Move-Item -Path src/hidden/x -Destination src/components/x` | `mv src/hidden/x src/components/x` |
| **Copy Component** | `Copy-Item -Path src/x -Destination src/y -Recurse` | `cp -r src/x src/y` |
| **Delete Artifacts** | `Remove-Item -Path dist,loader,www -Recurse -Force` | `rm -rf dist loader www` |

## 3. Searching & Auditing

| Action | Windows (PowerShell) | macOS / Linux (Unix) |
|---|---|---|
| **Grep in Files** | `Select-String "pattern" file.css` | `grep "pattern" file.css` |
| **Recursive Grep** | `Get-ChildItem -Recurse \| Select-String "pattern"` | `grep -r "pattern" .` |
| **Find CSS Vars** | `Select-String "var(--" src/**/*.css` | `grep -r "var(--" src/**/*.css` |
| **Top 20 Tokens** | `Select-String "pattern" file \| Select-Object -First 20` | `grep "pattern" file \| head -n 20` |

## 4. Git Hygiene

| Action | Windows (PowerShell) | macOS / Linux (Unix) |
|---|---|---|
| **Status** | `git status` | `git status` |
| **Recent Logs** | `git log --oneline -5` | `git log --oneline -5` |
| **Check Diff** | `git diff main...HEAD` | `git diff main...HEAD` |
| **List Branches** | `git branch` | `git branch` |

## 5. AI Agent Specifics (MCP Tools)

When calling MCP tools, the environment is automatically detected, but generated commands should always follow the dual-platform pattern established in `_agents/environment-commands.md`.

- **Context7**: `ctx7_*`
- **Figma**: `figma_*`
- **Image Compare**: `compare_*`
- **Playwright**: `browser_*`
- **Memory**: `memory_*`
- **Snyk**: `snyk_*`

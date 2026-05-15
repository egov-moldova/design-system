# Plan - Cross-Platform Command Support for AGENTS and Workflows

Update all core documentation and AI workflows to support both Windows (PowerShell) and macOS/Linux (Unix) commands, ensuring seamless cross-platform development.

## Proposed Changes

### 1. Document Command Equivalents
| Action | Windows (PowerShell) | macOS / Linux (Unix) |
|---|---|---|
| Check Port 6007 | `netstat -ano \| findstr :6007` | `lsof -i :6007` or `netstat -tulpn \| grep 6007` |
| Check Token Files | `Get-ChildItem dist/design-system/tokens/*.css` | `ls dist/design-system/tokens/*.css` |
| Search in Files | `Select-String "pattern" file` | `grep "pattern" file` |
| Move Directory | `Move-Item -Path src/a -Destination src/b` | `mv src/a src/b` |
| Git Log | `git log --oneline -5` | `git log --oneline -5` (same) |

### 2. Update AGENTS.md & _agents/
- **_agents/mcp-tools.md**: Remove the "Windows-only" restriction and add cross-platform guidance.
- **_agents/environment-commands.md**: Convert single-platform code blocks into dual-platform blocks.
- **_agents/pre-implementation.md**: Add Unix `grep` equivalents for token validation.

### 3. Update .windsurf/workflows/
- Update all 12 workflow files (new-component, modify-component, audit-*, etc.).
- Convert all `powershell` code blocks to generic `bash` or dual blocks where necessary.
- Standardize the "Environment Check" step across all workflows to be cross-platform.

### 4. Implementation Strategy
- Use Markdown headers or clear labels to distinguish between Windows and Unix commands within the same file.
- Example:
  ```bash
  # Windows (PowerShell)
  netstat -ano | findstr :6007
  
  # macOS / Linux (Unix)
  lsof -i :6007
  ```

## Verification Plan
- **Automated**: Run `grep` to ensure no single-platform commands remain without equivalents.
- **Manual**: Verify that all 20+ identified files have been updated and are readable.

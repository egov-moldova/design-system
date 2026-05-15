---
name: terminal-ansi-colors
description: Use when running terminal commands that may emit ANSI color codes. Prefix commands to disable colors so Cascade chat output stays readable.
---

# Terminal ANSI Colors

## Rule

For `run_command` calls that may print colored output, disable ANSI colors before the command.

## Use

Apply to commands such as:

- `yarn`, `npm`, `pnpm`
- `git`
- `eslint`, `prettier`
- `jest`, `vitest`
- build, lint, test, and status commands

## Prefixes

### PowerShell (Windows)

```powershell
$env:FORCE_COLOR="0"; $env:NO_COLOR="1"; <command>
```

### Bash/Zsh (Linux/macOS)

```bash
FORCE_COLOR=0 NO_COLOR=1 <command>
```

## Notes

- Only apply this to Cascade-executed commands.
- Do not modify `package.json` or user shell config for this.
- If a tool still emits colors, add its explicit no-color flag.

# ANSI Color Handling for Cascade Terminal

When running terminal commands via the `run_command` tool, ALWAYS prefix commands with environment variables to disable ANSI colors. This ensures that the output in the Cascade chat panel is clean and readable (without raw escape sequences like `[36m`).

## Required Environment Variables

For every `run_command` call, use:

- `FORCE_COLOR=0`
- `NO_COLOR=1`

## Implementation Examples

Depending on the shell Cascade is running in (check the operating system / environment):

### For Bash/Zsh (Linux / macOS)

Instead of:
`yarn dx:stencil:once`

Use:
`FORCE_COLOR=0 NO_COLOR=1 yarn dx:stencil:once`
*(Note: `cross-env` can also be used if the command is run via npm scripts, but direct variable assignment works natively in Bash).*

### For PowerShell (pwsh) (Windows)

Instead of:
`yarn dx:stencil:once`

Use:
`$env:FORCE_COLOR="0"; $env:NO_COLOR="1"; yarn dx:stencil:once`

This rule applies ONLY to commands executed by Cascade. Do NOT modify `package.json` to hardcode these variables, as the user wants to keep colors in their standard system terminal.

# Tokenhaus Sync Workflow

## Scope
Governs `scripts/sync-tokens-from-tokenhaus.mjs` — pulling a Figma Tokenhaus export into
`tokens/`. **Read before running `yarn sync:tokens` or `yarn sync:tokens:apply`.**

---

Two modes: **staging** (review) and **apply** (clean break to `tokens/core/`).

## Staging mode (safe, default)

Writes generated files under `tokens/figma-export/` so you can diff before promoting.

```bash
yarn sync:tokens
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run --report reports/tokenhaus-sync.json
node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --dry-run --strict
```

## Apply mode (destructive, clean break)

`--apply` forces the output base to `tokens/`, overwrites `tokens/core/{palette,color,font,sizes}.tokens.json` and `tokens/core.dark/color.tokens.json`, and deletes legacy orphan files:

```text
tokens/core/space.tokens.json
tokens/core/spacing.tokens.json
tokens/core/radius.tokens.json
tokens/core/border.tokens.json
tokens/core/lineHeight.tokens.json
tokens/core/letterSpacing.tokens.json
tokens/core/shadow.tokens.json
```

Always preview first with `--apply --dry-run`. The script refuses an explicit `--output` other than `tokens/` when `--apply` is set.

```bash
node scripts/sync-tokens-from-tokenhaus.mjs --apply --dry-run     # preview deletions
yarn sync:tokens:apply                                            # real run
```

`tokens/core/effects.tokens.json` (dropShadow.100..500) must be authored manually before the clean break — otherwise the shadow palette is lost.

## Flag reference

- **Staging vs apply**: default is staging (`tokens/figma-export/`); `--apply` overwrites canonical token folders and deletes legacy orphans
- **Dry-run first**: combine `--dry-run` with `--apply` to preview the clean break without writing or deleting anything
- **Strict mode**: use `--strict` to fail the run on skipped sections, missing modes, or unresolved reference namespaces
- **Reports**: `--report <file>` writes a machine-readable manifest of generated files, skips, warnings, and orphan deletions

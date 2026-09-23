# Changelog fragments

Don't edit `CHANGELOG.md` in a PR. Add one file here for each change a consumer of
`@egov-moldova/mud` would notice. Each PR adds its own file, so two open PRs never conflict
over the changelog.

## Format

Name the file after the PR or branch, e.g. `changes/pr-121-native-aria-label.md`:

```markdown
---
type: Changed
title: components read the native `aria-label` instead of an `ariaLabel` prop
breaking: true
---

Why it changed and what it affects.

**Migration:** what a consumer has to do.
```

| Key        | Required | Values                                                                        |
| ---------- | -------- | ----------------------------------------------------------------------------- |
| `type`     | yes      | `Removed`, `Changed`, `Deprecated`, `Added`, `Fixed`, `Security`, `Internal` |
| `title`    | no       | One line. Rendered as `### <type> — <title>`                                  |
| `breaking` | no       | `true` sorts the entry first within its type and adds `(breaking)`            |

A fragment needs a title, a body, or both. Comments (`# …`) in the front matter must be on
a line of their own.

Check your fragments with `yarn changelog.check`.

## Releasing (maintainers)

The publish pipeline never commits back to GitHub, so cut the changelog in a release PR
**before** running the production pipeline, using the same version:

```bash
yarn changelog.release 1.1.10 --dry-run   # preview
yarn changelog.release 1.1.10             # writes CHANGELOG.md, deletes the fragments
```

The script adds a `## 1.1.10 — <today>` section to the top of `CHANGELOG.md`, sorted by type,
and deletes the fragment files. It refuses prerelease versions (`-dev.N`) and any version
that already has a section. When there are no fragments it leaves the file unchanged.

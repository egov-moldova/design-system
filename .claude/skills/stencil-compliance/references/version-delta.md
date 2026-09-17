# Stencil version delta

Load when upgrading `@stencil/core`, or when a rule depends on which Stencil minor introduced a
feature. This is the only file in the skill that states the pinned version.

Pinned: `@stencil/core` `~4.45.0` (`package.json`). Re-check on every upgrade:
`npm view @stencil/core@<new> dist.tarball` → read `CHANGELOG.md` between the old and new versions.
stenciljs.com documents 4.43 as its default version (version selector, checked 2026-09-17).

## Stencil 4.45

- 4.37: `Mixin()` and class inheritance (<https://stenciljs.com/docs/extends>); watchers fire earlier (breaking). Not adopted here.
- 4.38: `@PropSerialize` / `@AttrDeserialize`. Unused here; their runtime behaviour is in [`form-reactivity.md`](form-reactivity.md#serialization).
- 4.41.3: form-associated components get `name`, `form`, `disabled` in their JSX typings when not declared as props — typing only (`compiler/stencil.js:277363,277406`).
- Form-associated boolean props: the attribute string `"false"` parses as `true` (`internal/client/index.js:2352-2353`). Default boolean props to `false` there (`STENCIL-FORM-BOOLEAN-DEFAULT-TRUE`).
- Local Yarn patch `.yarn/patches/@stencil-core-npm-4.45.0-053ef963ac.patch` (applied through `package.json` `resolutions`) adds `OneOf3` required-prop typing for JSX `attr:`/`prop:` prefixes. Re-create it on upgrade; the skill parity spec fails if it stops applying.

## Watch

- Stencil 5 is in beta (`npm view @stencil/core dist-tags` → `beta: 5.0.0-beta.12`, `latest: 4.45.0`, 2026-09-17). Re-read this file when a 5.0.0 stable ships.

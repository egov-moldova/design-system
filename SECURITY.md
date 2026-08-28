# Security Policy

## Supported Versions

MUD follows [semantic versioning](https://semver.org/). Security fixes are
applied to the latest published major version of each package on npm.

| Package | Supported |
| --- | --- |
| `@egov-moldova/design-system` | latest `1.x` |
| `@egov-moldova/design-system-web-components` | latest `1.x` |
| `@egov-moldova/design-system-react` | not yet published |

Older major versions are not patched — please upgrade to the latest release
before reporting an issue.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**
Publicly disclosing a vulnerability before a fix is available puts every
downstream consumer — including Moldovan government digital services built
on MUD — at risk.

Instead, report it privately by reaching out directly to one of the project's
active contributors/maintainers (see the [contributors list](https://github.com/egov-moldova/design-system/graphs/contributors))
with:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code or a minimal repro, if possible)
- The affected package(s) and version(s)
- Any suggested mitigation, if you have one

If your GitHub account supports it, you may alternatively use
[GitHub's private vulnerability reporting](https://github.com/egov-moldova/design-system/security/advisories/new)
for this repository.

### What to expect

- We will investigate, confirm the issue, and work with you to understand
  scope and severity.
- We will keep you informed of progress toward a fix and agree with you on
  a disclosure timeline before any public announcement.

### Scope

In scope:

- The published npm packages (`@egov-moldova/design-system`,
  `@egov-moldova/design-system-web-components`, and the in-progress React
  adapter)
- Build tooling in `scripts/` that runs as part of the publish pipeline
- The Storybook deployment configuration (`Dockerfile`, `docker-compose.yml`,
  `.github/workflows/`) to the extent it affects the integrity of published
  artifacts

Thank you for helping keep design-system and the services built on it secure.

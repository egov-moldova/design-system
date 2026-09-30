# Storybook deployment operations

This repository owns the Storybook delivery flow. The former
`Design.ReleasePackages` repository supplied the Helm baseline, but it is no
longer required by the GitHub Actions deployment workflow.

## What is deployed

The workflow publishes `harbor.staging.egov.md/design/mud-storybook`, an nginx
image containing the static Storybook site. Kubernetes deploys this image to
`mud.dev.egov.md`.

The Helm chart intentionally contains only the resources this static site
uses: Deployment, Service, Ingress, and NetworkPolicy.

## Workflow map

- `CI Pipeline` runs for pull requests and `main`, validates source, and
  performs a non-pushing Docker build.
- `Deploy Storybook to development` runs only after a successful
  `CI Pipeline` push run on `main`. It pushes an immutable
  `sha-<full-commit-sha>` image, deploys that image with Helm, then updates the
  `dev` image alias.

## Required GitHub configuration

### 1. Protect `main`

In **Settings → Branches → Branch protection rules**, protect `main` and
require the CI jobs before merge. Disable direct pushes for normal
contributors.

### 2. Configure Harbor

Create a project-scoped Harbor robot account with pull and push access to
`design/mud-storybook`. Add these secrets to the `development` GitHub
environment:

- `HARBOR_USERNAME`
- `HARBOR_PASSWORD`

These credentials let GitHub Actions push images. They are separate from the
Kubernetes `harbor-staging` image pull Secret, which the cluster uses to pull
images.

### 3. Configure Kubernetes

Create a namespace-scoped deploy identity for the `design` namespace. It must
be able to run Helm upgrades for this release and read rollout status. Put the
complete, least-privilege kubeconfig contents in the `development` environment
secret:

- `KUBE_CONFIG_DEV`

The kubeconfig API endpoint must be reachable from the selected Actions runner.
Do not commit kubeconfig, service-account tokens, or Harbor passwords.

### 4. Configure the `development` environment

Restrict it to `main`. Add these environment variables:

| Variable | Value |
| --- | --- |
| `HARBOR_REGISTRY` | `harbor.staging.egov.md` |
| `HARBOR_IMAGE_REPOSITORY` | `design/mud-storybook` |
| `K8S_NAMESPACE` | `design` |
| `HELM_RELEASE` | `dev` |

The workflow defaults to `ubuntu-latest`. If Harbor or the Kubernetes API is
private, register a Linux self-hosted runner with network access and a unique
label, then set `DEPLOY_RUNNER` to that label. The runner also needs Docker.

## First cutover

1. Merge the workflow and chart files to `main`.
2. Confirm `CI Pipeline` succeeds.
3. Confirm the automatic development deployment pushes the immutable image and
   updates `mud.dev.egov.md`.
4. After successful cutover, disable the old Azure Storybook deployment and
   make its obsolete configuration read-only or archive it.

Do not disable Azure delivery before the first GitHub deployment has been
verified. Both systems publishing the same mutable tags at the same time would
make ownership ambiguous.

## Local Helm validation

```bash
helm lint deploy/design.system/chart --values deploy/design.system/values.dev.yaml
helm template dev deploy/design.system/chart \
  --namespace design \
  --values deploy/design.system/values.dev.yaml \
  --set-string deployment.webui.image.tag=sha-local
```

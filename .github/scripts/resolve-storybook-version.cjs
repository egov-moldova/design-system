const fs = require('node:fs');

const PACKAGE_NAME = '@egov-moldova/mud';
const REGISTRY_URL = `https://registry.npmjs.org/${encodeURIComponent(PACKAGE_NAME)}`;
const FULL_SHA = /^[0-9a-f]{40}$/i;
const NPM_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function resolveStorybookVersion(metadata, requestedVersion = 'latest') {
  const selector = requestedVersion.trim() || 'latest';
  const version = selector === 'latest' ? metadata['dist-tags']?.latest : selector;

  if (!version || !metadata.versions?.[version]) {
    throw new Error(`@egov-moldova/mud version '${selector}' does not exist in the npm registry.`);
  }
  if (!NPM_VERSION.test(version)) {
    throw new Error(`npm resolved an unsafe package version '${version}'.`);
  }

  const sourceSha = metadata.versions[version].gitHead;
  if (!FULL_SHA.test(sourceSha ?? '')) {
    throw new Error(
      `@egov-moldova/mud@${version} has no valid gitHead. Republish it with the updated CD workflow before deploying it.`,
    );
  }

  return {
    version,
    sourceSha: sourceSha.toLowerCase(),
    shortSha: sourceSha.slice(0, 12).toLowerCase(),
  };
}

async function main() {
  const response = await fetch(REGISTRY_URL);
  if (!response.ok) {
    throw new Error(`npm registry returned HTTP ${response.status}.`);
  }

  const resolved = resolveStorybookVersion(await response.json(), process.argv[2] ?? 'latest');

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `component_version=${resolved.version}\nsource_sha=${resolved.sourceSha}\nshort_sha=${resolved.shortSha}\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(resolved)}\n`);
}

module.exports = { resolveStorybookVersion };

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

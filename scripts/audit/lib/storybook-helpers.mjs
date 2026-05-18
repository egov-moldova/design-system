/**
 * Storybook environment helpers shared by Tier 2 (browser) audit scripts.
 *
 *  - DEFAULT_PORT             — 6007 (per repo convention, see AGENTS.md)
 *  - DEFAULT_BASE_URL         — http://localhost:6007
 *  - isStorybookReachable     — async TCP probe; resolves true/false
 *  - storyUrl                 — build iframe URL for a Storybook story id
 *  - inferStoryId             — best-effort `<category>-<bare>--<exportName>` builder
 *
 * Worktree-aware: callers may pass `port` (e.g. 6008 when a Cline Kanban
 * worktree runs Storybook on a custom port). Defaults keep single-checkout
 * workflows simple.
 */
import net from 'node:net';

export const DEFAULT_PORT = 6007;
export const DEFAULT_BASE_URL = `http://localhost:${DEFAULT_PORT}`;

/**
 * Probe a TCP port without using shell commands (cross-platform, no `lsof`/`netstat`).
 * Resolves to `true` if something is listening on `host:port` within the timeout.
 */
export function isStorybookReachable({ host = 'localhost', port = DEFAULT_PORT, timeoutMs = 1500 } = {}) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let settled = false;
    const finish = val => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        /* noop */
      }
      resolve(val);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

/**
 * Build a Storybook iframe URL for a given story id.
 *
 *   storyUrl({ storyId: 'atoms-button--default' })
 *     → 'http://localhost:6007/iframe.html?id=atoms-button--default&viewMode=story'
 */
export function storyUrl({ storyId, baseUrl = DEFAULT_BASE_URL, viewMode = 'story', args = null } = {}) {
  if (!storyId) throw new Error('storyUrl: storyId is required');
  const params = new URLSearchParams({ id: storyId, viewMode });
  if (args && typeof args === 'object') {
    const encoded = Object.entries(args)
      .map(([k, v]) => `${k}:${String(v)}`)
      .join(';');
    if (encoded) params.set('args', encoded);
  }
  return `${baseUrl.replace(/\/$/, '')}/iframe.html?${params.toString()}`;
}

/**
 * Best-effort story id constructor matching Storybook's own kebab-case rules.
 * Used as a fallback when the caller doesn't have a story export name.
 *
 *   inferStoryId('Atoms/Button', 'Default')
 *     → 'atoms-button--default'
 *   inferStoryId('Molecules/Tooltip', 'AllPlacements')
 *     → 'molecules-tooltip--all-placements'
 *
 * For canonical mapping, prefer scripts/audit/05-story-exports.mjs which
 * parses the actual *.stories.ts file.
 */
export function inferStoryId(title, exportName) {
  if (!title || !exportName) return null;
  const titlePart = title.split('/').map(kebabCase).join('-');
  return `${titlePart}--${kebabCase(exportName)}`;
}

function kebabCase(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

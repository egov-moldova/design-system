// Git exports the repository's location to every hook it runs (GIT_DIR, and in a
// linked worktree GIT_INDEX_FILE and friends). A child `git` inherits them and
// they win over `cwd` and `-C`, so a spec that builds a scratch repo inside
// `.husky/pre-push` commits, branches and writes config in the real repository.

/** Environment variables that tell git which repository, index and work tree to use. */
export const GIT_LOCATION_VARS = Object.freeze([
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_NAMESPACE',
  'GIT_PREFIX',
]);

/** A copy of `env` in which git resolves the repository from `cwd` / `-C` again. */
export function withoutGitLocation(env = process.env) {
  const copy = { ...env };
  for (const name of GIT_LOCATION_VARS) delete copy[name];
  return copy;
}

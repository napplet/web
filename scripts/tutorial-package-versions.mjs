const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseStableVersion(value) {
  const match = STABLE_VERSION_PATTERN.exec(value);
  if (!match) return null;

  const [major, minor, patch] = match.slice(1).map(Number);
  if (![major, minor, patch].every(Number.isSafeInteger)) return null;
  return { major, minor, patch };
}

function compareVersions(left, right) {
  for (const part of ['major', 'minor', 'patch']) {
    if (left[part] !== right[part]) return left[part] < right[part] ? -1 : 1;
  }
  return 0;
}

/**
 * Check whether a stable workspace version satisfies a simple caret range.
 *
 * Tutorial dependencies intentionally use one `^x.y.z` range. Supporting only
 * that shape keeps malformed or broadened declarations visible to CI without
 * adding a package solely for this release-time assertion.
 *
 * @param {string} range - Declared dependency range.
 * @param {string} version - Stable workspace package version.
 * @returns {boolean} Whether the version is included by the caret range.
 */
export function caretRangeIncludesVersion(range, version) {
  if (typeof range !== 'string' || !range.startsWith('^')) return false;

  const lowerBound = parseStableVersion(range.slice(1));
  const candidate = parseStableVersion(version);
  if (!lowerBound || !candidate || compareVersions(candidate, lowerBound) < 0) return false;

  if (lowerBound.major > 0) {
    return candidate.major === lowerBound.major;
  }
  if (lowerBound.minor > 0) {
    return candidate.major === 0 && candidate.minor === lowerBound.minor;
  }
  return candidate.major === 0 && candidate.minor === 0 && candidate.patch === lowerBound.patch;
}

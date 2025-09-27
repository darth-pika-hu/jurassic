export const ACCESS_ALIASES = ['access', 'aaccess'];

export function normalizeCommandKeyword(rawValue) {
  if (!rawValue) {
    return '';
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return '';
  }

  const lower = trimmed.toLowerCase();
  if (ACCESS_ALIASES.includes(lower)) {
    return 'access';
  }

  return lower;
}

export function isAccessKeyword(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return ACCESS_ALIASES.includes(value.trim().toLowerCase());
}

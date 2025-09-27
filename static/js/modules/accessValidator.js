export function isAccessCommand(input) {
  if (typeof input !== 'string') {
    return false;
  }

  const normalized = input.trim().toLowerCase();
  return normalized === 'access' || normalized === 'aaccess';
}

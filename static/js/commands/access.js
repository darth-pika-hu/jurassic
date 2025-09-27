export const ACCESS_COMMAND_PATTERN = /^(?:a)?access$/i;

export function matchesAccessCommandName(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return ACCESS_COMMAND_PATTERN.test(value.trim());
}

export const ACCESS_COMMAND_PATTERN = /^(?:a)?access$/i;

export function matchesAccessCommand(commandName) {
  return ACCESS_COMMAND_PATTERN.test(commandName);
}

export const ACCESS_PATTERN = /^(?:a)?access$/i;

export const isAccessCommandName = (value = "") => ACCESS_PATTERN.test(value.trim());

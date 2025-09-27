export const isAccessCommand = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  return /^(?:a)?access$/i.test(value.trim());
};

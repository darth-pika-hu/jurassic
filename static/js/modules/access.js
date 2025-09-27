export const isAccessCommand = (value) => {
  if (!value) {
    return false;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed === 'access' || trimmed === 'aaccess';
};

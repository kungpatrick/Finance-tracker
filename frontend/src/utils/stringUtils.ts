export const normalizeDescription = (desc: string | undefined | null) => {
  return (desc || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/[^a-z0-9\s]/g, ''); // Remove non-alphanumeric characters for a more "fuzzy" match
};
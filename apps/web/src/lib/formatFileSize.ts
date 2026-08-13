export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} Б`;
  }

  const sizeKb = bytes / 1024;
  if (sizeKb < 1024) {
    const rounded = sizeKb >= 10 ? Math.round(sizeKb) : Math.round(sizeKb * 10) / 10;
    return `${rounded} КБ`;
  }

  const sizeMb = bytes / (1024 * 1024);
  const rounded = Number.isInteger(sizeMb) ? sizeMb : Math.round(sizeMb * 10) / 10;
  return `${rounded} МБ`;
};

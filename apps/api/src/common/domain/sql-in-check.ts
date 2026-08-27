export const sqlInCheck = (column: string, values: readonly string[]): string => {
  const list = values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');
  return `"${column}" IN (${list})`;
};

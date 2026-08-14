export const getFirstErrorField = <T extends string>(
  errors: Partial<Record<T, string>>,
  order: readonly T[],
): T | undefined => order.find((field) => Boolean(errors[field]));

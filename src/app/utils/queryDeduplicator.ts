const inFlightQueries = new Map<string, Promise<any>>();

export const dedupeQuery = async <T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> => {
  if (inFlightQueries.has(key)) {
    return inFlightQueries.get(key)!;
  }

  const promise = fn().finally(() => {
    inFlightQueries.delete(key);
  });

  inFlightQueries.set(key, promise);
  return promise;
};

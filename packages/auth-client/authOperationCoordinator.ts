export function newAuthOperationCoordinator<TRefresh>(
  runRefresh: () => Promise<TRefresh>,
) {
  let operationTail = Promise.resolve();
  let refreshPromise: Promise<TRefresh> | null = null;

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const pending = operationTail.then(operation, operation);
    operationTail = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  };

  const refreshSession = (): Promise<TRefresh> => {
    if (refreshPromise) return refreshPromise;
    const pending = enqueue(runRefresh);
    refreshPromise = pending;
    const clearPending = () => {
      if (refreshPromise === pending) refreshPromise = null;
    };
    void pending.then(clearPending, clearPending);
    return pending;
  };

  const runSessionOperation = <T>(
    operation: (refreshWithinOperation: () => Promise<TRefresh>) => Promise<T>,
  ): Promise<T> => enqueue(() => operation(runRefresh));

  return { refreshSession, runSessionOperation };
}

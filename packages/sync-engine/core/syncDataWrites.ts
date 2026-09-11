import { getSyncGeneration } from "./syncState";

const activeWrites = new Set<Promise<void>>();
let pendingClear: Promise<void> = Promise.resolve();

/** Protect a whole sync write, never an HTTP request or nested repository call. */
export async function withSyncDataWrite(
  generation: number,
  write: () => Promise<void>,
): Promise<void> {
  await pendingClear;
  if (generation !== getSyncGeneration()) return;
  const operation = Promise.resolve().then(write);
  activeWrites.add(operation);
  try {
    await operation;
  } finally {
    activeWrites.delete(operation);
  }
}

/** Call immediately after invalidateSync; deletes follow all older writes. */
export async function clearSyncData(clear: () => Promise<void>): Promise<void> {
  const operation = pendingClear.then(async () => {
    await Promise.allSettled([...activeWrites]);
    await clear();
  });
  // A failed clear is reported to its caller without poisoning future clears.
  pendingClear = operation.catch(() => {});
  await operation;
}

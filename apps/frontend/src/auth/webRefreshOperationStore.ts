import { refreshOperationIdSchema } from "@packages/types/authRefresh";

export class WebRefreshOperationStoreError extends Error {
  constructor(readonly operation: "read" | "write") {
    super(`Refresh operation storage ${operation} failed`);
  }
}

export function newWebRefreshOperationStore(apiUrl: string) {
  const key = `actiko:refresh-operation:${apiUrl.replace(/\/+$/, "")}`;
  const read = () => {
    try {
      return localStorage.getItem(key);
    } catch {
      throw new WebRefreshOperationStoreError("read");
    }
  };
  const persistNew = (previous?: string) => {
    // Never remove the previous proof before this atomic overwrite commits.
    try {
      const operationId = crypto.randomUUID();
      if (
        !refreshOperationIdSchema.safeParse(operationId).success ||
        operationId === previous
      ) {
        throw new WebRefreshOperationStoreError("write");
      }
      localStorage.setItem(key, operationId);
      if (read() !== operationId) {
        throw new WebRefreshOperationStoreError("write");
      }
      return operationId;
    } catch {
      throw new WebRefreshOperationStoreError("write");
    }
  };

  return {
    read,
    getOrCreate(): string {
      const existing = read();
      if (existing !== null) {
        if (!refreshOperationIdSchema.safeParse(existing).success) {
          throw new WebRefreshOperationStoreError("read");
        }
        return existing;
      }
      // This value is a secret recovery proof. Do not fall back to Math.random,
      // expose it in diagnostics, or send a rotation before persistence succeeds.
      return persistNew();
    },
    replaceIfEquals(expected: string): string | null {
      return read() === expected ? persistNew(expected) : null;
    },
    clearIfEquals(expected: string | null) {
      if (expected !== null && read() === expected) {
        localStorage.removeItem(key);
      }
    },
  };
}

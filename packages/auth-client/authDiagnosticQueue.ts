import {
  type AuthDiagnosticReport,
  authDiagnosticReportSchema,
} from "@packages/types/authDiagnostics";

const STORAGE_PREFIX = "actiko:auth-diagnostics:v1:";
const MAX_PENDING = 6;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthDiagnosticStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  removeItem(key: string): Promise<void>;
};

function isFresh(report: AuthDiagnosticReport): boolean {
  const age = Date.now() - Date.parse(report.occurredAt);
  return age >= -60_000 && age <= MAX_AGE_MS;
}

/** Storage operations are serialized independently of every network request. */
export function createAuthDiagnosticQueue(storage?: AuthDiagnosticStorage) {
  const pending = new Map<string, AuthDiagnosticReport>();
  const acknowledged = new Set<string>();
  let work = Promise.resolve();

  const serialize = <T>(action: () => Promise<T>): Promise<T> => {
    const result = work.then(action);
    work = result.then(
      () => {},
      () => {},
    );
    return result;
  };
  const removeStored = async (key: string): Promise<boolean> => {
    try {
      await storage?.removeItem(key);
      return true;
    } catch {
      return false;
    }
  };
  const sorted = () =>
    [...pending.values()].sort(
      (a, b) =>
        a.occurredAt.localeCompare(b.occurredAt) ||
        a.eventId.localeCompare(b.eventId),
    );

  const refresh = async () => {
    if (storage) {
      try {
        const keys = (await storage.getAllKeys()).filter((key) =>
          key.startsWith(STORAGE_PREFIX),
        );
        const present = new Set(keys);
        for (const id of acknowledged) {
          if (!present.has(`${STORAGE_PREFIX}${id}`)) acknowledged.delete(id);
        }
        for (const key of keys) {
          const id = key.slice(STORAGE_PREFIX.length);
          if (acknowledged.has(id)) {
            if (await removeStored(key)) acknowledged.delete(id);
            continue;
          }
          let raw: string | null;
          try {
            raw = await storage.getItem(key);
          } catch {
            continue;
          }
          if (!raw) continue;
          if (raw.length > 3100) {
            await removeStored(key);
            continue;
          }
          try {
            const parsed = authDiagnosticReportSchema.safeParse(
              JSON.parse(raw),
            );
            if (
              !parsed.success ||
              parsed.data.eventId !== id ||
              !isFresh(parsed.data)
            ) {
              await removeStored(key);
              continue;
            }
            pending.set(id, parsed.data);
          } catch {
            await removeStored(key);
          }
        }
      } catch {
        // Diagnostic storage availability has no bearing on authentication.
      }
    }
    for (const [id, report] of pending) {
      if (!isFresh(report)) {
        pending.delete(id);
        await removeStored(`${STORAGE_PREFIX}${id}`);
      }
    }
    const excess = sorted().slice(0, Math.max(0, pending.size - MAX_PENDING));
    for (const report of excess) {
      pending.delete(report.eventId);
      await removeStored(`${STORAGE_PREFIX}${report.eventId}`);
    }
  };

  return {
    add: (report: AuthDiagnosticReport) =>
      serialize(async () => {
        const parsed = authDiagnosticReportSchema.safeParse(report);
        if (!parsed.success) return;
        const safeReport = parsed.data;
        pending.set(safeReport.eventId, safeReport);
        try {
          // A new event owns only its key; never overwrite a sibling tab's queue.
          await storage?.setItem(
            `${STORAGE_PREFIX}${safeReport.eventId}`,
            JSON.stringify(safeReport),
          );
        } catch {
          // Preserve the in-memory copy if persistence is unavailable.
        }
        await refresh();
      }),
    list: () =>
      serialize(async () => {
        await refresh();
        return sorted();
      }),
    acknowledge: (eventId: string) =>
      serialize(async () => {
        // This runs after outstanding writes, so an ACK cannot race its own save.
        pending.delete(eventId);
        acknowledged.add(eventId);
        if (await removeStored(`${STORAGE_PREFIX}${eventId}`))
          acknowledged.delete(eventId);
        // A permanently broken removeItem must not grow an unbounded ACK cache.
        while (acknowledged.size > MAX_PENDING) {
          const oldest = acknowledged.values().next().value;
          if (oldest === undefined) break;
          acknowledged.delete(oldest);
        }
      }),
  };
}

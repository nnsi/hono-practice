import type { SyncResult } from "./syncResult";

const CHUNK_SIZE = 100;

export function chunkArray<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function mergeSyncResults(results: SyncResult[]): SyncResult {
  return {
    syncedIds: results.flatMap((r) => r.syncedIds),
    serverWins: results.flatMap((r) => r.serverWins),
    skippedIds: results.flatMap((r) => r.skippedIds),
  };
}

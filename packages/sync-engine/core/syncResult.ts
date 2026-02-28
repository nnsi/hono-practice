export type ServerEntity = Record<string, unknown> & { id: string };

export type SyncResult = {
  syncedIds: string[];
  serverWins: ServerEntity[];
  skippedIds: string[];
};

export type ServerEntity = Record<string, unknown> & { id: string };

export type SyncFailure = {
  id: string;
  code: string;
  message: string;
  retryable: boolean;
};

export type SyncResult = {
  syncedIds: string[];
  serverWins: ServerEntity[];
  skippedIds: string[];
  failures?: SyncFailure[];
};

export type ServerEntity = Record<string, unknown> & { id: string };

export type SyncFailure = {
  id: string;
  code: string;
  message: string;
  retryable: boolean;
};

/** サーバーが受理した行と、サーバーに保存された updatedAt */
export type SyncedRevision = {
  id: string;
  updatedAt: string;
};

export type SyncResult = {
  syncedIds: string[];
  /** 旧バックエンドは返さない */
  syncedRevisions?: SyncedRevision[];
  serverWins: ServerEntity[];
  skippedIds: string[];
  failures?: SyncFailure[];
};

export type SyncTasksResponse = {
  syncedIds: string[]
  serverWins: Record<string, unknown>[]
  skippedIds: string[]
}

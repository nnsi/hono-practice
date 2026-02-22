export type SyncGoalsResponse = {
  syncedIds: string[]
  serverWins: Record<string, unknown>[]
  skippedIds: string[]
}

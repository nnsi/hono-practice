export type SyncActivitiesResponse = {
  activities: {
    syncedIds: string[]
    serverWins: Record<string, unknown>[]
    skippedIds: string[]
  }
  activityKinds: {
    syncedIds: string[]
    serverWins: Record<string, unknown>[]
    skippedIds: string[]
  }
}

import type { ActivityLog } from "@packages/domain"

export type SyncActivityLogsResponse = {
  syncedIds: string[]
  serverWins: ActivityLog[]
  skippedIds: string[]
}

export type GetActivityLogsResponse = {
  logs: ActivityLog[]
}

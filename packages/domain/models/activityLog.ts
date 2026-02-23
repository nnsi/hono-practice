export type ActivityLog = {
  id: string
  userId: string
  activityId: string
  activityKindId: string | null
  quantity: number | null
  memo: string
  date: string
  time: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

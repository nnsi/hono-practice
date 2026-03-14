export type ActivityLogRecord = {
  id: string;
  userId: string;
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  memo: string;
  date: string;
  time: string | null;
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

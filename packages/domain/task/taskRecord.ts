export type TaskRecord = {
  id: string;
  userId: string;
  activityId: string | null;
  activityKindId: string | null;
  quantity: number | null;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

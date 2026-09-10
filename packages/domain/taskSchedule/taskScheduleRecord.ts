/** Client storage row; dates/timestamps are strings, without branded IDs. */
export type TaskScheduleRecord = {
  id: string;
  userId: string;
  activityId: string | null;
  activityKindId: string | null;
  quantity: number | null;
  title: string;
  memo: string | null;
  recurrenceType: "interval" | "weekdays";
  intervalDays: number | null;
  weekdays: readonly number[] | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type NoteRecord = {
  id: string;
  userId: string;
  activityId: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

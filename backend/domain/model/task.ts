export type Task = {
  id: string;
  userId: string;
  title: string;
  done: boolean;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
};

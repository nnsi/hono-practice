export type ActivityRecord = {
  id: string;
  userId: string;
  name: string;
  label: string;
  emoji: string;
  iconType: "emoji" | "upload" | "generate";
  iconUrl: string | null;
  iconThumbnailUrl: string | null;
  description: string;
  quantityUnit: string;
  orderIndex: string;
  showCombinedStats: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ActivityKindRecord = {
  id: string;
  activityId: string;
  name: string;
  color: string | null;
  orderIndex: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

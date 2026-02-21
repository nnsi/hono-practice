import type { DexieActivity } from "../../db/schema";

export function getActivityEmoji(activity: DexieActivity | undefined): string {
  if (!activity) return "\u{1F4DD}";
  if (activity.iconType === "emoji" && activity.emoji) return activity.emoji;
  return "\u{1F4DD}";
}

export function getActivityIcon(activity: DexieActivity | undefined): React.ReactNode {
  if (!activity) return <span className="text-2xl">{"\u{1F4DD}"}</span>;
  if (activity.iconType === "emoji" && activity.emoji) {
    return <span className="text-2xl">{activity.emoji}</span>;
  }
  if (activity.iconThumbnailUrl || activity.iconUrl) {
    return (
      <img
        src={activity.iconThumbnailUrl || activity.iconUrl || ""}
        alt=""
        className="w-8 h-8 rounded"
      />
    );
  }
  return <span className="text-2xl">{"\u{1F4DD}"}</span>;
}

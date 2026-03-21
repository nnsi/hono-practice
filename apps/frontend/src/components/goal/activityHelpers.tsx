import type { DexieActivity } from "../../db/schema";

export function getActivityEmoji(activity: DexieActivity | undefined): string {
  if (!activity) return "\u{1F4DD}";
  if (activity.iconType === "emoji" && activity.emoji) return activity.emoji;
  return "\u{1F4DD}";
}

export function getActivityIcon(
  activity: DexieActivity | undefined,
  iconBlob?: { base64: string; mimeType: string },
): React.ReactNode {
  if (!activity) return <span className="text-2xl">{"\u{1F4DD}"}</span>;
  if (activity.iconType === "upload") {
    if (iconBlob) {
      return (
        <img
          src={`data:${iconBlob.mimeType};base64,${iconBlob.base64}`}
          alt=""
          className="w-8 h-8 rounded object-cover"
        />
      );
    }
    if (activity.iconThumbnailUrl || activity.iconUrl) {
      return (
        <img
          src={activity.iconThumbnailUrl || activity.iconUrl || ""}
          alt=""
          className="w-8 h-8 rounded object-cover"
        />
      );
    }
  }
  if (activity.iconType === "emoji" && activity.emoji) {
    return <span className="text-2xl">{activity.emoji}</span>;
  }
  return <span className="text-2xl">{"\u{1F4DD}"}</span>;
}

export function renderActivityIcon(
  activity: DexieActivity | null | undefined,
  className = "w-8 h-8",
): React.ReactNode {
  if (!activity) return <span className="text-2xl">{"\u{1F4DD}"}</span>;
  if (
    activity.iconType === "upload" &&
    (activity.iconThumbnailUrl || activity.iconUrl)
  ) {
    return (
      <img
        src={activity.iconThumbnailUrl || activity.iconUrl || ""}
        alt=""
        className={`${className} rounded-lg object-cover`}
      />
    );
  }
  return <span className="text-2xl">{activity.emoji || "\u{1F4DD}"}</span>;
}

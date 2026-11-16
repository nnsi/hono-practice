import { useEffect, useState } from "react";

import {
  type ActivityDaySummary,
  formatActivityDaySummary,
} from "@packages/frontend-shared/hooks/activityDaySummary";
import { formatQuantityWithUnit } from "@packages/frontend-shared/utils";
import { Pencil } from "lucide-react";

import { activityRepository } from "../../db/activityRepository";
import type { DexieActivity, DexieActivityIconBlob } from "../../db/schema";

export function ActivityCard({
  activity,
  summary,
  iconBlob,
  onClick,
  onEdit,
}: {
  activity: DexieActivity;
  summary?: ActivityDaySummary;
  iconBlob?: DexieActivityIconBlob;
  onClick: () => void;
  onEdit: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  // 記録済みならその日の合計、数量の無い記録だけなら件数。未記録なら null
  const doneLabel = formatActivityDaySummary(summary, (total) =>
    formatQuantityWithUnit(total, activity.quantityUnit),
  );
  const isDone = doneLabel !== null;

  useEffect(() => {
    if (activity.iconType !== "upload") return;
    if (iconBlob) return;
    const url = activity.iconThumbnailUrl || activity.iconUrl;
    if (!url) return;
    activityRepository.cacheRemoteIcon(activity.id, url);
  }, [
    activity.id,
    activity.iconType,
    activity.iconUrl,
    activity.iconThumbnailUrl,
    iconBlob,
  ]);

  const renderIcon = () => {
    if (activity.iconType === "upload" && !imageError) {
      if (iconBlob) {
        return (
          <img
            src={`data:${iconBlob.mimeType};base64,${iconBlob.base64}`}
            alt=""
            className="w-7 h-7 rounded-lg object-cover"
            onError={() => setImageError(true)}
          />
        );
      }
      if (activity.iconThumbnailUrl || activity.iconUrl) {
        return (
          <img
            src={activity.iconThumbnailUrl || activity.iconUrl || ""}
            alt=""
            className="w-7 h-7 rounded-lg object-cover"
            onError={() => setImageError(true)}
          />
        );
      }
    }
    return <span>{activity.emoji || "📝"}</span>;
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={`
          w-full flex flex-col items-center justify-center px-1.5 py-2 rounded-2xl
          min-h-[88px] select-none transition-all duration-200
          active:scale-[0.96] press-effect
          ${
            isDone
              ? "activity-done shadow-soft border"
              : "bg-white shadow-soft hover:shadow-lifted border border-gray-200/50"
          }
        `}
      >
        <span className="text-2xl leading-none mb-1.5">{renderIcon()}</span>
        <span className="w-full text-xs font-medium text-center leading-tight text-gray-800 truncate">
          {activity.name}
        </span>
        {isDone ? (
          <span className="text-[11px] font-semibold text-teal-700 h-4 leading-4 tabular-nums">
            {doneLabel}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400 h-4 leading-4">
            {activity.quantityUnit}
          </span>
        )}
      </button>
      {/* Edit button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="absolute top-0 right-0 p-2 rounded-full text-gray-300 active:bg-gray-200 transition-colors"
      >
        <Pencil size={11} />
      </button>
    </div>
  );
}

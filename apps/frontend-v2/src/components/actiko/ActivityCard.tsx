import { useState } from "react";
import { Pencil } from "lucide-react";
import type { DexieActivity, DexieActivityIconBlob } from "../../db/schema";

export function ActivityCard({
  activity,
  isDone,
  iconBlob,
  onClick,
  onEdit,
}: {
  activity: DexieActivity;
  isDone: boolean;
  iconBlob?: DexieActivityIconBlob;
  onClick: () => void;
  onEdit: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  const renderIcon = () => {
    if (activity.iconType === "upload" && !imageError) {
      if (iconBlob) {
        return (
          <img
            src={`data:${iconBlob.mimeType};base64,${iconBlob.base64}`}
            alt=""
            className="w-8 h-8 rounded-lg object-cover"
            onError={() => setImageError(true)}
          />
        );
      }
      if (activity.iconThumbnailUrl || activity.iconUrl) {
        return (
          <img
            src={activity.iconThumbnailUrl || activity.iconUrl || ""}
            alt=""
            className="w-8 h-8 rounded-lg object-cover"
            onError={() => setImageError(true)}
          />
        );
      }
    }
    return <span>{activity.emoji || "\ud83d\udcdd"}</span>;
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={`
          w-full flex flex-col items-center justify-center p-4 rounded-2xl
          min-h-[120px] select-none transition-all duration-200
          active:scale-[0.96] press-effect
          ${
            isDone
              ? "activity-done shadow-soft"
              : "bg-white shadow-soft hover:shadow-lifted border border-gray-200/50"
          }
        `}
      >
        <span className="text-3xl mb-2">{renderIcon()}</span>
        <span className="text-sm font-medium text-center leading-tight text-gray-800">
          {activity.name}
        </span>
        {activity.quantityUnit && (
          <span className="text-xs text-gray-400 mt-1">
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
        className="absolute top-1.5 right-1.5 p-2 rounded-full bg-white/80 text-gray-400 active:bg-gray-200 transition-colors"
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}

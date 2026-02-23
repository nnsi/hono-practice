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
            className="w-8 h-8 rounded object-cover"
            onError={() => setImageError(true)}
          />
        );
      }
      if (activity.iconThumbnailUrl || activity.iconUrl) {
        return (
          <img
            src={activity.iconThumbnailUrl || activity.iconUrl || ""}
            alt=""
            className="w-8 h-8 rounded object-cover"
            onError={() => setImageError(true)}
          />
        );
      }
    }
    return <span>{activity.emoji || "📝"}</span>;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={`
          w-full flex flex-col items-center justify-center p-4 rounded-xl border
          min-h-[120px] select-none transition-all duration-150
          active:scale-95 hover:shadow-md
          ${isDone ? "bg-green-50 border-green-200" : "bg-white border-gray-200 hover:bg-gray-50"}
        `}
      >
        <span className="text-3xl mb-2">{renderIcon()}</span>
        <span className="text-sm font-medium text-center leading-tight">
          {activity.name}
        </span>
        {activity.quantityUnit && (
          <span className="text-xs text-gray-400 mt-1">
            {activity.quantityUnit}
          </span>
        )}
      </button>
      {/* 編集ボタン */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="absolute top-1 right-1 p-1.5 rounded-full bg-white/80 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}

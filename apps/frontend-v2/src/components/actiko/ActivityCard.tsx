import { Pencil } from "lucide-react";
import type { DexieActivity } from "../../db/schema";

export function ActivityCard({
  activity,
  isDone,
  onClick,
  onEdit,
}: {
  activity: DexieActivity;
  isDone: boolean;
  onClick: () => void;
  onEdit: () => void;
}) {
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
        <span className="text-3xl mb-2">
          {activity.iconType === "emoji" && activity.emoji ? (
            activity.emoji
          ) : activity.iconThumbnailUrl || activity.iconUrl ? (
            <img
              src={activity.iconThumbnailUrl || activity.iconUrl || ""}
              alt=""
              className="w-8 h-8 rounded"
            />
          ) : (
            "📝"
          )}
        </span>
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

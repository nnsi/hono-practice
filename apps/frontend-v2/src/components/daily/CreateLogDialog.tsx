import { useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { LogFormBody } from "../common/LogFormBody";
import type { DexieActivity } from "../../db/schema";

export function CreateLogDialog({
  date,
  activities,
  onClose,
}: {
  date: string;
  activities: DexieActivity[];
  onClose: () => void;
}) {
  const [selectedActivity, setSelectedActivity] =
    useState<DexieActivity | null>(null);

  if (selectedActivity) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
        <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">
                  {selectedActivity.emoji || "📝"}
                </span>
                {selectedActivity.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <LogFormBody
            activity={selectedActivity}
            date={date}
            onDone={onClose}
          />
        </div>
      </div>
    );
  }

  // アクティビティ選択画面
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-3">
          <h2 className="text-lg font-bold">アクティビティを選択</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6 space-y-2">
          {activities.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              アクティビティがありません
            </div>
          ) : (
            activities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => setSelectedActivity(activity)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition-all text-left"
              >
                <span className="flex items-center justify-center w-10 h-10 text-2xl shrink-0">
                  {activity.iconType === "upload" &&
                  activity.iconThumbnailUrl ? (
                    <img
                      src={activity.iconThumbnailUrl}
                      alt={activity.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    activity.emoji || "📝"
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium">{activity.name}</div>
                  {activity.quantityUnit && (
                    <div className="text-xs text-gray-400">
                      {activity.quantityUnit}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

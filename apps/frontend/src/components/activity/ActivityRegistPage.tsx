import type React from "react";

import type { GetActivityResponse } from "@dtos/response";
import { useActivityRegistPage } from "@frontend/hooks/feature/activity/useActivityRegistPage";
import { Pencil1Icon, PlusCircledIcon } from "@radix-ui/react-icons";

import {
  ActivityCard,
  ActivityEditDialog,
  ActivityLogCreateDialog,
  NewActivityDialog,
} from ".";
import { ActivityDateHeader } from "./ActivityDateHeader";

export const ActivityRegistPage: React.FC = () => {
  const {
    // 状態
    date,
    setDate,
    activities,
    hasActivityLogs,
    open,
    selectedActivity,
    editModalOpen,
    editTargetActivity,
    // ハンドラー
    handleActivityClick,
    handleNewActivityClick,
    handleEditClick,
    handleNewActivityDialogChange,
    handleActivityLogCreateDialogChange,
    handleActivityLogCreateSuccess,
    handleActivityEditDialogClose,
  } = useActivityRegistPage();

  return (
    <>
      <ActivityDateHeader date={date} setDate={setDate} />
      <hr className="my-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {activities.map((activity: GetActivityResponse) => {
          const isDone = hasActivityLogs(activity.id);

          return (
            <ActivityCardWithEdit
              key={activity.id}
              activity={activity}
              onClick={() => handleActivityClick(activity)}
              onEditClick={() => handleEditClick(activity)}
              isDone={isDone}
            />
          );
        })}
        <ActivityCard onClick={handleNewActivityClick} isDashed>
          <div className="text-5xl mb-2">
            <PlusCircledIcon className="w-16 h-16 text-gray-400 group-hover:text-gray-600" />
          </div>
          <div className="text-sm text-gray-500 group-hover:text-gray-700 font-medium">
            新規追加
          </div>
        </ActivityCard>
      </div>
      <NewActivityDialog
        open={open && !selectedActivity}
        onOpenChange={handleNewActivityDialogChange}
      />
      {selectedActivity && (
        <ActivityLogCreateDialog
          open={open}
          onOpenChange={handleActivityLogCreateDialogChange}
          activity={selectedActivity}
          date={date}
          onSuccess={handleActivityLogCreateSuccess}
        />
      )}
      <ActivityEditDialog
        open={editModalOpen}
        onClose={handleActivityEditDialogClose}
        activity={editTargetActivity}
      />
    </>
  );
};

// 編集ボタン付きのActivityCardラッパー
function ActivityCardWithEdit({
  activity,
  onClick,
  onEditClick,
  isDone,
}: {
  activity: GetActivityResponse;
  onClick: () => void;
  onEditClick: () => void;
  isDone: boolean;
}) {
  return (
    <div className="relative">
      <ActivityCard onClick={onClick} isDone={isDone}>
        <div className="text-5xl mb-2">
          {activity.iconType === "upload" && activity.iconThumbnailUrl ? (
            <img
              src={activity.iconThumbnailUrl}
              alt={activity.name}
              className="w-16 h-16 object-cover rounded"
            />
          ) : (
            activity.emoji
          )}
        </div>
        <div className="text-sm text-gray-800 font-medium">{activity.name}</div>
      </ActivityCard>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEditClick();
        }}
        className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
        aria-label="編集"
      >
        <Pencil1Icon className="w-4 h-4" />
      </button>
    </div>
  );
}

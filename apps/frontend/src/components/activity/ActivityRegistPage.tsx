import { useState } from "react";
import type React from "react";

import { useGlobalDate } from "@frontend/hooks";
import { useActivityBatchData } from "@frontend/hooks/api";
import { Pencil1Icon, PlusCircledIcon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import type { GetActivityResponse } from "@dtos/response";

import { ActivityDateHeader } from "./ActivityDateHeader";

import {
  ActivityCard,
  ActivityEditDialog,
  ActivityLogCreateDialog,
  NewActivityDialog,
} from ".";

export const ActivityRegistPage: React.FC = () => {
  const { date, setDate } = useGlobalDate();
  const [open, setOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<GetActivityResponse | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetActivity, setEditTargetActivity] =
    useState<GetActivityResponse | null>(null);
  const queryClient = useQueryClient();

  // データ取得とsync処理をカスタムフックで管理
  const { activities, hasActivityLogs } = useActivityBatchData({ date });

  const handleActivityClick = (activity: GetActivityResponse) => {
    setSelectedActivity(activity);
    setOpen(true);
  };

  const handleNewActivityClick = () => {
    setOpen(true);
  };

  // 編集ボタンクリックのハンドラ
  const handleEditClick = (activity: GetActivityResponse) => {
    setEditTargetActivity(activity);
    setEditModalOpen(true);
  };

  // NewActivityDialogのopen/close処理
  const handleNewActivityDialogChange = (open: boolean) => {
    setOpen(open);
  };

  // ActivityLogCreateDialogのopen/close処理
  const handleActivityLogCreateDialogChange = async (open: boolean) => {
    setOpen(open);
    if (!open) {
      setSelectedActivity(null);
      // 全てのキャッシュを無効化
      await queryClient.invalidateQueries({
        queryKey: [
          "activity",
          "activity-logs-daily",
          dayjs(date).format("YYYY-MM-DD"),
        ],
      });
      // DailyPageで使用されているキーも無効化
      await queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      });
    }
  };

  // ActivityLogCreateDialogのsuccess処理
  const handleActivityLogCreateSuccess = () => {
    // キャッシュを更新
    queryClient.invalidateQueries({
      queryKey: [
        "activity",
        "activity-logs-daily",
        dayjs(date).format("YYYY-MM-DD"),
      ],
    });
  };

  // ActivityEditDialogのclose処理
  const handleActivityEditDialogClose = () => {
    setEditModalOpen(false);
  };

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
        <div className="text-5xl mb-2">{activity.emoji}</div>
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

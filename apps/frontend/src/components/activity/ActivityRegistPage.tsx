import { useState } from "react";
import type React from "react";

import { useGlobalDate, useLongPress } from "@frontend/hooks";
import { useActivityBatchData } from "@frontend/hooks/api";
import { PlusIcon } from "@radix-ui/react-icons";
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

  // 長押し処理のハンドラ
  const handleLongPress = (activity: GetActivityResponse) => {
    setEditTargetActivity(activity);
    setEditModalOpen(true);
  };

  return (
    <>
      <ActivityDateHeader date={date} setDate={setDate} />
      <hr className="my-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {activities.map((activity: GetActivityResponse) => {
          const isDone = hasActivityLogs(activity.id);

          return (
            <ActivityCardWithLongPress
              key={activity.id}
              activity={activity}
              onClick={() => handleActivityClick(activity)}
              onLongPress={() => handleLongPress(activity)}
              isDone={isDone}
            />
          );
        })}
        <ActivityCard onClick={handleNewActivityClick} isDashed>
          <div className="text-5xl mb-2">
            <PlusIcon className="w-16 h-16 text-gray-400 group-hover:text-gray-600" />
          </div>
          <div className="text-sm text-gray-500 group-hover:text-gray-700 font-medium">
            新規追加
          </div>
        </ActivityCard>
      </div>
      <NewActivityDialog
        open={open && !selectedActivity}
        onOpenChange={setOpen}
      />
      {selectedActivity && (
        <ActivityLogCreateDialog
          open={open}
          onOpenChange={async (o) => {
            setOpen(o);
            if (!o) {
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
                queryKey: [
                  "activity-logs-daily",
                  dayjs(date).format("YYYY-MM-DD"),
                ],
              });
            }
          }}
          activity={selectedActivity}
          date={date}
          onSuccess={() => {
            // キャッシュを更新
            queryClient.invalidateQueries({
              queryKey: [
                "activity",
                "activity-logs-daily",
                dayjs(date).format("YYYY-MM-DD"),
              ],
            });
          }}
        />
      )}
      <ActivityEditDialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        activity={editTargetActivity}
      />
    </>
  );
};

// 長押し処理付きのActivityCardラッパー
function ActivityCardWithLongPress({
  activity,
  onClick,
  onLongPress,
  isDone,
}: {
  activity: GetActivityResponse;
  onClick: () => void;
  onLongPress: () => void;
  isDone: boolean;
}) {
  const longPressHandlers = useLongPress({ onLongPress });

  return (
    <ActivityCard onClick={onClick} isDone={isDone} {...longPressHandlers}>
      <div className="text-5xl mb-2">{activity.emoji}</div>
      <div className="text-sm text-gray-800 font-medium">{activity.name}</div>
    </ActivityCard>
  );
}

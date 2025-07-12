import React, { useRef, useState } from "react";

import { Card, CardContent } from "@frontend/components/ui";
import { useGlobalDate } from "@frontend/hooks";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import { apiClient } from "@frontend/utils";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  GetActivitiesResponseSchema,
  type GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
  type GetActivityResponse,
} from "@dtos/response";

import { ActivityDateHeader } from "./ActivityDateHeader";

import {
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
  const longPressTimer = useRef<number | null>(null);
  const queryClient = useQueryClient();

  // オフラインデータをローカルストレージから読み込む
  const [offlineDataTrigger, setOfflineDataTrigger] = useState(0);
  const { offlineActivityLogs, deletedIds } = React.useMemo(() => {
    const storageKey = `offline-activity-logs-${dayjs(date).format("YYYY-MM-DD")}`;
    const storedData = localStorage.getItem(storageKey);

    // 削除されたIDのリストを読み込む
    const deletedKey = `deleted-activity-logs-${dayjs(date).format("YYYY-MM-DD")}`;
    const deletedData = localStorage.getItem(deletedKey);
    const deletedIdSet = deletedData
      ? new Set(JSON.parse(deletedData))
      : new Set();

    if (storedData) {
      const logs = JSON.parse(storedData);
      return {
        offlineActivityLogs: logs,
        deletedIds: deletedIdSet,
      };
    }
    return {
      offlineActivityLogs: [],
      deletedIds: deletedIdSet,
    };
  }, [date, offlineDataTrigger]);

  // localStorageの変更を監視
  React.useEffect(() => {
    const handleStorageChange = () => {
      setOfflineDataTrigger((prev) => prev + 1);
      // キャッシュを無効化して再フェッチ
      queryClient.invalidateQueries({
        queryKey: [
          "activity",
          "activity-logs-daily",
          dayjs(date).format("YYYY-MM-DD"),
        ],
      });
    };

    const handleSyncDeleteSuccess = (event: Event) => {
      const customEvent = event as CustomEvent;
      const entityId = customEvent.detail.entityId;
      console.log("[ActivityRegistPage] 同期削除成功:", entityId);

      // 各日付の削除IDリストから該当IDを削除
      const dateStr = dayjs(date).format("YYYY-MM-DD");
      const deletedKey = `deleted-activity-logs-${dateStr}`;
      const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || "[]");
      const filteredIds = deletedIds.filter((id: string) => id !== entityId);

      if (filteredIds.length === 0) {
        localStorage.removeItem(deletedKey);
      } else {
        localStorage.setItem(deletedKey, JSON.stringify(filteredIds));
      }

      setOfflineDataTrigger((prev) => prev + 1);
    };

    window.addEventListener("offline-data-updated", handleStorageChange);
    window.addEventListener("sync-delete-success", handleSyncDeleteSuccess);

    return () => {
      window.removeEventListener("offline-data-updated", handleStorageChange);
      window.removeEventListener(
        "sync-delete-success",
        handleSyncDeleteSuccess,
      );
    };
  }, [date, queryClient]);

  const { isOnline } = useNetworkStatusContext();

  const { data, error } = useQuery<{
    activities: GetActivityResponse[];
    activityLogs: GetActivityLogsResponse;
  }>({
    queryKey: [
      "activity",
      "activity-logs-daily",
      dayjs(date).format("YYYY-MM-DD"),
    ],
    networkMode: "offlineFirst",
    enabled: isOnline,
    queryFn: async () => {
      const res = await apiClient.batch.$post({
        json: [
          {
            path: "/users/activities",
          },
          {
            path: `/users/activity-logs?date=${dayjs(date).format("YYYY-MM-DD")}`,
          },
        ],
      });
      const json = await res.json();

      const activities = GetActivitiesResponseSchema.safeParse(json[0]);
      if (!activities.success) {
        throw new Error("Failed to parse activities");
      }
      const activityLogs = GetActivityLogsResponseSchema.safeParse(json[1]);
      if (!activityLogs.success) {
        throw new Error("Failed to parse activity logs");
      }

      queryClient.setQueryData(["activity"], activities.data);
      queryClient.setQueryData(
        ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
        activityLogs.data,
      );
      return { activities: activities.data, activityLogs: activityLogs.data };
    },
  });

  if (error) {
    console.error(error);
  }

  const activities = data?.activities ?? [];
  const activityLogs = data?.activityLogs ?? [];

  const handleActivityClick = (activity: GetActivityResponse) => {
    setSelectedActivity(activity);
    setOpen(true);
  };

  const handleNewActivityClick = () => {
    setOpen(true);
  };

  const handleActivityCardPointerDown = (activity: GetActivityResponse) => {
    longPressTimer.current = window.setTimeout(() => {
      setEditTargetActivity(activity);
      setEditModalOpen(true);
    }, 700);
  };

  const handleActivityCardPointerUp = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <>
      <ActivityDateHeader date={date} setDate={setDate} />
      <hr className="my-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {activities.map((activity: GetActivityResponse) => {
          // サーバーデータとオフラインデータの両方をチェック（削除されたアイテムは除外）
          const hasServerLogs = activityLogs.some(
            (log: GetActivityLogsResponse[number]) =>
              log.activity.id === activity.id && !deletedIds.has(log.id),
          );
          const hasOfflineLogs = offlineActivityLogs.some(
            (log: any) =>
              log.activity.id === activity.id && !deletedIds.has(log.id),
          );
          const hasActivityLogs = hasServerLogs || hasOfflineLogs;

          return (
            <ActivityCard
              key={activity.id}
              onClick={() => handleActivityClick(activity)}
              onPointerDown={() => handleActivityCardPointerDown(activity)}
              onPointerUp={handleActivityCardPointerUp}
              onPointerLeave={handleActivityCardPointerUp}
              isDone={hasActivityLogs}
            >
              <div className="text-5xl mb-2">{activity.emoji}</div>
              <div className="text-sm text-gray-800 font-medium">
                {activity.name}
              </div>
            </ActivityCard>
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
            // 成功時もオフラインデータをリロード
            setOfflineDataTrigger((prev) => prev + 1);
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

function ActivityCard({
  children,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  isDone,
  isDashed,
}: {
  children: React.ReactNode;
  onClick: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  isDone?: boolean;
  isDashed?: boolean;
}) {
  return (
    <Card
      className={`flex items-center justify-center h-full min-h-[140px] shadow-sm rounded-lg cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 select-none group ${
        isDone ? "bg-green-50" : ""
      } ${
        isDashed
          ? "border-2 border-dashed border-gray-300 bg-white hover:border-gray-400"
          : ""
      }`}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <CardContent className="flex flex-col items-center justify-center p-6">
        {children}
      </CardContent>
    </Card>
  );
}

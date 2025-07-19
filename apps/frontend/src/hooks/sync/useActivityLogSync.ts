import { useEffect, useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import type { GetActivityLogResponse } from "@dtos/response";

type OfflineActivityLog = GetActivityLogResponse & { isOffline?: boolean };

type UseActivityLogSyncOptions = {
  date: Date;
  isOnline: boolean;
  activityLogs?: GetActivityLogResponse[];
};

type SyncDeleteEvent = CustomEvent<{ entityId: string }>;

export function useActivityLogSync({
  date,
  isOnline,
  activityLogs,
}: UseActivityLogSyncOptions) {
  const queryClient = useQueryClient();
  const [offlineDataTrigger, setOfflineDataTrigger] = useState(0);

  // オフラインデータと削除IDをローカルストレージから読み込む
  const { offlineData, deletedIds } = useMemo(() => {
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    const storageKey = `offline-activity-logs-${dateStr}`;
    const deletedKey = `deleted-activity-logs-${dateStr}`;

    const storedData = localStorage.getItem(storageKey);
    const deletedData = localStorage.getItem(deletedKey);

    return {
      offlineData: storedData ? JSON.parse(storedData) : [],
      deletedIds: new Set(deletedData ? JSON.parse(deletedData) : []),
    };
  }, [date, offlineDataTrigger]);

  // localStorage変更とsync-delete-successイベントの監視
  useEffect(() => {
    const dateStr = dayjs(date).format("YYYY-MM-DD");

    const handleStorageChange = () => {
      setOfflineDataTrigger((prev) => prev + 1);
      // キャッシュを無効化して再フェッチ
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", dateStr],
      });
    };

    const handleSyncDeleteSuccess = (event: Event) => {
      const customEvent = event as SyncDeleteEvent;
      const entityId = customEvent.detail.entityId;

      // 削除IDリストから該当IDを削除
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

  // オンライン状態変更時にキャッシュを無効化
  useEffect(() => {
    if (isOnline) {
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      });
    }
  }, [isOnline, queryClient, date]);

  // サーバーデータとオフラインデータをマージ
  const mergedActivityLogs = useMemo((): OfflineActivityLog[] => {
    const serverLogs = activityLogs || [];

    // オフラインデータにフラグを追加
    const offlineDataWithFlag = offlineData.map((log: any) => ({
      ...log,
      isOffline: true,
    }));

    const allLogs = [...serverLogs, ...offlineDataWithFlag];

    // 重複を除去（IDでユニーク化）し、削除されたアイテムをフィルタリング
    const uniqueLogs = allLogs.reduce((acc, log) => {
      // 削除されたIDリストに含まれている場合はスキップ
      if (deletedIds.has(log.id)) {
        return acc;
      }

      // 重複チェック
      if (!acc.find((l: OfflineActivityLog) => l.id === log.id)) {
        acc.push(log);
      }
      return acc;
    }, [] as OfflineActivityLog[]);

    return uniqueLogs;
  }, [activityLogs, offlineData, deletedIds]);

  return {
    mergedActivityLogs,
    isOfflineData: (log: OfflineActivityLog) => log.isOffline || false,
  };
}

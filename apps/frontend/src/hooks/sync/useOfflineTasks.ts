import { useEffect, useState } from "react";

import { useTasks } from "@frontend/hooks/api";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import { useQueryClient } from "@tanstack/react-query";

type Task = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  memo: string | null;
  doneDate: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

export function useOfflineTasks(options?: {
  date?: string;
  includeArchived?: boolean;
}) {
  const { isOnline } = useNetworkStatusContext();
  const onlineQuery = useTasks(options);
  const [offlineTasks, setOfflineTasks] = useState<Task[]>([]);
  const queryClient = useQueryClient();

  // オフラインタスクの読み込み
  useEffect(() => {
    const loadOfflineTasks = () => {
      const tasks: Task[] = [];

      if (options?.date) {
        // 特定の日付のタスクを取得
        const storageKey = `offline-tasks-${options.date}`;
        const storedTasks = localStorage.getItem(storageKey);
        if (storedTasks) {
          const parsedTasks = JSON.parse(storedTasks).map((task: any) => ({
            ...task,
            createdAt: new Date(task.createdAt),
            updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
            archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
          }));
          tasks.push(...parsedTasks);
        }
      } else {
        // 全てのオフラインタスクを取得
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith("offline-tasks-")) {
            const storedTasks = localStorage.getItem(key);
            if (storedTasks) {
              const parsedTasks = JSON.parse(storedTasks).map((task: any) => ({
                ...task,
                createdAt: new Date(task.createdAt),
                updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
                archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
              }));
              tasks.push(...parsedTasks);
            }
          }
        });
      }

      // アーカイブされたタスクIDを取得
      const archivedIds = JSON.parse(
        localStorage.getItem("archived-tasks") || "[]",
      );

      // フィルタリング
      let filteredTasks = tasks;
      if (!options?.includeArchived) {
        filteredTasks = tasks.filter(
          (task) => !task.archivedAt && !archivedIds.includes(task.id),
        );
      }

      setOfflineTasks(filteredTasks);

      // オフライン時は React Query のキャッシュも更新
      if (!isOnline) {
        const queryKey = [
          "tasks",
          {
            date: options?.date,
            includeArchived: options?.includeArchived || false,
          },
        ];
        // 既存のキャッシュデータとマージ
        const existingData = queryClient.getQueryData<Task[]>(queryKey) || [];
        const mergedTasks = [...existingData, ...filteredTasks];

        // 重複を削除
        const uniqueTasks = mergedTasks.filter(
          (task, index, self) =>
            index === self.findIndex((t) => t.id === task.id),
        );

        queryClient.setQueryData(queryKey, uniqueTasks);
      }
    };

    loadOfflineTasks();

    // オフラインデータ更新イベントをリッスン
    const handleOfflineDataUpdate = () => {
      loadOfflineTasks();
    };

    window.addEventListener("offline-data-updated", handleOfflineDataUpdate);

    return () => {
      window.removeEventListener(
        "offline-data-updated",
        handleOfflineDataUpdate,
      );
    };
  }, [options?.date, options?.includeArchived, isOnline, queryClient]);

  // オンライン時はAPI、オフライン時はローカルストレージのデータを返す
  if (isOnline && onlineQuery.data) {
    // オンラインのデータとオフラインのデータをマージ
    const mergedTasks = [...(onlineQuery.data || []), ...offlineTasks];

    // 重複を削除（IDでユニーク化）
    const uniqueTasks = mergedTasks.filter(
      (task, index, self) => index === self.findIndex((t) => t.id === task.id),
    );

    return {
      ...onlineQuery,
      data: uniqueTasks,
    };
  }

  // オフライン時またはデータがまだない場合
  // オフライン時は、既存のオンラインデータとオフラインデータをマージする
  const mergedData = (() => {
    if (!isOnline) {
      // オフライン時は、キャッシュされたオンラインデータとオフラインデータをマージ
      const cachedData = onlineQuery.data || [];
      const allTasks = [...cachedData, ...offlineTasks];

      // 重複を削除（IDでユニーク化）
      return allTasks.filter(
        (task, index, self) =>
          index === self.findIndex((t) => t.id === task.id),
      );
    }
    // オンライン時でデータがない場合
    return onlineQuery.data || offlineTasks;
  })();

  return {
    ...onlineQuery,
    data: mergedData,
    isLoading: false,
    isError: false,
  };
}

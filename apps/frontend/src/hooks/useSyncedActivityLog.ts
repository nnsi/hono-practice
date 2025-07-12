import { apiClient } from "@frontend/utils/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";

import { useNetworkStatusContext } from "../providers/NetworkStatusProvider";

import { useSyncedMutation } from "./useSyncedMutation";

type CreateActivityLogVariables = {
  activityId: string;
  date: string;
  quantity: number;
  activityKindId?: string;
  memo?: string;
  // オフライン時に使用するアクティビティ情報
  activityInfo?: {
    name: string;
    quantityUnit: string;
    emoji: string;
    kinds?: Array<{ id: string; name: string }>;
  };
};

type UpdateActivityLogVariables = {
  id: string;
  quantity?: number;
  activityKindId?: string;
  memo?: string;
};

export function useCreateActivityLog() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatusContext();

  return useSyncedMutation({
    entityType: "activityLog",
    operation: "create",
    getEntityId: () => uuidv4(),
    onlineAction: async (variables: CreateActivityLogVariables) => {
      const response = await apiClient.users["activity-logs"].$post({
        json: {
          activityId: variables.activityId,
          date: variables.date,
          quantity: variables.quantity,
          activityKindId: variables.activityKindId,
          memo: variables.memo,
        },
      });

      if (!response.ok) {
        throw new Error("活動記録の作成に失敗しました");
      }

      return await response.json();
    },
    offlineAction: (variables: CreateActivityLogVariables) => {
      console.log("[useSyncedActivityLog] offlineAction started");
      // オフライン時のIDを生成
      const logId = uuidv4();
      console.log("[useSyncedActivityLog] オフラインで活動記録を作成:", logId);

      const newLog = {
        id: logId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: variables.date,
        activity: {
          id: variables.activityId,
          name: variables.activityInfo?.name || "オフライン記録",
          quantityUnit: variables.activityInfo?.quantityUnit || "回",
          emoji: variables.activityInfo?.emoji || "📝",
        },
        quantity: variables.quantity,
        memo: variables.memo || "",
        activityKind:
          variables.activityKindId && variables.activityInfo?.kinds
            ? variables.activityInfo.kinds.find(
                (k) => k.id === variables.activityKindId,
              )
            : undefined,
      };

      // ローカルストレージにも保存
      const storageKey = `offline-activity-logs-${variables.date}`;
      console.log(
        "[useSyncedActivityLog] Reading from localStorage:",
        storageKey,
      );
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || "[]");
      existingLogs.push(newLog);
      console.log("[useSyncedActivityLog] Saving to localStorage");
      localStorage.setItem(storageKey, JSON.stringify(existingLogs));
      console.log(
        "[useSyncedActivityLog] ローカルストレージに保存:",
        storageKey,
        newLog,
      );

      // カスタムイベントを発火してDailyPageに通知
      console.log(
        "[useSyncedActivityLog] カスタムイベント 'offline-data-updated' を発火",
      );
      window.dispatchEvent(new Event("offline-data-updated"));

      console.log("[useSyncedActivityLog] offlineAction completed");
      return newLog;
    },
    onSuccess: (data, variables) => {
      console.log("[useSyncedActivityLog] 活動記録を作成しました:", data);

      // オンラインで成功した場合のみ、ローカルストレージのオフラインデータをクリア
      if (isOnline) {
        const storageKey = `offline-activity-logs-${variables.date}`;
        const existingLogs = JSON.parse(
          localStorage.getItem(storageKey) || "[]",
        );
        const filteredLogs = existingLogs.filter(
          (log: any) => log.id !== data.id,
        );
        if (filteredLogs.length === 0) {
          localStorage.removeItem(storageKey);
          console.log(
            "[useSyncedActivityLog] ローカルストレージをクリア:",
            storageKey,
          );
        } else {
          localStorage.setItem(storageKey, JSON.stringify(filteredLogs));
          console.log(
            "[useSyncedActivityLog] ローカルストレージを更新:",
            storageKey,
            filteredLogs,
          );
        }
      }

      // カスタムイベントを発火してDailyPageとActivityRegistPageに通知
      window.dispatchEvent(new Event("offline-data-updated"));

      // React Queryのキャッシュを更新
      const dateKey = ["activity-logs-daily", variables.date];
      const monthKey = [
        "activity-logs-monthly",
        variables.date.substring(0, 7),
      ];
      const compositeKey = ["activity", "activity-logs-daily", variables.date];

      // Daily viewのキャッシュを更新
      queryClient.setQueryData(dateKey, (prev: any) => {
        console.log(
          "[useSyncedActivityLog] キャッシュ更新 - 既存データ:",
          prev,
        );
        console.log(
          "[useSyncedActivityLog] キャッシュ更新 - 新規データ:",
          data,
        );
        if (!prev) return [data];
        // 重複を避けるため、既存のデータにIDが存在しないか確認
        const exists = prev.some((log: any) => log.id === data.id);
        if (exists) return prev;
        return [...prev, data];
      });

      // ActivityRegistPageで使用される複合キーのキャッシュを更新
      queryClient.setQueryData(compositeKey, (prev: any) => {
        if (!prev) return { activities: [], activityLogs: [data] };
        const exists = prev.activityLogs?.some(
          (log: any) => log.id === data.id,
        );
        if (exists) return prev;
        return {
          ...prev,
          activityLogs: [...(prev.activityLogs || []), data],
        };
      });

      // Monthly viewのキャッシュを更新
      queryClient.setQueryData(monthKey, (prev: any) => {
        if (!prev) return [data];
        const exists = prev.some((log: any) => log.id === data.id);
        if (exists) return prev;
        return [...prev, data];
      });

      // クエリを無効化してリフェッチを促す
      queryClient.invalidateQueries({ queryKey: dateKey });
      queryClient.invalidateQueries({ queryKey: compositeKey });
    },
    onError: (error) => {
      console.error("[useSyncedActivityLog] エラー:", error);
    },
  });
}

export function useUpdateActivityLog() {
  return useSyncedMutation({
    entityType: "activityLog",
    operation: "update",
    getEntityId: (variables: UpdateActivityLogVariables) => variables.id,
    onlineAction: async (variables: UpdateActivityLogVariables) => {
      const response = await apiClient.users["activity-logs"][":id"].$put({
        param: { id: variables.id },
        json: {
          quantity: variables.quantity,
          activityKindId: variables.activityKindId,
          memo: variables.memo,
        },
      });

      if (!response.ok) {
        throw new Error("活動記録の更新に失敗しました");
      }

      return await response.json();
    },
    offlineAction: (variables: UpdateActivityLogVariables) => {
      return {
        id: variables.id,
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      console.log("[useSyncedActivityLog] 活動記録を更新しました");
    },
  });
}

export function useDeleteActivityLog() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatusContext();

  return useSyncedMutation({
    entityType: "activityLog",
    operation: "delete",
    getEntityId: (variables: { id: string; date?: string }) => variables.id,
    onlineAction: async (variables: { id: string; date?: string }) => {
      const response = await apiClient.users["activity-logs"][":id"].$delete({
        param: { id: variables.id },
      });

      if (!response.ok) {
        throw new Error("活動記録の削除に失敗しました");
      }

      return true;
    },
    offlineAction: (variables: { id: string; date?: string }) => {
      // オフライン時はローカルストレージから削除
      if (variables.date) {
        const storageKey = `offline-activity-logs-${variables.date}`;
        const existingLogs = JSON.parse(
          localStorage.getItem(storageKey) || "[]",
        );
        const filteredLogs = existingLogs.filter(
          (log: any) => log.id !== variables.id,
        );

        if (filteredLogs.length === 0) {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, JSON.stringify(filteredLogs));
        }

        // 削除されたIDを記録
        const deletedKey = `deleted-activity-logs-${variables.date}`;
        const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || "[]");
        if (!deletedIds.includes(variables.id)) {
          deletedIds.push(variables.id);
          localStorage.setItem(deletedKey, JSON.stringify(deletedIds));
        }

        console.log(
          "[useSyncedActivityLog] オフライン削除 - ローカルストレージを更新:",
          storageKey,
        );
        console.log("[useSyncedActivityLog] 削除されたIDを記録:", variables.id);

        // カスタムイベントを発火してDailyPageに通知
        window.dispatchEvent(new Event("offline-data-updated"));
      }

      return true;
    },
    onSuccess: (_data, variables) => {
      console.log("[useSyncedActivityLog] 活動記録を削除しました");

      // オンライン時のみ、削除が成功したら削除IDリストからIDを削除
      if (isOnline && variables.date) {
        const deletedKey = `deleted-activity-logs-${variables.date}`;
        const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || "[]");
        const filteredDeletedIds = deletedIds.filter(
          (id: string) => id !== variables.id,
        );

        if (filteredDeletedIds.length === 0) {
          localStorage.removeItem(deletedKey);
        } else {
          localStorage.setItem(deletedKey, JSON.stringify(filteredDeletedIds));
        }

        console.log(
          "[useSyncedActivityLog] 削除成功 - 削除IDリストから削除:",
          variables.id,
        );
      }

      // React Queryのキャッシュを無効化
      if (variables.date) {
        const dateKey = ["activity-logs-daily", variables.date];
        queryClient.invalidateQueries({ queryKey: dateKey });
      }

      // 全体のactivity-logsキャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ["activity-logs-daily"] });
    },
  });
}

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
  // 楽観的更新用
  date?: string;
  activityKindInfo?: { id: string; name: string };
};

type MutationContext = {
  previousDateData?: any;
  previousMonthData?: any;
  previousCompositeData?: any;
};

export function useCreateActivityLog() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatusContext();

  return useSyncedMutation({
    entityType: "activityLog",
    operation: "create",
    getEntityId: () => uuidv4(),
    onMutate: async (variables: CreateActivityLogVariables) => {
      // 楽観的更新: 即座にUIを更新
      const optimisticLog = {
        id: `optimistic-${uuidv4()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: variables.date,
        activity: {
          id: variables.activityId,
          name: variables.activityInfo?.name || "読み込み中...",
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

      // 各キーのキャッシュを更新
      const dateKey = ["activity-logs-daily", variables.date];
      const monthKey = [
        "activity-logs-monthly",
        variables.date.substring(0, 7),
      ];
      const compositeKey = ["activity", "activity-logs-daily", variables.date];

      // 既存のキャッシュを保存（ロールバック用）
      const previousDateData = queryClient.getQueryData(dateKey);
      const previousMonthData = queryClient.getQueryData(monthKey);
      const previousCompositeData = queryClient.getQueryData(compositeKey);

      // 楽観的にキャッシュを更新
      queryClient.setQueryData(dateKey, (prev: any) => {
        if (!prev) return [optimisticLog];
        return [...prev, optimisticLog];
      });

      queryClient.setQueryData(monthKey, (prev: any) => {
        if (!prev) return [optimisticLog];
        return [...prev, optimisticLog];
      });

      queryClient.setQueryData(compositeKey, (prev: any) => {
        if (!prev) return { activities: [], activityLogs: [optimisticLog] };
        return {
          ...prev,
          activityLogs: [...(prev.activityLogs || []), optimisticLog],
        };
      });

      // ロールバック用のデータを返す
      return { previousDateData, previousMonthData, previousCompositeData };
    },
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

      // React Queryのキャッシュを更新（楽観的更新を実際のデータで置き換え）
      const dateKey = ["activity-logs-daily", variables.date];
      const monthKey = [
        "activity-logs-monthly",
        variables.date.substring(0, 7),
      ];
      const compositeKey = ["activity", "activity-logs-daily", variables.date];

      // 楽観的更新されたデータを実際のデータで置き換え
      queryClient.setQueryData(dateKey, (prev: any) => {
        if (!prev) return [data];
        // optimistic-で始まるIDを実際のデータで置き換え
        return prev.map((log: any) =>
          log.id.startsWith("optimistic-") ? data : log,
        );
      });

      queryClient.setQueryData(compositeKey, (prev: any) => {
        if (!prev) return { activities: [], activityLogs: [data] };
        return {
          ...prev,
          activityLogs: (prev.activityLogs || []).map((log: any) =>
            log.id.startsWith("optimistic-") ? data : log,
          ),
        };
      });

      queryClient.setQueryData(monthKey, (prev: any) => {
        if (!prev) return [data];
        return prev.map((log: any) =>
          log.id.startsWith("optimistic-") ? data : log,
        );
      });

      // クエリを無効化してリフェッチを促す
      queryClient.invalidateQueries({ queryKey: dateKey });
      queryClient.invalidateQueries({ queryKey: compositeKey });
    },
    onError: (error, variables, context) => {
      console.error("[useSyncedActivityLog] エラー:", error);
      // エラー時は楽観的更新をロールバック
      const ctx = context as MutationContext | undefined;
      if (ctx) {
        const dateKey = ["activity-logs-daily", variables.date];
        const monthKey = [
          "activity-logs-monthly",
          variables.date.substring(0, 7),
        ];
        const compositeKey = [
          "activity",
          "activity-logs-daily",
          variables.date,
        ];

        queryClient.setQueryData(dateKey, ctx.previousDateData);
        queryClient.setQueryData(monthKey, ctx.previousMonthData);
        queryClient.setQueryData(compositeKey, ctx.previousCompositeData);
      }
    },
  });
}

export function useUpdateActivityLog() {
  const queryClient = useQueryClient();

  return useSyncedMutation({
    entityType: "activityLog",
    operation: "update",
    getEntityId: (variables: UpdateActivityLogVariables) => variables.id,
    onMutate: async (variables: UpdateActivityLogVariables) => {
      if (!variables.date) return;

      // 楽観的更新のために現在のキャッシュを取得
      const dateKey = ["activity-logs-daily", variables.date];
      const monthKey = [
        "activity-logs-monthly",
        variables.date.substring(0, 7),
      ];
      const compositeKey = ["activity", "activity-logs-daily", variables.date];

      // 既存のキャッシュを保存
      const previousDateData = queryClient.getQueryData(dateKey);
      const previousMonthData = queryClient.getQueryData(monthKey);
      const previousCompositeData = queryClient.getQueryData(compositeKey);

      // 楽観的にキャッシュを更新
      const updateLog = (log: any) => {
        if (log.id !== variables.id) return log;
        return {
          ...log,
          quantity:
            variables.quantity !== undefined
              ? variables.quantity
              : log.quantity,
          memo: variables.memo !== undefined ? variables.memo : log.memo,
          activityKind:
            variables.activityKindId !== undefined
              ? variables.activityKindInfo || null
              : log.activityKind,
          updatedAt: new Date().toISOString(),
        };
      };

      queryClient.setQueryData(dateKey, (prev: any) => {
        if (!prev) return prev;
        return prev.map(updateLog);
      });

      queryClient.setQueryData(monthKey, (prev: any) => {
        if (!prev) return prev;
        return prev.map(updateLog);
      });

      queryClient.setQueryData(compositeKey, (prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          activityLogs: (prev.activityLogs || []).map(updateLog),
        };
      });

      return { previousDateData, previousMonthData, previousCompositeData };
    },
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
    onSuccess: (_data, variables) => {
      console.log("[useSyncedActivityLog] 活動記録を更新しました");

      // クエリを無効化してリフェッチ
      if (variables.date) {
        const dateKey = ["activity-logs-daily", variables.date];
        const monthKey = [
          "activity-logs-monthly",
          variables.date.substring(0, 7),
        ];
        const compositeKey = [
          "activity",
          "activity-logs-daily",
          variables.date,
        ];

        queryClient.invalidateQueries({ queryKey: dateKey });
        queryClient.invalidateQueries({ queryKey: monthKey });
        queryClient.invalidateQueries({ queryKey: compositeKey });
      }
    },
    onError: (error, variables, context) => {
      console.error("[useSyncedActivityLog] 更新エラー:", error);
      // エラー時は楽観的更新をロールバック
      const ctx = context as MutationContext | undefined;
      if (ctx && variables.date) {
        const dateKey = ["activity-logs-daily", variables.date];
        const monthKey = [
          "activity-logs-monthly",
          variables.date.substring(0, 7),
        ];
        const compositeKey = [
          "activity",
          "activity-logs-daily",
          variables.date,
        ];

        queryClient.setQueryData(dateKey, ctx.previousDateData);
        queryClient.setQueryData(monthKey, ctx.previousMonthData);
        queryClient.setQueryData(compositeKey, ctx.previousCompositeData);
      }
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
    onMutate: async (variables: { id: string; date?: string }) => {
      if (!variables.date) return;

      // 楽観的更新のために現在のキャッシュを取得
      const dateKey = ["activity-logs-daily", variables.date];
      const monthKey = [
        "activity-logs-monthly",
        variables.date.substring(0, 7),
      ];
      const compositeKey = ["activity", "activity-logs-daily", variables.date];

      // 既存のキャッシュを保存
      const previousDateData = queryClient.getQueryData(dateKey);
      const previousMonthData = queryClient.getQueryData(monthKey);
      const previousCompositeData = queryClient.getQueryData(compositeKey);

      // 楽観的にキャッシュから削除
      const filterOutDeleted = (logs: any[]) => {
        if (!logs) return logs;
        return logs.filter((log: any) => log.id !== variables.id);
      };

      queryClient.setQueryData(dateKey, filterOutDeleted);
      queryClient.setQueryData(monthKey, filterOutDeleted);
      queryClient.setQueryData(compositeKey, (prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          activityLogs: filterOutDeleted(prev.activityLogs),
        };
      });

      // キャンセル可能なクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: dateKey });
      await queryClient.cancelQueries({ queryKey: monthKey });
      await queryClient.cancelQueries({ queryKey: compositeKey });

      return { previousDateData, previousMonthData, previousCompositeData };
    },
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
        const monthKey = [
          "activity-logs-monthly",
          variables.date.substring(0, 7),
        ];
        const compositeKey = [
          "activity",
          "activity-logs-daily",
          variables.date,
        ];

        queryClient.invalidateQueries({ queryKey: dateKey });
        queryClient.invalidateQueries({ queryKey: monthKey });
        queryClient.invalidateQueries({ queryKey: compositeKey });
      }

      // 全体のactivity-logsキャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ["activity-logs-daily"] });
    },
    onError: (error, variables, context) => {
      console.error("[useSyncedActivityLog] 削除エラー:", error);
      // エラー時は楽観的更新をロールバック
      const ctx = context as MutationContext | undefined;
      if (ctx && variables.date) {
        const dateKey = ["activity-logs-daily", variables.date];
        const monthKey = [
          "activity-logs-monthly",
          variables.date.substring(0, 7),
        ];
        const compositeKey = [
          "activity",
          "activity-logs-daily",
          variables.date,
        ];

        queryClient.setQueryData(dateKey, ctx.previousDateData);
        queryClient.setQueryData(monthKey, ctx.previousMonthData);
        queryClient.setQueryData(compositeKey, ctx.previousCompositeData);
      }
    },
  });
}

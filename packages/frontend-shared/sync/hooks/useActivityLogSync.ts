import type { GetActivityLogResponse } from "@dtos/response";

type OfflineActivityLog = GetActivityLogResponse & { isOffline?: boolean };

type UseActivityLogSyncOptions = {
  date: Date;
  isOnline: boolean;
  activityLogs?: GetActivityLogResponse[];
};

export type UseActivityLogSyncDependencies = {
  useEffect: (effect: () => void | (() => void), deps?: any[]) => void;
  useMemo: <T>(factory: () => T, deps?: any[]) => T;
  useState: <T>(
    initialState: T | (() => T),
  ) => [T, (value: T | ((prev: T) => T)) => void];
  useQueryClient: () => any;
  dayjs: (date?: Date | string) => {
    format: (template: string) => string;
  };
  storage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
  eventBus: {
    on: (event: string, handler: (data?: unknown) => void) => () => void;
  };
};

export function createUseActivityLogSync(
  dependencies: UseActivityLogSyncDependencies,
) {
  const {
    useEffect,
    useMemo,
    useState,
    useQueryClient,
    dayjs,
    storage,
    eventBus,
  } = dependencies;

  return function useActivityLogSync({
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

      const storedData = storage.getItem(storageKey);
      const deletedData = storage.getItem(deletedKey);

      // 日付文字列をDateオブジェクトに変換
      const parsedOfflineData = storedData
        ? JSON.parse(storedData).map((log: any) => ({
            ...log,
            createdAt: new Date(log.createdAt),
            updatedAt: new Date(log.updatedAt),
          }))
        : [];

      return {
        offlineData: parsedOfflineData,
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

      const handleSyncDeleteSuccess = (data?: unknown) => {
        const eventData = data as { entityId: string } | undefined;
        if (!eventData) return;

        const entityId = eventData.entityId;

        // 削除IDリストから該当IDを削除
        const deletedKey = `deleted-activity-logs-${dateStr}`;
        const deletedIds = JSON.parse(storage.getItem(deletedKey) || "[]");
        const filteredIds = deletedIds.filter((id: string) => id !== entityId);

        if (filteredIds.length === 0) {
          storage.removeItem(deletedKey);
        } else {
          storage.setItem(deletedKey, JSON.stringify(filteredIds));
        }

        setOfflineDataTrigger((prev) => prev + 1);
      };

      const unsubscribeOfflineData = eventBus.on(
        "offline-data-updated",
        handleStorageChange,
      );
      const unsubscribeSyncDelete = eventBus.on(
        "sync-delete-success",
        handleSyncDeleteSuccess,
      );

      return () => {
        unsubscribeOfflineData();
        unsubscribeSyncDelete();
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
  };
}

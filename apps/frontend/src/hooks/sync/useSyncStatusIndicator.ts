import { useEffect, useRef } from "react";

import { toast } from "@frontend/components/ui/use-toast";
import { useSyncStatus } from "@frontend/hooks/sync/useSyncStatus";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";

export const useSyncStatusIndicator = () => {
  const { isOnline } = useNetworkStatusContext();
  const {
    pendingCount,
    syncingCount,
    failedCount,
    hasPendingSync,
    isSyncing,
    syncNow,
  } = useSyncStatus();
  const prevFailedCountRef = useRef(failedCount);
  const prevOnlineRef = useRef(isOnline);

  // 同期エラー時のトースト通知
  useEffect(() => {
    // エラー数が増えた場合
    if (failedCount > prevFailedCountRef.current && failedCount > 0) {
      toast({
        title: "同期エラー",
        description: `${failedCount}件のデータの同期に失敗しました。オンライン状態を確認してください。`,
        variant: "destructive",
      });
    }
    prevFailedCountRef.current = failedCount;
  }, [failedCount]);

  // オンライン復帰時の通知
  useEffect(() => {
    if (!prevOnlineRef.current && isOnline && hasPendingSync) {
      toast({
        title: "オンラインに復帰",
        description: "未同期のデータがあります。同期を開始します。",
      });
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, hasPendingSync]);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;

    try {
      await syncNow();
      // 同期成功時の通知（エラーがなく、すべて同期された場合）
      if (failedCount === 0 && pendingCount === 0) {
        toast({
          title: "同期完了",
          description: "すべてのデータが同期されました。",
        });
      }
    } catch (error) {
      toast({
        title: "同期エラー",
        description:
          "データの同期に失敗しました。しばらくしてから再試行してください。",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return { name: "CloudOff", className: "h-4 w-4 text-gray-400" };
    }

    if (isSyncing) {
      return {
        name: "RefreshCw",
        className: "h-4 w-4 text-blue-500 animate-spin",
      };
    }

    if (failedCount > 0) {
      return { name: "Cloud", className: "h-4 w-4 text-red-500" };
    }

    if (hasPendingSync) {
      return { name: "Cloud", className: "h-4 w-4 text-yellow-500" };
    }

    return { name: "Cloud", className: "h-4 w-4 text-green-500" };
  };

  const getStatusText = () => {
    if (!isOnline) {
      return "オフライン";
    }

    if (isSyncing) {
      return "同期中...";
    }

    if (failedCount > 0) {
      return `同期エラー (${failedCount}件)`;
    }

    if (hasPendingSync) {
      return `未同期 (${pendingCount}件)`;
    }

    return "同期済み";
  };

  const totalUnsyncedCount = pendingCount + syncingCount + failedCount;

  return {
    isOnline,
    isSyncing,
    hasPendingSync,
    totalUnsyncedCount,
    handleSync,
    getStatusIcon,
    getStatusText,
  };
};

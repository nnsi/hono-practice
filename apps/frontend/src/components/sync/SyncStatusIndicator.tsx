import { useSyncStatus } from "@frontend/hooks/useSyncStatus";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import { cn } from "@frontend/utils/cn";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";

export function SyncStatusIndicator() {
  const { isOnline } = useNetworkStatusContext();
  const {
    pendingCount,
    syncingCount,
    failedCount,
    hasPendingSync,
    isSyncing,
    syncNow,
  } = useSyncStatus();

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;

    try {
      await syncNow();
    } catch (error) {
      console.error("[SyncStatusIndicator] Sync failed:", error);
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <CloudOff className="h-4 w-4 text-gray-400" />;
    }

    if (isSyncing) {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }

    if (failedCount > 0) {
      return <Cloud className="h-4 w-4 text-red-500" />;
    }

    if (hasPendingSync) {
      return <Cloud className="h-4 w-4 text-yellow-500" />;
    }

    return <Cloud className="h-4 w-4 text-green-500" />;
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

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={!isOnline || isSyncing || !hasPendingSync}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors",
          "hover:bg-gray-100 disabled:cursor-not-allowed",
          !isOnline && "opacity-50",
        )}
        title={getStatusText()}
      >
        {getStatusIcon()}
        <span className="hidden sm:inline">{getStatusText()}</span>
      </button>

      {totalUnsyncedCount > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-medium text-white bg-red-500 rounded-full">
          {totalUnsyncedCount}
        </span>
      )}
    </div>
  );
}

import { useSyncStatus } from "@frontend/hooks/useSyncStatus";
import { cn } from "@frontend/utils/cn";

export function SyncProgressBar() {
  const { syncPercentage, isSyncing, hasPendingSync } = useSyncStatus();

  if (!isSyncing && !hasPendingSync) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">
          {isSyncing ? "同期中..." : "同期待ち"}
        </span>
        <span className="text-xs text-gray-600">
          {Math.round(syncPercentage)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out",
            isSyncing ? "bg-blue-500 animate-pulse" : "bg-yellow-500",
          )}
          style={{ width: `${syncPercentage}%` }}
        />
      </div>
    </div>
  );
}

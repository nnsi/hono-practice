import { useSyncStatusIndicator } from "@frontend/hooks/sync/useSyncStatusIndicator";
import { cn } from "@frontend/utils/cn";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";

export function SyncStatusIndicator() {
  const {
    isOnline,
    isSyncing,
    hasPendingSync,
    totalUnsyncedCount,
    handleSync,
    getStatusIcon,
    getStatusText,
  } = useSyncStatusIndicator();

  const statusIcon = getStatusIcon();
  const iconComponent = {
    CloudOff: <CloudOff className={statusIcon.className} />,
    RefreshCw: <RefreshCw className={statusIcon.className} />,
    Cloud: <Cloud className={statusIcon.className} />,
  }[statusIcon.name];

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
        {iconComponent}
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

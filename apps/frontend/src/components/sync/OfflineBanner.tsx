import { useEffect, useState } from "react";

import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import { cn } from "@frontend/utils/cn";
import { WifiOff, X } from "lucide-react";

export function OfflineBanner() {
  const { isOnline } = useNetworkStatusContext();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isOnline && !isDismissed) {
      setIsVisible(true);
    } else if (isOnline) {
      setIsVisible(false);
      setIsDismissed(false);
    }
  }, [isOnline, isDismissed]);

  useEffect(() => {
    if (isOnline && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "bg-yellow-500 text-white px-4 py-2",
        "flex items-center justify-between",
        "shadow-md",
        "animate-in slide-in-from-top-2 duration-300",
      )}
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">
          {isOnline
            ? "オンラインに復帰しました"
            : "オフラインです。データは自動的に保存され、オンライン復帰時に同期されます。"}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="p-1 hover:bg-yellow-600 rounded transition-colors"
        aria-label="閉じる"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

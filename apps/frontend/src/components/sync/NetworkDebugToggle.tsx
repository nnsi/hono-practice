import { useState } from "react";

import { Button } from "@frontend/components/ui";
import {
  getSimulatedOffline,
  setSimulatedOffline,
} from "@frontend/hooks/useNetworkStatus";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import { Wifi, WifiOff } from "lucide-react";

export function NetworkDebugToggle() {
  // 開発環境でのみ表示
  if (!import.meta.env.DEV) {
    return null;
  }

  const networkStatus = useNetworkStatusContext();
  const [isSimulated, setIsSimulated] = useState(getSimulatedOffline());

  const handleToggle = () => {
    const newState = !isSimulated;
    setSimulatedOffline(newState);
    setIsSimulated(newState);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleToggle}
        variant={networkStatus.isOnline ? "default" : "destructive"}
        size="sm"
        className="flex items-center gap-2"
        title={isSimulated ? "模擬オフライン中" : "オンライン"}
      >
        {networkStatus.isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            オンライン
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            オフライン
            {isSimulated && " (模擬)"}
          </>
        )}
      </Button>
    </div>
  );
}

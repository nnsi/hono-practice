import { useEffect, useState } from "react";

import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";

export const useOfflineBanner = () => {
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

  // バナーを閉じるハンドラ
  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return {
    isVisible,
    isOnline,
    handleDismiss,
  };
};

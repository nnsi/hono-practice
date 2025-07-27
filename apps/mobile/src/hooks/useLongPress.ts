import { useCallback, useRef } from "react";

type UseLongPressOptions = {
  onLongPress: () => void;
  onPress?: () => void;
  delay?: number;
};

export function useLongPress({
  onLongPress,
  onPress,
  delay = 700,
}: UseLongPressOptions) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handlePressIn = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // 短いタップの場合のみonPressを呼ぶ
    if (!isLongPress.current && onPress) {
      onPress();
    }
  }, [onPress]);

  return {
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    delayLongPress: delay,
  };
}

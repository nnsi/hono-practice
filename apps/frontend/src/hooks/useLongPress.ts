import { useCallback, useRef } from "react";

type UseLongPressOptions = {
  onLongPress: () => void;
  delay?: number;
};

export function useLongPress({
  onLongPress,
  delay = 700,
}: UseLongPressOptions) {
  const longPressTimer = useRef<number | null>(null);

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = window.setTimeout(() => {
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
  };
}

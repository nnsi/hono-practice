import { useCallback, useRef, useState } from "react";

export type UseLongPressOptions = {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
  threshold?: number;
};

export type UseLongPressReturn = {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  isPressed: boolean;
};

export function createUseLongPress(
  options: UseLongPressOptions,
): UseLongPressReturn {
  const { onLongPress, onClick, delay = 500, threshold = 10 } = options;

  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const start = useCallback(
    (x: number, y: number) => {
      setIsPressed(true);
      startPosRef.current = { x, y };
      isLongPressTriggeredRef.current = false;

      timeoutRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        onLongPress();
        setIsPressed(false);
      }, delay);
    },
    [onLongPress, delay],
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPressed(false);
    startPosRef.current = null;
  }, []);

  const end = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!isLongPressTriggeredRef.current && onClick) {
      onClick();
    }

    setIsPressed(false);
    startPosRef.current = null;
    isLongPressTriggeredRef.current = false;
  }, [onClick]);

  const checkMovement = useCallback(
    (x: number, y: number) => {
      if (startPosRef.current) {
        const dx = Math.abs(x - startPosRef.current.x);
        const dy = Math.abs(y - startPosRef.current.y);

        if (dx > threshold || dy > threshold) {
          cancel();
        }
      }
    },
    [threshold, cancel],
  );

  // Mouse events
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left click
      if (e.button !== 0) return;

      e.preventDefault();
      start(e.clientX, e.clientY);
    },
    [start],
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      end();
    },
    [end],
  );

  const onMouseLeave = useCallback(
    (_e: React.MouseEvent) => {
      cancel();
    },
    [cancel],
  );

  // Touch events
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) {
        cancel();
        return;
      }

      const touch = e.touches[0];
      start(touch.clientX, touch.clientY);
    },
    [start, cancel],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      end();
    },
    [end],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) {
        cancel();
        return;
      }

      const touch = e.touches[0];
      checkMovement(touch.clientX, touch.clientY);
    },
    [checkMovement, cancel],
  );

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    isPressed,
  };
}

import { useRef, useState } from "react";

export const useDragHide = (
  fullHeight = 200,
  visibleHeight = 20,
  threshold = 50,
) => {
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const targetRef = useRef(null);
  const isVisible = useRef(true);

  const setMenuHeight = (visible: boolean) => {
    if (!targetRef.current) return;
    const el = targetRef.current as HTMLElement;
    el.style.height = visible ? `${fullHeight}px` : `${visibleHeight}px`;
    isVisible.current = visible;
  };

  const dragHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setStartY(e.clientY);
      setIsDragging(true);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      const diff = e.clientY - startY;
      if (diff > threshold && !isVisible.current) {
        setMenuHeight(true);
      } else if (diff < -threshold && isVisible.current) {
        setMenuHeight(false);
      }
    },
    onPointerUp: () => {
      setIsDragging(false);
    },
    onPointerLeave: () => {
      setIsDragging(false);
    },
  };

  const styles = "touch-none transition-all duration-300";

  return { targetRef, dragHandlers, styles };
};

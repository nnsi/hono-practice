import { useCallback, useRef, useState } from "react";

import { goalRepository } from "../../db/goalRepository";
import { syncEngine } from "../../sync/syncEngine";

export function useGoalInlineEdit(
  goalId: string,
  dailyTargetQuantity: number,
  isPast: boolean,
) {
  const [inlineEditing, setInlineEditing] = useState(false);
  const [inlineValue, setInlineValue] = useState("");
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const startInlineEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPast) return;
      setInlineValue(String(dailyTargetQuantity));
      setInlineEditing(true);
      requestAnimationFrame(() => inlineInputRef.current?.select());
    },
    [dailyTargetQuantity, isPast],
  );

  const commitInlineEdit = useCallback(async () => {
    setInlineEditing(false);
    const num = Number(inlineValue);
    if (Number.isNaN(num) || num <= 0 || num === dailyTargetQuantity) return;
    await goalRepository.updateGoal(goalId, { dailyTargetQuantity: num });
    syncEngine.syncGoals();
  }, [inlineValue, goalId, dailyTargetQuantity]);

  const handleInlineKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        commitInlineEdit();
      } else if (e.key === "Escape") {
        setInlineEditing(false);
      }
    },
    [commitInlineEdit],
  );

  return {
    inlineEditing,
    inlineValue,
    inlineInputRef,
    setInlineValue,
    startInlineEdit,
    commitInlineEdit,
    handleInlineKeyDown,
  };
}

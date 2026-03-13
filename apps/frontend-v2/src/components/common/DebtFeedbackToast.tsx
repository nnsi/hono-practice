import { useEffect, useRef, useState } from "react";

import type { DebtFeedbackResult } from "@packages/domain/goal/goalDebtFeedback";

import { onDebtFeedback } from "./debtFeedbackEvents";

type ToastState = {
  result: DebtFeedbackResult;
  key: number;
};

export function DebtFeedbackToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [visible, setVisible] = useState(false);
  const keyRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return onDebtFeedback((result) => {
      const message = buildMessage(result);
      if (!message) return;

      keyRef.current += 1;
      setToast({ result, key: keyRef.current });
      setVisible(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setToast(null), 300);
      }, 4000);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!toast) return null;

  const message = buildMessage(toast.result);
  if (!message) return null;

  return (
    <div
      key={toast.key}
      className="fixed left-1/2 z-50 pointer-events-none"
      style={{
        bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        transform: `translateX(-50%) translateY(${visible ? "0" : "20px"})`,
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s ease, opacity 0.3s ease",
      }}
    >
      <div className="bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-lg max-w-[320px] text-center leading-relaxed whitespace-pre-line pointer-events-auto">
        {message}
      </div>
    </div>
  );
}

function buildMessage(result: DebtFeedbackResult): string | null {
  const lines: string[] = [];

  if (result.targetAchievedToday && result.debtCleared) {
    lines.push("目標達成 & 負債完済！");
  } else if (result.targetAchievedToday) {
    lines.push("今日の目標達成！");
  } else if (result.debtCleared) {
    lines.push(`負債完済！ (${result.balanceBefore} → 0)`);
  } else if (result.debtReduced) {
    lines.push(`負債軽減: ${result.balanceBefore} → ${result.balanceAfter}`);
  } else if (result.savedAmount > 0 && !result.targetAchievedToday) {
    lines.push(`部分達成: ${result.savedAmount}回分の負債を回避`);
  }

  if (result.debtCapSaved > 0) {
    lines.push(`(上限により${result.debtCapSaved}回分免除)`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

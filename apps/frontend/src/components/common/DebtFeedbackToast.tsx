import { useEffect, useRef, useState } from "react";

import {
  buildDebtFeedbackMessage,
  isMajorAchievement,
} from "@packages/domain/goal/debtFeedbackMessage";
import type { DebtFeedbackResult } from "@packages/domain/goal/goalDebtFeedback";
import { onDebtFeedback } from "@packages/frontend-shared";
import { useTranslation } from "@packages/i18n";

type ToastState = {
  results: DebtFeedbackResult[];
  key: number;
  praiseMode: boolean;
};

function isPraiseModeEnabled(): boolean {
  try {
    const stored = localStorage.getItem("actiko-v2-settings");
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return parsed.praiseMode === true;
  } catch {
    return false;
  }
}

export function DebtFeedbackToast() {
  const { t } = useTranslation("feedback");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [visible, setVisible] = useState(false);
  const keyRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return onDebtFeedback((results) => {
      const praise = isPraiseModeEnabled();
      const message = buildDebtFeedbackMessage(results, praise, t);
      if (!message) return;

      keyRef.current += 1;
      setToast({ results, key: keyRef.current, praiseMode: praise });
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

  const message = buildDebtFeedbackMessage(toast.results, toast.praiseMode, t);
  if (!message) return null;

  const praise = toast.praiseMode;
  const major = praise && isMajorAchievement(toast.results);

  const bgClass = praise
    ? "bg-gradient-to-r from-amber-500 to-emerald-500"
    : "bg-gray-900";

  const animationStyle = praise
    ? {
        animation: major
          ? "celebrate 0.5s ease-out"
          : "pulse-scale 0.3s ease-out",
      }
    : {};

  return (
    <>
      <style>{celebrateKeyframes}</style>
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
        <div
          className={`${bgClass} text-white text-sm px-5 py-3 rounded-2xl shadow-lg max-w-[320px] text-center leading-relaxed whitespace-pre-line pointer-events-auto`}
          style={animationStyle}
        >
          {message}
        </div>
      </div>
    </>
  );
}

const celebrateKeyframes = `
@keyframes celebrate {
  0% { transform: scale(0.95); opacity: 0; }
  15% { transform: scale(1.08); opacity: 1; }
  30% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes pulse-scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
`;

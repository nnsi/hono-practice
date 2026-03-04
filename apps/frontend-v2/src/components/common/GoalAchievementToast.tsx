import { useCallback, useEffect, useState } from "react";

import { Target } from "lucide-react";

export type GoalAchievedDetail = {
  activityName: string;
  activityEmoji: string | null;
  dailyTarget: number;
  quantityUnit: string;
};

export const GOAL_ACHIEVED_EVENT = "goal-achieved";

export function dispatchGoalAchieved(detail: GoalAchievedDetail) {
  window.dispatchEvent(new CustomEvent(GOAL_ACHIEVED_EVENT, { detail }));
}

export function GoalAchievementToast() {
  const [notification, setNotification] = useState<GoalAchievedDetail | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setNotification(null), 300);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<GoalAchievedDetail>).detail;
      setNotification(detail);
      setVisible(true);
      const timer = setTimeout(dismiss, 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener(GOAL_ACHIEVED_EVENT, handler);
    return () => window.removeEventListener(GOAL_ACHIEVED_EVENT, handler);
  }, [dismiss]);

  if (!notification) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={dismiss}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[calc(100%-2rem)] cursor-pointer transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl px-4 py-3 shadow-lifted flex items-center gap-3">
        <div className="flex-shrink-0 text-2xl">
          {notification.activityEmoji || (
            <Target size={24} className="text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">{notification.activityName}</div>
          <div className="text-xs text-green-100">
            {notification.dailyTarget}
            {notification.quantityUnit}/日 達成!
          </div>
        </div>
        <div className="flex-shrink-0 text-2xl">🎉</div>
      </div>
    </div>
  );
}

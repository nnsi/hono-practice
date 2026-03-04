const NOTIFY_BEFORE_SECONDS = 30 * 60; // 30分前

/**
 * タイマー開始時点から「目標達成30分前」通知を出すまでの秒数を計算する。
 *
 * @param dailyTargetInUnit - 日次目標値（アクティビティの単位。例: 120分）
 * @param previousTotalInUnit - 今日の既存ログの合計（同単位）
 * @param unitToSeconds - 1単位あたりの秒数（分なら60、時間なら3600）
 * @returns 通知までの秒数。0以下 = 既に閾値を超えている/目標なし
 */
export function calcSecondsUntilGoalNotification(
  dailyTargetInUnit: number,
  previousTotalInUnit: number,
  unitToSeconds: number,
): number {
  if (dailyTargetInUnit <= 0 || unitToSeconds <= 0) return -1;

  const targetSeconds = dailyTargetInUnit * unitToSeconds;
  const alreadySeconds = previousTotalInUnit * unitToSeconds;
  const thresholdSeconds = targetSeconds - NOTIFY_BEFORE_SECONDS;

  // 閾値までに必要な残り秒数
  const remaining = thresholdSeconds - alreadySeconds;
  return remaining;
}

export { NOTIFY_BEFORE_SECONDS };

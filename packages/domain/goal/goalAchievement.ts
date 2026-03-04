/**
 * タイマー記録保存後に、日次目標を「今回の記録で」達成したかを判定する純粋関数。
 * previousTotal < dailyTarget かつ previousTotal + newQuantity >= dailyTarget のとき true。
 */
export function isDailyGoalJustAchieved(
  dailyTarget: number,
  previousTotal: number,
  newQuantity: number,
): boolean {
  if (dailyTarget <= 0) return false;
  if (newQuantity <= 0) return false;
  return (
    previousTotal < dailyTarget && previousTotal + newQuantity >= dailyTarget
  );
}

import type { DebtFeedbackResult } from "./goalDebtFeedback";

function fmt(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildMessage(
  result: DebtFeedbackResult,
  praise: boolean,
): string | null {
  const lines: string[] = [];

  if (result.targetAchievedToday && result.debtCleared) {
    lines.push(
      praise ? "すごい！目標達成 & 負債完済！🎉" : "目標達成 & 負債完済！",
    );
  } else if (result.targetAchievedToday) {
    lines.push(praise ? "やったね！今日の目標達成！✨" : "今日の目標達成！");
  } else if (result.debtCleared) {
    lines.push(
      praise
        ? `お見事！負債完済！💪 (${fmt(result.balanceBefore)} → 0)`
        : `負債完済！ (${fmt(result.balanceBefore)} → 0)`,
    );
  } else if (result.debtReduced) {
    lines.push(
      praise
        ? `いい調子！負債軽減 📈 (${fmt(result.balanceBefore)} → ${fmt(result.balanceAfter)})`
        : `負債軽減: ${fmt(result.balanceBefore)} → ${fmt(result.balanceAfter)}`,
    );
  } else if (result.savedAmount > 0 && !result.targetAchievedToday) {
    lines.push(
      praise
        ? `えらい！${fmt(result.savedAmount)}回分の負債を回避 👏`
        : `部分達成: ${fmt(result.savedAmount)}回分の負債を回避`,
    );
  }

  if (result.debtCapSaved > 0) {
    lines.push(
      praise
        ? `(上限により${fmt(result.debtCapSaved)}回分免除 🛡️)`
        : `(上限により${fmt(result.debtCapSaved)}回分免除)`,
    );
  }

  if (praise && result.balanceAfter > 0) {
    lines.push(`貯金 +${result.balanceAfter}！余裕がある証拠 🏦`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildDebtFeedbackMessage(
  results: DebtFeedbackResult[],
  praiseMode: boolean,
): string | null {
  const lines: string[] = [];

  for (const result of results) {
    const msg = buildMessage(result, praiseMode);
    if (!msg) continue;
    const prefix = result.goalLabel ? `${result.goalLabel}: ` : "";
    lines.push(`${prefix}${msg}`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * 表示すべき結果かどうかを判定する。
 * praiseMode ON時は balanceAfter > 0 も表示対象。
 */
export function shouldShowDebtFeedback(
  results: DebtFeedbackResult[],
  praiseMode: boolean,
): boolean {
  return results.some(
    (r) =>
      r.targetAchievedToday ||
      r.debtCleared ||
      r.debtReduced ||
      (r.savedAmount > 0 && !r.targetAchievedToday) ||
      r.debtCapSaved > 0 ||
      (praiseMode && r.balanceAfter > 0),
  );
}

/**
 * 大きな達成（負債完済 or 目標達成）かどうかを判定する。
 * praiseMode時のアニメーション強度を決定するために使用。
 */
export function isMajorAchievement(results: DebtFeedbackResult[]): boolean {
  return results.some((r) => r.targetAchievedToday || r.debtCleared);
}

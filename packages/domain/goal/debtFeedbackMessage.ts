import type { DebtFeedbackResult } from "./goalDebtFeedback";

// biome-ignore lint: i18next TFunction has complex overloads; use loose signature for compatibility
type TFunc = (...args: any[]) => string;

function fmt(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildMessage(
  result: DebtFeedbackResult,
  praise: boolean,
  t: TFunc,
): string | null {
  const lines: string[] = [];

  if (result.targetAchievedToday && result.debtCleared) {
    lines.push(
      t(
        praise
          ? "feedback:targetAchievedDebtClearedPraise"
          : "feedback:targetAchievedDebtCleared",
      ),
    );
  } else if (result.targetAchievedToday) {
    lines.push(
      t(praise ? "feedback:targetAchievedPraise" : "feedback:targetAchieved"),
    );
  } else if (result.debtCleared) {
    lines.push(
      t(praise ? "feedback:debtClearedPraise" : "feedback:debtCleared", {
        before: fmt(result.balanceBefore),
      }),
    );
  } else if (result.debtReduced) {
    lines.push(
      t(praise ? "feedback:debtReducedPraise" : "feedback:debtReduced", {
        before: fmt(result.balanceBefore),
        after: fmt(result.balanceAfter),
      }),
    );
  } else if (result.savedAmount > 0 && !result.targetAchievedToday) {
    lines.push(
      t(praise ? "feedback:debtAvoidedPraise" : "feedback:debtAvoided", {
        amount: fmt(result.savedAmount),
      }),
    );
  }

  if (result.debtCapSaved > 0) {
    lines.push(
      t(praise ? "feedback:debtCapSavedPraise" : "feedback:debtCapSaved", {
        amount: fmt(result.debtCapSaved),
      }),
    );
  }

  if (praise && result.balanceAfter > 0) {
    lines.push(t("feedback:savingsBonus", { amount: result.balanceAfter }));
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildDebtFeedbackMessage(
  results: DebtFeedbackResult[],
  praiseMode: boolean,
  t: TFunc,
): string | null {
  const lines: string[] = [];

  for (const result of results) {
    const msg = buildMessage(result, praiseMode, t);
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

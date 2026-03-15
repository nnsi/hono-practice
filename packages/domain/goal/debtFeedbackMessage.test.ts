import { describe, expect, test } from "vitest";

import {
  buildDebtFeedbackMessage,
  isMajorAchievement,
  shouldShowDebtFeedback,
} from "./debtFeedbackMessage";
import type { DebtFeedbackResult } from "./goalDebtFeedback";

const base: DebtFeedbackResult = {
  goalLabel: null,
  balanceBefore: 0,
  balanceAfter: 0,
  dailyTarget: 10,
  quantityRecorded: 0,
  targetAchievedToday: false,
  debtCleared: false,
  debtReduced: false,
  savedAmount: 0,
  debtCapSaved: 0,
};

describe("buildDebtFeedbackMessage", () => {
  test("目標達成 & 負債完済: 通常モード", () => {
    const r = { ...base, targetAchievedToday: true, debtCleared: true };
    const msg = buildDebtFeedbackMessage([r], false);
    expect(msg).toBe("目標達成 & 負債完済！");
  });

  test("目標達成 & 負債完済: 褒めモード", () => {
    const r = { ...base, targetAchievedToday: true, debtCleared: true };
    const msg = buildDebtFeedbackMessage([r], true);
    expect(msg).toContain("すごい！");
    expect(msg).toContain("🎉");
  });

  test("今日の目標達成: 褒めモード", () => {
    const r = { ...base, targetAchievedToday: true };
    const msg = buildDebtFeedbackMessage([r], true);
    expect(msg).toContain("やったね！");
    expect(msg).toContain("✨");
  });

  test("負債完済: 褒めモード", () => {
    const r = { ...base, debtCleared: true, balanceBefore: -5 };
    const msg = buildDebtFeedbackMessage([r], true);
    expect(msg).toContain("お見事！");
    expect(msg).toContain("💪");
  });

  test("負債軽減: 褒めモード", () => {
    const r = {
      ...base,
      debtReduced: true,
      balanceBefore: -10,
      balanceAfter: -5,
    };
    const msg = buildDebtFeedbackMessage([r], true);
    expect(msg).toContain("いい調子！");
    expect(msg).toContain("📈");
  });

  test("部分達成: 褒めモード", () => {
    const r = { ...base, savedAmount: 3 };
    const msg = buildDebtFeedbackMessage([r], true);
    expect(msg).toContain("えらい！");
    expect(msg).toContain("👏");
  });

  test("debtCapSaved: 褒めモード", () => {
    const r = {
      ...base,
      debtCapSaved: 5,
      debtReduced: true,
      balanceBefore: -10,
      balanceAfter: -8,
    };
    const msg = buildDebtFeedbackMessage([r], true);
    expect(msg).toContain("🛡️");
  });

  test("貯金メッセージ: 褒めモード ON & balanceAfter > 0", () => {
    const r = { ...base, targetAchievedToday: true, balanceAfter: 5 };
    const msg = buildDebtFeedbackMessage([r], true);
    expect(msg).toContain("貯金 +5");
    expect(msg).toContain("🏦");
  });

  test("貯金メッセージ: 通常モードでは表示しない", () => {
    const r = { ...base, targetAchievedToday: true, balanceAfter: 5 };
    const msg = buildDebtFeedbackMessage([r], false);
    expect(msg).not.toContain("貯金");
  });

  test("何も表示しない結果: nullを返す", () => {
    const msg = buildDebtFeedbackMessage([base], false);
    expect(msg).toBeNull();
  });

  test("goalLabel付き", () => {
    const r = { ...base, goalLabel: "筋トレ", targetAchievedToday: true };
    const msg = buildDebtFeedbackMessage([r], false);
    expect(msg).toBe("筋トレ: 今日の目標達成！");
  });

  test("複数ゴール", () => {
    const r1 = { ...base, goalLabel: "A", targetAchievedToday: true };
    const r2 = {
      ...base,
      goalLabel: "B",
      debtCleared: true,
      balanceBefore: -3,
    };
    const msg = buildDebtFeedbackMessage([r1, r2], false);
    expect(msg).toContain("A: 今日の目標達成！");
    expect(msg).toContain("B: 負債完済！");
  });
});

describe("shouldShowDebtFeedback", () => {
  test("何もない場合: false", () => {
    expect(shouldShowDebtFeedback([base], false)).toBe(false);
  });

  test("targetAchievedToday: true", () => {
    expect(
      shouldShowDebtFeedback([{ ...base, targetAchievedToday: true }], false),
    ).toBe(true);
  });

  test("褒めモード & balanceAfter > 0: true", () => {
    expect(shouldShowDebtFeedback([{ ...base, balanceAfter: 5 }], true)).toBe(
      true,
    );
  });

  test("通常モード & balanceAfter > 0 のみ: false", () => {
    expect(shouldShowDebtFeedback([{ ...base, balanceAfter: 5 }], false)).toBe(
      false,
    );
  });
});

describe("isMajorAchievement", () => {
  test("目標達成: true", () => {
    expect(isMajorAchievement([{ ...base, targetAchievedToday: true }])).toBe(
      true,
    );
  });

  test("負債完済: true", () => {
    expect(isMajorAchievement([{ ...base, debtCleared: true }])).toBe(true);
  });

  test("負債軽減のみ: false", () => {
    expect(isMajorAchievement([{ ...base, debtReduced: true }])).toBe(false);
  });
});

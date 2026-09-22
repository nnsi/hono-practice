import { describe, expect, it } from "vitest";

import { resolveCardTapAction, shouldCollapseAfterSave } from "./cardTapAction";
import type { ActivityBase } from "./types";

function activity(overrides: Partial<ActivityBase> = {}): ActivityBase {
  return {
    id: "a1",
    name: "test",
    emoji: "✅",
    quantityUnit: "回",
    recordingMode: "check",
    recordingModeConfig: null,
    ...overrides,
  };
}

describe("resolveCardTapAction", () => {
  it("check・Kind なし・未記録なら即記録", () => {
    expect(
      resolveCardTapAction(activity(), { isDone: false, hasKinds: false }),
    ).toBe("record-check");
  });

  it("check でも記録済みなら展開（重複記録を防ぐ）", () => {
    expect(
      resolveCardTapAction(activity(), { isDone: true, hasKinds: false }),
    ).toBe("expand");
  });

  it("check でも Kind があれば展開（Kind 選択が要る）", () => {
    expect(
      resolveCardTapAction(activity(), { isDone: false, hasKinds: true }),
    ).toBe("expand");
  });

  it.each([
    "manual",
    "timer",
    "counter",
    "binary",
    "numpad",
  ])("%s モードは常に展開", (mode) => {
    expect(
      resolveCardTapAction(activity({ recordingMode: mode }), {
        isDone: false,
        hasKinds: false,
      }),
    ).toBe("expand");
  });

  it("recordingMode 未設定は quantityUnit から解決される（時間単位は timer）", () => {
    expect(
      resolveCardTapAction(
        activity({ recordingMode: "", quantityUnit: "分" }),
        {
          isDone: false,
          hasKinds: false,
        },
      ),
    ).toBe("expand");
  });
});

describe("shouldCollapseAfterSave", () => {
  it.each(["counter", "binary"])("%s は保存後も開いたまま", (mode) => {
    expect(shouldCollapseAfterSave(activity({ recordingMode: mode }))).toBe(
      false,
    );
  });

  it.each([
    "manual",
    "timer",
    "numpad",
    "check",
  ])("%s は保存後に閉じる", (mode) => {
    expect(shouldCollapseAfterSave(activity({ recordingMode: mode }))).toBe(
      true,
    );
  });
});

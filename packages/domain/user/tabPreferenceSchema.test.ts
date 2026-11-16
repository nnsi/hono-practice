import { describe, expect, it } from "vitest";

import {
  applyServerTabPreference,
  canAddVisibleTab,
  coerceLocalTabPreference,
  coerceTabPreference,
  createDefaultLocalTabPreference,
  createDefaultTabPreference,
  getHiddenTabKeys,
  hideTabKey,
  markTabPreferencePending,
  normalizeStoredTabKeys,
  normalizeTabKeys,
  reorderTabKeys,
  showTabKey,
  tabPreferenceSchema,
} from "./tabPreferenceSchema";

describe("tabPreferenceSchema", () => {
  const defaultTabs = () => createDefaultLocalTabPreference().tabs;

  it("hideTabKey removes a visible custom tab", () => {
    expect(hideTabKey(defaultTabs(), "tasks")).toEqual([
      "home",
      "stats",
      "goals",
    ]);
  });

  it("showTabKey returns the tabs unchanged when the key is already visible", () => {
    expect(showTabKey(defaultTabs(), "tasks")).toEqual(defaultTabs());
  });

  it("showTabKey appends a hidden tab when there is room", () => {
    expect(showTabKey(defaultTabs(), "notes")).toEqual([
      "home",
      "stats",
      "goals",
      "tasks",
      "notes",
    ]);
  });

  it("reorderTabKeys keeps home fixed and reorders the rest", () => {
    expect(reorderTabKeys(defaultTabs(), 3, 1)).toEqual([
      "home",
      "tasks",
      "stats",
      "goals",
    ]);
    expect(reorderTabKeys(defaultTabs(), 0, 2)).toEqual([
      "home",
      "stats",
      "goals",
      "tasks",
    ]);
  });

  it("getHiddenTabKeys returns tabs that are not visible", () => {
    expect(getHiddenTabKeys(["home", "stats", "goals", "tasks"])).toEqual([
      "notes",
    ]);
    expect(getHiddenTabKeys(["home", "notes"])).toEqual([
      "stats",
      "goals",
      "tasks",
    ]);
  });

  it("applyServerTabPreference keeps a newer pending change", () => {
    const pending = {
      ...markTabPreferencePending(["home", "stats", "goals", "notes"]),
      updatedAt: "2099-04-12T10:00:00.000Z",
    };

    expect(
      applyServerTabPreference(pending, {
        tabs: ["home", "stats", "goals", "tasks"],
        updatedAt: "2099-04-12T09:59:00.000Z",
      }),
    ).toEqual(pending);
  });

  it("applyServerTabPreference applies a newer server value", () => {
    expect(
      applyServerTabPreference(
        markTabPreferencePending(["home", "stats", "goals"]),
        {
          tabs: ["home", "notes", "goals", "tasks"],
          updatedAt: "2099-04-12T10:01:00.000Z",
        },
      ),
    ).toEqual({
      tabs: ["home", "notes", "goals", "tasks"],
      updatedAt: "2099-04-12T10:01:00.000Z",
      syncStatus: "synced",
    });
  });

  it("coerceTabPreference falls back to defaults for invalid data", () => {
    expect(
      coerceTabPreference({
        tabs: ["daily", "home", "daily"],
        updatedAt: "invalid-date",
      }),
    ).toEqual(createDefaultTabPreference());
  });

  it("normalizeTabKeys rejects malformed tab arrays", () => {
    expect(normalizeTabKeys(["home", "stats", "stats"])).toEqual(defaultTabs());
  });

  it("canAddVisibleTab reflects whether another tab can be shown", () => {
    expect(canAddVisibleTab(["home", "stats"])).toBe(true);
    expect(canAddVisibleTab(defaultTabs())).toBe(true);
    expect(canAddVisibleTab(["home", "stats", "goals", "tasks", "notes"])).toBe(
      false,
    );
  });

  describe("廃止済みの daily タブ", () => {
    const storedWithDaily = ["home", "daily", "stats", "goals", "tasks"];

    it("保存値としては受理し、そのまま保持する", () => {
      const parsed = tabPreferenceSchema.safeParse({
        tabs: storedWithDaily,
        updatedAt: "2099-04-12T10:00:00.000Z",
      });
      expect(parsed.success).toBe(true);
      expect(normalizeStoredTabKeys(storedWithDaily)).toEqual(storedWithDaily);
      expect(
        coerceTabPreference({
          tabs: storedWithDaily,
          updatedAt: "2099-04-12T10:00:00.000Z",
        }).tabs,
      ).toEqual(storedWithDaily);
    });

    it("保存値の既定は統合前クライアント向けに daily を含む", () => {
      expect(createDefaultTabPreference().tabs).toEqual(storedWithDaily);
    });

    it("表示用の正規化では順序を保って daily だけ落とす", () => {
      expect(normalizeTabKeys(storedWithDaily)).toEqual([
        "home",
        "stats",
        "goals",
        "tasks",
      ]);
      expect(normalizeTabKeys(["home", "notes", "daily", "tasks"])).toEqual([
        "home",
        "notes",
        "tasks",
      ]);
    });

    it("ローカル設定とサーバー反映後の設定に daily を残さない", () => {
      expect(
        coerceLocalTabPreference({
          tabs: storedWithDaily,
          updatedAt: "2099-04-12T10:00:00.000Z",
          syncStatus: "synced",
        }).tabs,
      ).toEqual(["home", "stats", "goals", "tasks"]);
      expect(
        applyServerTabPreference(createDefaultLocalTabPreference(), {
          tabs: ["home", "daily", "notes"],
          updatedAt: "2099-04-12T10:00:00.000Z",
        }).tabs,
      ).toEqual(["home", "notes"]);
    });

    it("daily を落として空いた枠に別のタブを追加できる", () => {
      expect(
        canAddVisibleTab(["home", "daily", "stats", "goals", "tasks"]),
      ).toBe(true);
      expect(
        showTabKey(["home", "daily", "stats", "goals", "tasks"], "notes"),
      ).toEqual(["home", "stats", "goals", "tasks", "notes"]);
      expect(getHiddenTabKeys(["home", "daily", "stats"])).toEqual([
        "goals",
        "tasks",
        "notes",
      ]);
    });
  });
});

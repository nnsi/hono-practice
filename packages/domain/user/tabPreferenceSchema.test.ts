import { describe, expect, it } from "vitest";

import {
  applyServerTabPreference,
  canAddVisibleTab,
  coerceTabPreference,
  createDefaultTabPreference,
  getHiddenTabKeys,
  hideTabKey,
  markTabPreferencePending,
  normalizeTabKeys,
  reorderTabKeys,
  showTabKey,
} from "./tabPreferenceSchema";

describe("tabPreferenceSchema", () => {
  it("hideTabKey removes a visible custom tab", () => {
    expect(hideTabKey(createDefaultTabPreference().tabs, "tasks")).toEqual([
      "home",
      "daily",
      "stats",
      "goals",
    ]);
  });

  it("showTabKey returns undefined when visible tabs are already full", () => {
    expect(
      showTabKey(createDefaultTabPreference().tabs, "notes"),
    ).toBeUndefined();
  });

  it("showTabKey appends a hidden tab when there is room", () => {
    const visibleTabs = hideTabKey(createDefaultTabPreference().tabs, "tasks");

    expect(showTabKey(visibleTabs, "notes")).toEqual([
      "home",
      "daily",
      "stats",
      "goals",
      "notes",
    ]);
  });

  it("reorderTabKeys keeps home fixed and reorders the rest", () => {
    expect(reorderTabKeys(createDefaultTabPreference().tabs, 4, 1)).toEqual([
      "home",
      "tasks",
      "daily",
      "stats",
      "goals",
    ]);
    expect(reorderTabKeys(createDefaultTabPreference().tabs, 0, 2)).toEqual([
      "home",
      "daily",
      "stats",
      "goals",
      "tasks",
    ]);
  });

  it("getHiddenTabKeys returns tabs that are not visible", () => {
    expect(
      getHiddenTabKeys(["home", "daily", "stats", "goals", "tasks"]),
    ).toEqual(["notes"]);
    expect(getHiddenTabKeys(["home", "daily", "notes"])).toEqual([
      "stats",
      "goals",
      "tasks",
    ]);
  });

  it("applyServerTabPreference keeps a newer pending change", () => {
    const pending = {
      ...markTabPreferencePending(["home", "daily", "stats", "goals", "notes"]),
      updatedAt: "2099-04-12T10:00:00.000Z",
    };

    expect(
      applyServerTabPreference(pending, {
        tabs: ["home", "daily", "stats", "goals", "tasks"],
        updatedAt: "2099-04-12T09:59:00.000Z",
      }),
    ).toEqual(pending);
  });

  it("applyServerTabPreference applies a newer server value", () => {
    expect(
      applyServerTabPreference(
        markTabPreferencePending(["home", "daily", "stats", "goals"]),
        {
          tabs: ["home", "daily", "notes", "goals", "tasks"],
          updatedAt: "2099-04-12T10:01:00.000Z",
        },
      ),
    ).toEqual({
      tabs: ["home", "daily", "notes", "goals", "tasks"],
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
    expect(normalizeTabKeys(["home", "daily", "daily"])).toEqual(
      createDefaultTabPreference().tabs,
    );
  });

  it("canAddVisibleTab reflects whether another tab can be shown", () => {
    expect(canAddVisibleTab(["home", "daily", "stats"])).toBe(true);
    expect(canAddVisibleTab(createDefaultTabPreference().tabs)).toBe(false);
  });
});

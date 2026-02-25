import { describe, expect, it } from "vitest";
import {
  isActiveTask,
  isArchivedTask,
  isTaskVisibleOnDate,
} from "./taskPredicates";

describe("isTaskVisibleOnDate", () => {
  it("削除済みタスクはfalse", () => {
    expect(
      isTaskVisibleOnDate(
        { deletedAt: "2026-01-01", archivedAt: null, doneDate: null },
        "2026-01-15",
      ),
    ).toBe(false);
  });

  it("アーカイブ済みタスクはfalse", () => {
    expect(
      isTaskVisibleOnDate(
        { deletedAt: null, archivedAt: "2026-01-01", doneDate: null },
        "2026-01-15",
      ),
    ).toBe(false);
  });

  it("完了済みで完了日が一致する場合はtrue", () => {
    expect(
      isTaskVisibleOnDate(
        { deletedAt: null, archivedAt: null, doneDate: "2026-01-15" },
        "2026-01-15",
      ),
    ).toBe(true);
  });

  it("完了済みで完了日が不一致の場合はfalse", () => {
    expect(
      isTaskVisibleOnDate(
        { deletedAt: null, archivedAt: null, doneDate: "2026-01-10" },
        "2026-01-15",
      ),
    ).toBe(false);
  });

  it("未完了で期間内の場合はtrue", () => {
    expect(
      isTaskVisibleOnDate(
        {
          deletedAt: null,
          archivedAt: null,
          doneDate: null,
          startDate: "2026-01-01",
          dueDate: "2026-01-31",
        },
        "2026-01-15",
      ),
    ).toBe(true);
  });

  it("未完了でstartDateが未来の場合はfalse", () => {
    expect(
      isTaskVisibleOnDate(
        {
          deletedAt: null,
          archivedAt: null,
          doneDate: null,
          startDate: "2026-02-01",
        },
        "2026-01-15",
      ),
    ).toBe(false);
  });

  it("未完了でdueDateが過去の場合はfalse", () => {
    expect(
      isTaskVisibleOnDate(
        {
          deletedAt: null,
          archivedAt: null,
          doneDate: null,
          dueDate: "2026-01-10",
        },
        "2026-01-15",
      ),
    ).toBe(false);
  });

  it("未完了で期間指定なしの場合はtrue", () => {
    expect(
      isTaskVisibleOnDate(
        { deletedAt: null, archivedAt: null, doneDate: null },
        "2026-01-15",
      ),
    ).toBe(true);
  });

  it("deletedAtがDateオブジェクトの場合もfalse", () => {
    expect(
      isTaskVisibleOnDate(
        {
          deletedAt: new Date("2026-01-01"),
          archivedAt: null,
          doneDate: null,
        },
        "2026-01-15",
      ),
    ).toBe(false);
  });
});

describe("isActiveTask", () => {
  it("未削除・未アーカイブはtrue", () => {
    expect(isActiveTask({ deletedAt: null, archivedAt: null })).toBe(true);
  });

  it("削除済みはfalse", () => {
    expect(isActiveTask({ deletedAt: "2026-01-01", archivedAt: null })).toBe(
      false,
    );
  });

  it("アーカイブ済みはfalse", () => {
    expect(isActiveTask({ deletedAt: null, archivedAt: "2026-01-01" })).toBe(
      false,
    );
  });

  it("両方設定済みはfalse", () => {
    expect(
      isActiveTask({ deletedAt: "2026-01-01", archivedAt: "2026-01-01" }),
    ).toBe(false);
  });

  it("undefinedフィールドはactiveとして扱う", () => {
    expect(isActiveTask({})).toBe(true);
  });
});

describe("isArchivedTask", () => {
  it("未削除・アーカイブ済みはtrue", () => {
    expect(
      isArchivedTask({ deletedAt: null, archivedAt: "2026-01-01" }),
    ).toBe(true);
  });

  it("未削除・未アーカイブはfalse", () => {
    expect(isArchivedTask({ deletedAt: null, archivedAt: null })).toBe(false);
  });

  it("削除済み・アーカイブ済みはfalse", () => {
    expect(
      isArchivedTask({
        deletedAt: "2026-01-01",
        archivedAt: "2026-01-01",
      }),
    ).toBe(false);
  });

  it("archivedAtがDateオブジェクトの場合もtrue", () => {
    expect(
      isArchivedTask({
        deletedAt: null,
        archivedAt: new Date("2026-01-01"),
      }),
    ).toBe(true);
  });
});

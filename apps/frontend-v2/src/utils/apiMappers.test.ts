import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mapApiActivity,
  mapApiActivityKind,
  mapApiActivityLog,
  mapApiGoal,
  mapApiTask,
} from "./apiMappers";

// toISOString のデフォルト値が new Date().toISOString() なので固定化する
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

const NOW_ISO = "2024-01-01T00:00:00.000Z";

describe("mapApiActivity", () => {
  it("camelCaseのキーを正しくマッピングする", () => {
    const result = mapApiActivity({
      id: "act-1",
      userId: "user-1",
      name: "ランニング",
      label: "運動",
      emoji: "🏃",
      iconType: "emoji",
      iconUrl: "https://example.com/icon.png",
      iconThumbnailUrl: "https://example.com/thumb.png",
      description: "毎日のランニング",
      quantityUnit: "km",
      orderIndex: "001",
      showCombinedStats: false,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      deletedAt: null,
    });

    expect(result).toEqual({
      id: "act-1",
      userId: "user-1",
      name: "ランニング",
      label: "運動",
      emoji: "🏃",
      iconType: "emoji",
      iconUrl: "https://example.com/icon.png",
      iconThumbnailUrl: "https://example.com/thumb.png",
      description: "毎日のランニング",
      quantityUnit: "km",
      orderIndex: "001",
      showCombinedStats: false,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      deletedAt: null,
    });
  });

  it("snake_caseのキーを正しくマッピングする", () => {
    const result = mapApiActivity({
      id: "act-2",
      user_id: "user-2",
      name: "読書",
      label: "学習",
      emoji: "📚",
      icon_type: "upload",
      icon_url: "https://example.com/book.png",
      icon_thumbnail_url: "https://example.com/book-thumb.png",
      description: "",
      quantity_unit: "ページ",
      order_index: "002",
      show_combined_stats: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      deleted_at: null,
    });

    expect(result.userId).toBe("user-2");
    expect(result.iconType).toBe("upload");
    expect(result.iconUrl).toBe("https://example.com/book.png");
    expect(result.iconThumbnailUrl).toBe("https://example.com/book-thumb.png");
    expect(result.quantityUnit).toBe("ページ");
    expect(result.orderIndex).toBe("002");
    expect(result.showCombinedStats).toBe(true);
  });

  it("camelCaseとsnake_caseが混在する場合、camelCaseが優先される", () => {
    const result = mapApiActivity({
      id: "act-3",
      userId: "camel-user",
      user_id: "snake-user",
      name: "テスト",
      label: "",
      emoji: "",
      iconType: "generate",
      icon_type: "upload",
      iconUrl: null,
      iconThumbnailUrl: null,
      description: "",
      quantityUnit: "回",
      orderIndex: "003",
      showCombinedStats: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
    });

    // ?? 演算子なので、camelCase側がundefinedでなければそちらが使われる
    expect(result.userId).toBe("camel-user");
    expect(result.iconType).toBe("generate");
  });

  it("値がない場合にデフォルト値を返す", () => {
    const result = mapApiActivity({ id: "act-4" });

    expect(result.id).toBe("act-4");
    expect(result.userId).toBe("");
    expect(result.name).toBe("");
    expect(result.label).toBe("");
    expect(result.emoji).toBe("");
    expect(result.iconType).toBe("emoji");
    expect(result.iconUrl).toBeNull();
    expect(result.iconThumbnailUrl).toBeNull();
    expect(result.description).toBe("");
    expect(result.quantityUnit).toBe("");
    expect(result.orderIndex).toBe("");
    expect(result.showCombinedStats).toBe(true);
    expect(result.createdAt).toBe(NOW_ISO);
    expect(result.updatedAt).toBe(NOW_ISO);
    expect(result.deletedAt).toBeNull();
  });

  it("不正なiconTypeは 'emoji' にフォールバックする", () => {
    expect(mapApiActivity({ id: "a", iconType: "invalid" }).iconType).toBe("emoji");
    expect(mapApiActivity({ id: "a", iconType: 123 }).iconType).toBe("emoji");
    expect(mapApiActivity({ id: "a", iconType: null }).iconType).toBe("emoji");
  });

  it("有効なiconTypeはそのまま返す", () => {
    expect(mapApiActivity({ id: "a", iconType: "emoji" }).iconType).toBe("emoji");
    expect(mapApiActivity({ id: "a", iconType: "upload" }).iconType).toBe("upload");
    expect(mapApiActivity({ id: "a", iconType: "generate" }).iconType).toBe("generate");
  });

  it("_syncStatusフィールドを含まない", () => {
    const result = mapApiActivity({ id: "act-5" });
    expect("_syncStatus" in result).toBe(false);
  });
});

describe("mapApiActivityKind", () => {
  it("camelCaseのキーを正しくマッピングする", () => {
    const result = mapApiActivityKind({
      id: "kind-1",
      activityId: "act-1",
      name: "朝ラン",
      color: "#ff0000",
      orderIndex: "001",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      deletedAt: null,
    });

    expect(result).toEqual({
      id: "kind-1",
      activityId: "act-1",
      name: "朝ラン",
      color: "#ff0000",
      orderIndex: "001",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      deletedAt: null,
    });
  });

  it("snake_caseのキーを正しくマッピングする", () => {
    const result = mapApiActivityKind({
      id: "kind-2",
      activity_id: "act-2",
      name: "夕ラン",
      color: null,
      order_index: "002",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      deleted_at: null,
    });

    expect(result.activityId).toBe("act-2");
    expect(result.orderIndex).toBe("002");
  });

  it("値がない場合にデフォルト値を返す", () => {
    const result = mapApiActivityKind({ id: "kind-3" });

    expect(result.activityId).toBe("");
    expect(result.name).toBe("");
    expect(result.color).toBeNull();
    expect(result.orderIndex).toBe("");
    expect(result.createdAt).toBe(NOW_ISO);
    expect(result.updatedAt).toBe(NOW_ISO);
    expect(result.deletedAt).toBeNull();
  });
});

describe("mapApiActivityLog", () => {
  it("camelCaseのキーを正しくマッピングする", () => {
    const result = mapApiActivityLog({
      id: "log-1",
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 5.5,
      memo: "朝のランニング",
      date: "2024-01-01",
      time: "09:00",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
    });

    expect(result).toEqual({
      id: "log-1",
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 5.5,
      memo: "朝のランニング",
      date: "2024-01-01",
      time: "09:00",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
    });
  });

  it("snake_caseのキーを正しくマッピングする", () => {
    const result = mapApiActivityLog({
      id: "log-2",
      activity_id: "act-2",
      activity_kind_id: "kind-2",
      quantity: 10,
      memo: "テスト",
      date: "2024-01-02",
      time: null,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      deleted_at: null,
    });

    expect(result.activityId).toBe("act-2");
    expect(result.activityKindId).toBe("kind-2");
  });

  it("done_hourフィールドがtimeにマッピングされる", () => {
    const result = mapApiActivityLog({
      id: "log-3",
      activityId: "act-1",
      quantity: 1,
      memo: "",
      date: "2024-01-01",
      done_hour: "14:30",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
    });

    expect(result.time).toBe("14:30");
  });

  it("timeがdone_hourより優先される", () => {
    const result = mapApiActivityLog({
      id: "log-4",
      activityId: "act-1",
      quantity: 1,
      memo: "",
      date: "2024-01-01",
      time: "10:00",
      done_hour: "14:30",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
    });

    expect(result.time).toBe("10:00");
  });

  it("quantityがnullの場合もnullを返す", () => {
    const result = mapApiActivityLog({
      id: "log-5",
      activityId: "act-1",
      quantity: null,
      memo: "",
      date: "2024-01-01",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
    });

    expect(result.quantity).toBeNull();
  });

  it("値がない場合にデフォルト値を返す", () => {
    const result = mapApiActivityLog({ id: "log-6" });

    expect(result.activityId).toBe("");
    expect(result.activityKindId).toBeNull();
    expect(result.quantity).toBeNull();
    expect(result.memo).toBe("");
    expect(result.date).toBe("");
    expect(result.time).toBeNull();
  });
});

describe("mapApiGoal", () => {
  it("camelCaseのキーを正しくマッピングする", () => {
    const result = mapApiGoal({
      id: "goal-1",
      userId: "user-1",
      activityId: "act-1",
      dailyTargetQuantity: 30,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      isActive: true,
      description: "毎日30分走る",
      currentBalance: 10,
      totalTarget: 365,
      totalActual: 50,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      deletedAt: null,
    });

    expect(result).toEqual({
      id: "goal-1",
      userId: "user-1",
      activityId: "act-1",
      dailyTargetQuantity: 30,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      isActive: true,
      description: "毎日30分走る",
      currentBalance: 10,
      totalTarget: 365,
      totalActual: 50,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      deletedAt: null,
    });
  });

  it("snake_caseのキーを正しくマッピングする", () => {
    const result = mapApiGoal({
      id: "goal-2",
      user_id: "user-2",
      activity_id: "act-2",
      daily_target_quantity: "15",
      start_date: "2024-02-01",
      end_date: null,
      is_active: false,
      description: "",
      current_balance: "5",
      total_target: "100",
      total_actual: "20",
      created_at: "2024-02-01T00:00:00Z",
      updated_at: "2024-02-01T00:00:00Z",
      deleted_at: null,
    });

    expect(result.userId).toBe("user-2");
    expect(result.activityId).toBe("act-2");
    expect(result.dailyTargetQuantity).toBe(15);
    expect(result.startDate).toBe("2024-02-01");
    expect(result.endDate).toBeNull();
    expect(result.isActive).toBe(false);
    expect(result.currentBalance).toBe(5);
    expect(result.totalTarget).toBe(100);
    expect(result.totalActual).toBe(20);
  });

  it("数値フィールドに文字列が渡された場合、Numberで変換する", () => {
    const result = mapApiGoal({
      id: "goal-3",
      dailyTargetQuantity: "42.5",
      currentBalance: "100.25",
      totalTarget: "500",
      totalActual: "250.75",
    });

    expect(result.dailyTargetQuantity).toBe(42.5);
    expect(result.currentBalance).toBe(100.25);
    expect(result.totalTarget).toBe(500);
    expect(result.totalActual).toBe(250.75);
  });

  it("値がない場合にデフォルト値を返す", () => {
    const result = mapApiGoal({ id: "goal-4" });

    expect(result.userId).toBe("");
    expect(result.activityId).toBe("");
    expect(result.dailyTargetQuantity).toBe(0);
    expect(result.startDate).toBe("");
    expect(result.endDate).toBeNull();
    expect(result.isActive).toBe(true);
    expect(result.description).toBe("");
    expect(result.currentBalance).toBe(0);
    expect(result.totalTarget).toBe(0);
    expect(result.totalActual).toBe(0);
  });
});

describe("mapApiTask", () => {
  it("camelCaseのキーを正しくマッピングする", () => {
    const result = mapApiTask({
      id: "task-1",
      userId: "user-1",
      title: "買い物に行く",
      startDate: "2024-01-01",
      dueDate: "2024-01-05",
      doneDate: "2024-01-03",
      memo: "牛乳を忘れずに",
      archivedAt: "2024-01-10T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-03T00:00:00Z",
      deletedAt: null,
    });

    expect(result).toEqual({
      id: "task-1",
      userId: "user-1",
      title: "買い物に行く",
      startDate: "2024-01-01",
      dueDate: "2024-01-05",
      doneDate: "2024-01-03",
      memo: "牛乳を忘れずに",
      archivedAt: "2024-01-10T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-03T00:00:00Z",
      deletedAt: null,
    });
  });

  it("snake_caseのキーを正しくマッピングする", () => {
    const result = mapApiTask({
      id: "task-2",
      user_id: "user-2",
      title: "レポート提出",
      start_date: "2024-02-01",
      due_date: "2024-02-15",
      done_date: null,
      memo: "",
      archived_at: null,
      created_at: "2024-02-01T00:00:00Z",
      updated_at: "2024-02-01T00:00:00Z",
      deleted_at: null,
    });

    expect(result.userId).toBe("user-2");
    expect(result.startDate).toBe("2024-02-01");
    expect(result.dueDate).toBe("2024-02-15");
    expect(result.doneDate).toBeNull();
    expect(result.archivedAt).toBeNull();
  });

  it("全てのnullableフィールドがnullを正しく扱う", () => {
    const result = mapApiTask({
      id: "task-3",
      userId: "user-3",
      title: "テスト",
      startDate: null,
      dueDate: null,
      doneDate: null,
      memo: "",
      archivedAt: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
    });

    expect(result.startDate).toBeNull();
    expect(result.dueDate).toBeNull();
    expect(result.doneDate).toBeNull();
    expect(result.archivedAt).toBeNull();
    expect(result.deletedAt).toBeNull();
  });

  it("値がない場合にデフォルト値を返す", () => {
    const result = mapApiTask({ id: "task-4" });

    expect(result.userId).toBe("");
    expect(result.title).toBe("");
    expect(result.startDate).toBeNull();
    expect(result.dueDate).toBeNull();
    expect(result.doneDate).toBeNull();
    expect(result.memo).toBe("");
    expect(result.archivedAt).toBeNull();
    expect(result.createdAt).toBe(NOW_ISO);
    expect(result.updatedAt).toBe(NOW_ISO);
    expect(result.deletedAt).toBeNull();
  });

  it("_syncStatusフィールドを含まない", () => {
    const result = mapApiTask({ id: "task-5" });
    expect("_syncStatus" in result).toBe(false);
  });
});

import { useActivities } from "@frontend/hooks/api/useActivities";
import { renderHook } from "@testing-library/react";
import dayjs from "dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useActivityLogValidator } from "./useActivityLogValidator";

import type { ColumnMapping } from "@frontend/components/csv/CSVColumnMapper";

// useActivitiesをモック
vi.mock("@frontend/hooks/api/useActivities", () => ({
  useActivities: vi.fn(),
}));

const mockActivities = [
  {
    id: "activity-1",
    name: "ランニング",
    kinds: [
      { id: "kind-1", name: "5km" },
      { id: "kind-2", name: "10km" },
    ],
  },
  {
    id: "activity-2",
    name: "読書",
    kinds: [
      { id: "kind-3", name: "技術書" },
      { id: "kind-4", name: "小説" },
    ],
  },
  {
    id: "activity-3",
    name: "勉強",
    kinds: [],
  },
];

describe("useActivityLogValidator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useActivities as any).mockReturnValue({ data: mockActivities });
  });

  describe("validateMapping", () => {
    it("有効なマッピングを検証できる", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const mapping: ColumnMapping = {
        date: "date",
        activity: "activity",
        quantity: "quantity",
        kind: "kind",
        memo: "memo",
      };

      const errors = result.current.validateMapping(mapping);
      expect(errors).toEqual([]);
    });

    it("必須フィールドが欠けている場合エラーを返す", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const mapping: ColumnMapping = {};

      const errors = result.current.validateMapping(mapping);
      expect(errors).toContain("日付カラムのマッピングが必要です");
      expect(errors).toContain(
        "アクティビティカラムのマッピングまたは固定アクティビティの選択が必要です",
      );
      expect(errors).toContain("数量カラムのマッピングが必要です");
    });

    it("固定アクティビティIDがある場合はアクティビティカラムがなくても有効", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const mapping: ColumnMapping = {
        date: "date",
        quantity: "quantity",
        fixedActivityId: "activity-1",
      };

      const errors = result.current.validateMapping(mapping);
      expect(errors).toEqual([]);
    });
  });

  describe("validateRowWithMapping", () => {
    it("正常なデータを検証できる", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const row = {
        date: "2025-01-01",
        activity: "ランニング",
        kind: "5km",
        quantity: "30",
        memo: "朝ラン",
      };

      const mapping: ColumnMapping = {
        date: "date",
        activity: "activity",
        kind: "kind",
        quantity: "quantity",
        memo: "memo",
      };

      const validated = result.current.validateRowWithMapping(row, mapping);

      expect(validated).toEqual({
        date: "2025-01-01",
        activityName: "ランニング",
        activityId: "activity-1",
        kindName: "5km",
        quantity: 30,
        memo: "朝ラン",
        isNewActivity: false,
        errors: [],
      });
    });

    it("新規アクティビティを検出できる", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const row = {
        date: "2025-01-01",
        activity: "水泳",
        quantity: "60",
      };

      const mapping: ColumnMapping = {
        date: "date",
        activity: "activity",
        quantity: "quantity",
      };

      const validated = result.current.validateRowWithMapping(row, mapping);

      expect(validated.activityName).toBe("水泳");
      expect(validated.isNewActivity).toBe(true);
      expect(validated.activityId).toBeUndefined();
      expect(validated.errors).toEqual([]);
    });

    it("固定アクティビティIDを使用できる", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const row = {
        date: "2025-01-01",
        quantity: "30",
        kind: "5km",
      };

      const mapping: ColumnMapping = {
        date: "date",
        quantity: "quantity",
        kind: "kind",
        fixedActivityId: "activity-1",
      };

      const validated = result.current.validateRowWithMapping(row, mapping);

      expect(validated.activityName).toBe("ランニング");
      expect(validated.activityId).toBe("activity-1");
      expect(validated.isNewActivity).toBe(false);
      expect(validated.kindName).toBe("5km");
      expect(validated.errors).toEqual([]);
    });

    it("存在しない種別名のエラーを検出できる", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const row = {
        date: "2025-01-01",
        activity: "ランニング",
        kind: "20km",
        quantity: "30",
      };

      const mapping: ColumnMapping = {
        date: "date",
        activity: "activity",
        kind: "kind",
        quantity: "quantity",
      };

      const validated = result.current.validateRowWithMapping(row, mapping);

      expect(validated.errors).toHaveLength(1);
      expect(validated.errors[0]).toEqual({
        field: "kind",
        message: "活動「ランニング」に種別「20km」は存在しません",
      });
    });

    describe("日付バリデーション", () => {
      it("空の日付でエラーを返す", () => {
        const { result } = renderHook(() => useActivityLogValidator());

        const row = {
          date: "",
          activity: "ランニング",
          quantity: "30",
        };

        const mapping: ColumnMapping = {
          date: "date",
          activity: "activity",
          quantity: "quantity",
        };

        const validated = result.current.validateRowWithMapping(row, mapping);

        expect(validated.errors).toContainEqual({
          field: "date",
          message: "日付は必須です",
        });
      });

      it("不正な日付形式でエラーを返す", () => {
        const { result } = renderHook(() => useActivityLogValidator());

        const row = {
          date: "不正な日付",
          activity: "ランニング",
          quantity: "30",
        };

        const mapping: ColumnMapping = {
          date: "date",
          activity: "activity",
          quantity: "quantity",
        };

        const validated = result.current.validateRowWithMapping(row, mapping);

        expect(validated.errors).toContainEqual({
          field: "date",
          message:
            "日付の形式が正しくありません（YYYY-MM-DD形式で入力してください）",
        });
      });

      it("未来の日付でエラーを返す", () => {
        const { result } = renderHook(() => useActivityLogValidator());

        const futureDate = dayjs().add(1, "day").format("YYYY-MM-DD");
        const row = {
          date: futureDate,
          activity: "ランニング",
          quantity: "30",
        };

        const mapping: ColumnMapping = {
          date: "date",
          activity: "activity",
          quantity: "quantity",
        };

        const validated = result.current.validateRowWithMapping(row, mapping);

        expect(validated.errors).toContainEqual({
          field: "date",
          message: "未来の日付は指定できません",
        });
      });
    });

    describe("数量バリデーション", () => {
      it("空の数量でエラーを返す", () => {
        const { result } = renderHook(() => useActivityLogValidator());

        const row = {
          date: "2025-01-01",
          activity: "ランニング",
          quantity: "",
        };

        const mapping: ColumnMapping = {
          date: "date",
          activity: "activity",
          quantity: "quantity",
        };

        const validated = result.current.validateRowWithMapping(row, mapping);

        expect(validated.errors).toContainEqual({
          field: "quantity",
          message: "数量は必須です",
        });
      });

      it("数値でない数量でエラーを返す", () => {
        const { result } = renderHook(() => useActivityLogValidator());

        const row = {
          date: "2025-01-01",
          activity: "ランニング",
          quantity: "abc",
        };

        const mapping: ColumnMapping = {
          date: "date",
          activity: "activity",
          quantity: "quantity",
        };

        const validated = result.current.validateRowWithMapping(row, mapping);

        expect(validated.errors).toContainEqual({
          field: "quantity",
          message: "数値で入力してください",
        });
      });

      it("負の数量でエラーを返す", () => {
        const { result } = renderHook(() => useActivityLogValidator());

        const row = {
          date: "2025-01-01",
          activity: "ランニング",
          quantity: "-10",
        };

        const mapping: ColumnMapping = {
          date: "date",
          activity: "activity",
          quantity: "quantity",
        };

        const validated = result.current.validateRowWithMapping(row, mapping);

        expect(validated.errors).toContainEqual({
          field: "quantity",
          message: "数量は0以上で入力してください",
        });
      });

      it("上限を超える数量でエラーを返す", () => {
        const { result } = renderHook(() => useActivityLogValidator());

        const row = {
          date: "2025-01-01",
          activity: "ランニング",
          quantity: "100000",
        };

        const mapping: ColumnMapping = {
          date: "date",
          activity: "activity",
          quantity: "quantity",
        };

        const validated = result.current.validateRowWithMapping(row, mapping);

        expect(validated.errors).toContainEqual({
          field: "quantity",
          message: "数量は99999以下で入力してください",
        });
      });

      it("小数の数量を整数に変換できる", () => {
        const { result } = renderHook(() => useActivityLogValidator());

        const row = {
          date: "2025-01-01",
          activity: "ランニング",
          quantity: "30.5",
        };

        const mapping: ColumnMapping = {
          date: "date",
          activity: "activity",
          quantity: "quantity",
        };

        const validated = result.current.validateRowWithMapping(row, mapping);

        expect(validated.quantity).toBe(30.5);
        expect(validated.errors).toEqual([]);
      });
    });

    it("活動名が空でエラーを返す（固定アクティビティでない場合）", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const row = {
        date: "2025-01-01",
        activity: "",
        quantity: "30",
      };

      const mapping: ColumnMapping = {
        date: "date",
        activity: "activity",
        quantity: "quantity",
      };

      const validated = result.current.validateRowWithMapping(row, mapping);

      expect(validated.errors).toContainEqual({
        field: "activity",
        message: "活動名は必須です",
      });
    });

    it("複数のエラーを同時に検出できる", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const row = {
        date: "",
        activity: "",
        quantity: "abc",
      };

      const mapping: ColumnMapping = {
        date: "date",
        activity: "activity",
        quantity: "quantity",
      };

      const validated = result.current.validateRowWithMapping(row, mapping);

      expect(validated.errors).toHaveLength(3);
      expect(validated.errors).toContainEqual({
        field: "date",
        message: "日付は必須です",
      });
      expect(validated.errors).toContainEqual({
        field: "activity",
        message: "活動名は必須です",
      });
      expect(validated.errors).toContainEqual({
        field: "quantity",
        message: "数値で入力してください",
      });
    });
  });

  describe("validateAllWithMapping", () => {
    it("複数行のデータを一括で検証できる", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const data: Record<string, string>[] = [
        {
          date: "2025-01-01",
          activity: "ランニング",
          quantity: "30",
          kind: "",
        },
        {
          date: "2025-01-02",
          activity: "読書",
          kind: "技術書",
          quantity: "60",
        },
        {
          date: "2025-01-03",
          activity: "新規活動",
          quantity: "90",
          kind: "",
        },
      ];

      const mapping: ColumnMapping = {
        date: "date",
        activity: "activity",
        kind: "kind",
        quantity: "quantity",
      };

      const result_ = result.current.validateAllWithMapping(data, mapping);

      expect(result_.validatedLogs).toHaveLength(3);
      expect(result_.hasErrors).toBe(false);
      expect(result_.totalErrors).toBe(0);

      // 新規活動の確認
      expect(result_.validatedLogs[2].isNewActivity).toBe(true);
    });

    it("エラーがある場合を正しく集計できる", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const data = [
        {
          date: "",
          activity: "ランニング",
          quantity: "30",
        },
        {
          date: "2025-01-02",
          activity: "",
          quantity: "abc",
        },
      ];

      const mapping: ColumnMapping = {
        date: "date",
        activity: "activity",
        quantity: "quantity",
      };

      const result_ = result.current.validateAllWithMapping(data, mapping);

      expect(result_.hasErrors).toBe(true);
      expect(result_.totalErrors).toBe(3); // 日付エラー1件、活動名エラー1件、数量エラー1件
    });
  });

  describe("後方互換性", () => {
    it("validateRowがデフォルトマッピングで動作する", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const row = {
        date: "2025-01-01",
        activity: "ランニング",
        kind: "5km",
        quantity: "30",
        memo: "朝ラン",
      };

      const validated = result.current.validateRow(row);

      expect(validated).toEqual({
        date: "2025-01-01",
        activityName: "ランニング",
        activityId: "activity-1",
        kindName: "5km",
        quantity: 30,
        memo: "朝ラン",
        isNewActivity: false,
        errors: [],
      });
    });

    it("validateAllがデフォルトマッピングで動作する", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const data = [
        {
          date: "2025-01-01",
          activity: "ランニング",
          quantity: "30",
        },
      ];

      const result_ = result.current.validateAll(data);

      expect(result_.validatedLogs).toHaveLength(1);
      expect(result_.hasErrors).toBe(false);
    });

    it("validateHeadersが正しく動作する", () => {
      const { result } = renderHook(() => useActivityLogValidator());

      const headers = ["date", "activity", "memo"];
      const errors = result.current.validateHeaders(headers);

      expect(errors).toEqual(["必須カラム「quantity」が見つかりません"]);
    });
  });

  describe("アクティビティが取得できない場合", () => {
    it("全ての活動が新規として扱われる", () => {
      (useActivities as any).mockReturnValue({ data: null });
      const { result } = renderHook(() => useActivityLogValidator());

      const row = {
        date: "2025-01-01",
        activity: "ランニング",
        quantity: "30",
      };

      const mapping: ColumnMapping = {
        date: "date",
        activity: "activity",
        quantity: "quantity",
      };

      const validated = result.current.validateRowWithMapping(row, mapping);

      expect(validated.isNewActivity).toBe(true);
      expect(validated.activityId).toBeUndefined();
    });
  });
});

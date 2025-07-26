import { useActivities } from "@frontend/hooks/api/useActivities";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";

import { CSVImportPreview } from "./CSVImportPreview";

import type { ValidatedActivityLog } from "@frontend/hooks/feature/csv/useActivityLogValidator";

// useActivitiesをモック
vi.mock("@frontend/hooks/api/useActivities", () => ({
  useActivities: vi.fn(),
}));

const mockActivities = [
  {
    id: "activity-1",
    name: "ランニング",
    emoji: "🏃",
    kinds: [
      { id: "kind-1", name: "5km" },
      { id: "kind-2", name: "10km" },
    ],
  },
  {
    id: "activity-2",
    name: "読書",
    emoji: "📚",
    kinds: [],
  },
];

// URL.createObjectURLとURL.revokeObjectURLをモック
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

// HTMLElementのclickメソッドをモック
const mockClick = vi.fn();
document.createElement = vi.fn((tagName) => {
  const element = document.createElementNS(
    "http://www.w3.org/1999/xhtml",
    tagName,
  );
  if (tagName === "a") {
    element.click = mockClick;
  }
  return element;
});

describe("CSVImportPreview", () => {
  const mockOnEdit = vi.fn();
  const mockOnRemove = vi.fn();
  const mockOnImport = vi.fn();

  const validLogs: ValidatedActivityLog[] = [
    {
      date: "2025-01-01",
      activityName: "ランニング",
      activityId: "activity-1",
      kindName: "5km",
      quantity: 30,
      memo: "朝ラン",
      isNewActivity: false,
      errors: [],
    },
    {
      date: "2025-01-02",
      activityName: "読書",
      activityId: "activity-2",
      quantity: 60,
      isNewActivity: false,
      errors: [],
    },
  ];

  const logsWithErrors: ValidatedActivityLog[] = [
    ...validLogs,
    {
      date: "",
      activityName: "水泳",
      quantity: 0,
      isNewActivity: true,
      errors: [
        { field: "date", message: "日付は必須です" },
        { field: "quantity", message: "数量は必須です" },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useActivities as any).mockReturnValue({ data: mockActivities });
  });

  describe("統計情報の表示", () => {
    it("正常なログの統計を表示する", () => {
      render(
        <CSVImportPreview
          validatedLogs={validLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      expect(screen.getByText("合計: 2件")).toBeInTheDocument();
      expect(screen.getByText("正常: 2件")).toBeInTheDocument();
      expect(screen.queryByText(/エラー:/)).not.toBeInTheDocument();
    });

    it("エラーと警告を含むログの統計を表示する", () => {
      const logsWithWarning: ValidatedActivityLog[] = [
        ...validLogs,
        {
          date: "2025-01-03",
          activityName: "新規活動",
          quantity: 30,
          isNewActivity: true,
          errors: [],
        },
      ];

      render(
        <CSVImportPreview
          validatedLogs={[...logsWithWarning, logsWithErrors[2]]}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      expect(screen.getByText("合計: 4件")).toBeInTheDocument();
      expect(screen.getByText("正常: 3件")).toBeInTheDocument();
      expect(screen.getByText("新規アクティビティ: 1件")).toBeInTheDocument();
      expect(screen.getByText("エラー: 1件")).toBeInTheDocument();
    });
  });

  describe("データの表示", () => {
    it("バリデーション済みのログを表示する", () => {
      render(
        <CSVImportPreview
          validatedLogs={validLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      expect(screen.getByDisplayValue("2025-01-01")).toBeInTheDocument();
      expect(screen.getByDisplayValue("30")).toBeInTheDocument();
      expect(screen.getByDisplayValue("朝ラン")).toBeInTheDocument();
    });

    it("エラーメッセージを表示する", () => {
      render(
        <CSVImportPreview
          validatedLogs={logsWithErrors}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      expect(screen.getByText("日付は必須です")).toBeInTheDocument();
      expect(screen.getByText("数量は必須です")).toBeInTheDocument();
    });

    it("新規アクティビティのバッジを表示する", () => {
      const newActivityLog: ValidatedActivityLog[] = [
        {
          date: "2025-01-01",
          activityName: "新規活動",
          quantity: 30,
          isNewActivity: true,
          errors: [],
        },
      ];

      render(
        <CSVImportPreview
          validatedLogs={newActivityLog}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      expect(screen.getByText("新規")).toBeInTheDocument();
    });
  });

  describe("編集機能", () => {
    it("日付フィールドを編集できる", () => {
      render(
        <CSVImportPreview
          validatedLogs={validLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      const dateInput = screen.getByDisplayValue(
        "2025-01-01",
      ) as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: "2025-01-10" } });

      expect(mockOnEdit).toHaveBeenCalledWith(0, "date", "2025-01-10");
    });

    it("数量フィールドを編集できる", () => {
      render(
        <CSVImportPreview
          validatedLogs={validLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      const quantityInput = screen.getByDisplayValue("30") as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: "45" } });

      expect(mockOnEdit).toHaveBeenCalledWith(0, "quantity", "45");
    });

    it("メモフィールドを編集できる", () => {
      render(
        <CSVImportPreview
          validatedLogs={validLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      const memoInput = screen.getByDisplayValue("朝ラン") as HTMLInputElement;
      fireEvent.change(memoInput, { target: { value: "夕方ラン" } });

      expect(mockOnEdit).toHaveBeenCalledWith(0, "memo", "夕方ラン");
    });

    it("インポート中は編集を無効にする", () => {
      render(
        <CSVImportPreview
          validatedLogs={validLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
          isImporting={true}
        />,
      );

      const dateInput = screen.getByDisplayValue("2025-01-01");
      expect(dateInput).toBeDisabled();
    });
  });

  describe("行の選択と削除", () => {
    it("個別の行を選択できる", async () => {
      const user = userEvent.setup();
      render(
        <CSVImportPreview
          validatedLogs={validLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]); // 最初の行のチェックボックス

      expect(screen.getByText("選択した行を削除 (1)")).toBeInTheDocument();
    });

    it("全ての行を選択できる", async () => {
      const user = userEvent.setup();
      render(
        <CSVImportPreview
          validatedLogs={validLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]); // ヘッダーのチェックボックス

      expect(screen.getByText("選択した行を削除 (2)")).toBeInTheDocument();
    });

    it("選択した行を削除できる", async () => {
      const user = userEvent.setup();
      render(
        <CSVImportPreview
          validatedLogs={validLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]);
      await user.click(checkboxes[2]);

      const deleteButton = screen.getByText("選択した行を削除 (2)");
      await user.click(deleteButton);

      expect(mockOnRemove).toHaveBeenCalledWith([0, 1]);
    });
  });

  describe("フィルタリング", () => {
    it("エラーのみ表示フィルターが機能する", async () => {
      const user = userEvent.setup();
      render(
        <CSVImportPreview
          validatedLogs={logsWithErrors}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      // 初期状態では全て表示
      expect(screen.getByDisplayValue("2025-01-01")).toBeInTheDocument();

      // エラーのみ表示
      const filterButton = screen.getByText("エラーのみ表示");
      await user.click(filterButton);

      // エラーがない行は表示されない
      expect(screen.queryByDisplayValue("2025-01-01")).not.toBeInTheDocument();
      // エラーがある行は表示される
      expect(screen.getByText("日付は必須です")).toBeInTheDocument();
    });
  });

  describe("CSVダウンロード", () => {
    it("修正済みCSVをダウンロードできる", async () => {
      const user = userEvent.setup();
      render(
        <CSVImportPreview
          validatedLogs={validLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      const downloadButton = screen.getByText("修正済みCSVをダウンロード");
      await user.click(downloadButton);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockClick).toHaveBeenCalledTimes(1);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
    });

    it("カンマを含むフィールドを適切にエスケープする", async () => {
      const logsWithComma: ValidatedActivityLog[] = [
        {
          date: "2025-01-01",
          activityName: "ランニング,ウォーキング",
          quantity: 30,
          memo: 'メモに"引用符"が含まれる',
          isNewActivity: false,
          errors: [],
        },
      ];

      const user = userEvent.setup();
      render(
        <CSVImportPreview
          validatedLogs={logsWithComma}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      const downloadButton = screen.getByText("修正済みCSVをダウンロード");
      await user.click(downloadButton);

      const blobCall = (global.URL.createObjectURL as any).mock.calls[0][0];
      expect(blobCall.type).toBe("text/csv;charset=utf-8;");
    });
  });

  describe("インポート実行", () => {
    it("正常なログのみインポートできる", async () => {
      const user = userEvent.setup();
      render(
        <CSVImportPreview
          validatedLogs={logsWithErrors}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      const importButton = screen.getByText("インポート (2件)");
      await user.click(importButton);

      expect(mockOnImport).toHaveBeenCalledWith(logsWithErrors);
    });

    it("正常なログがない場合はインポートボタンを無効にする", () => {
      const errorOnlyLogs: ValidatedActivityLog[] = [
        {
          date: "",
          activityName: "",
          quantity: 0,
          isNewActivity: false,
          errors: [
            { field: "date", message: "日付は必須です" },
            { field: "activity", message: "活動名は必須です" },
          ],
        },
      ];

      render(
        <CSVImportPreview
          validatedLogs={errorOnlyLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
        />,
      );

      const importButton = screen.getByText("インポート (0件)");
      expect(importButton).toBeDisabled();
    });

    it("インポート中はボタンテキストが変わる", () => {
      render(
        <CSVImportPreview
          validatedLogs={validLogs}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onImport={mockOnImport}
          isImporting={true}
        />,
      );

      expect(screen.getByText("インポート中...")).toBeInTheDocument();
    });
  });
});

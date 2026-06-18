import { CSVImportPreview } from "actiko-frontend";

import type { ValidatedActivityLog } from "@packages/domain/csv/csvParser";

// CSV インポートの確認画面。上部に件数バッジ（合計/有効/新規/エラー）、
// 操作バー（選択削除・修正版エクスポート・インポート実行）、下に編集可能な
// プレビューテーブルを表示する。各行は PreviewRow が描画する。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 820 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-5">
        {children}
      </div>
    </div>
  );
}

const validatedLogs: ValidatedActivityLog[] = [
  {
    date: "2024-05-10",
    activityName: "ランニング",
    kindName: "朝ラン",
    quantity: 30,
    memo: "皇居一周",
    isNewActivity: false,
    errors: [],
  },
  {
    date: "2024-05-11",
    activityName: "読書",
    quantity: 45,
    memo: "TypeScript本",
    isNewActivity: false,
    errors: [],
  },
  {
    date: "2024-05-12",
    activityName: "ヨガ",
    quantity: 20,
    memo: "",
    isNewActivity: true,
    errors: [],
  },
  {
    date: "2024/05/13",
    activityName: "ランニング",
    quantity: 0,
    memo: "",
    isNewActivity: false,
    errors: [
      { field: "date", message: "日付の形式が正しくありません" },
      { field: "quantity", message: "数量は1以上で入力してください" },
    ],
  },
];

const noop = () => {};

// 有効・新規・エラーが混在した、典型的な確認画面の状態。
export function MixedResults() {
  return (
    <Frame>
      <CSVImportPreview
        validatedLogs={validatedLogs}
        onEdit={noop}
        onRemove={noop}
        onImport={noop}
      />
    </Frame>
  );
}

// インポート実行中（ボタンが無効化された状態）。
export function Importing() {
  return (
    <Frame>
      <CSVImportPreview
        validatedLogs={validatedLogs.slice(0, 3)}
        onEdit={noop}
        onRemove={noop}
        onImport={noop}
        isImporting={true}
      />
    </Frame>
  );
}

import { PreviewRow } from "actiko-frontend";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

import type { ValidatedActivityLog } from "@packages/domain/csv/csvParser";

// CSV インポートのプレビューテーブルの1行。各セルが編集可能な入力（日付・活動・
// 種別・数量・メモ）になっており、行頭にチェックボックスとステータスアイコンが付く。
// <tr> を返すコンポーネントなので table/tbody でラップして表示する。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 760 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

const activities = [
  { id: "act-run", name: "ランニング", emoji: "🏃" },
  { id: "act-read", name: "読書", emoji: "📚" },
];

const noop = () => {};

// 既存の活動にマッチした、検証OKの行。
export function Valid() {
  const log: ValidatedActivityLog = {
    date: "2024-05-12",
    activityName: "ランニング",
    kindName: "朝ラン",
    quantity: 30,
    memo: "皇居一周",
    isNewActivity: false,
    errors: [],
  };
  return (
    <Frame>
      <PreviewRow
        log={log}
        index={0}
        status="ok"
        isSelected={true}
        onToggleSelect={noop}
        onEdit={noop}
        isImporting={false}
        activities={activities}
        statusIcon={<CheckCircle className="h-4 w-4 text-green-500" />}
      />
    </Frame>
  );
}

// 既存にない活動名 → 新規作成バッジ付きの警告行。
export function NewActivity() {
  const log: ValidatedActivityLog = {
    date: "2024-05-13",
    activityName: "ヨガ",
    quantity: 45,
    memo: "",
    isNewActivity: true,
    errors: [],
  };
  return (
    <Frame>
      <PreviewRow
        log={log}
        index={1}
        status="warning"
        isSelected={false}
        onToggleSelect={noop}
        onEdit={noop}
        isImporting={false}
        activities={activities}
        statusIcon={<AlertCircle className="h-4 w-4 text-yellow-500" />}
      />
    </Frame>
  );
}

// 数量が不正でエラーになった行（行が赤背景になり、右端にエラー文が出る）。
export function ValidationError() {
  const log: ValidatedActivityLog = {
    date: "2024/05/14",
    activityName: "読書",
    quantity: 0,
    memo: "",
    isNewActivity: false,
    errors: [
      { field: "date", message: "日付の形式が正しくありません" },
      { field: "quantity", message: "数量は1以上で入力してください" },
    ],
  };
  return (
    <Frame>
      <PreviewRow
        log={log}
        index={2}
        status="error"
        isSelected={false}
        onToggleSelect={noop}
        onEdit={noop}
        isImporting={false}
        activities={activities}
        statusIcon={<XCircle className="h-4 w-4 text-red-500" />}
      />
    </Frame>
  );
}

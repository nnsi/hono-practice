import { CSVColumnMapper } from "actiko-frontend";

import type { ColumnMapping } from "@packages/domain/csv/csvParser";

// CSV 列とアプリのフィールド（日付/活動/種別/数量/メモ）の対応付けを行う画面。
// 左に CSV ヘッダー、右にマッピング結果、下にサンプル3行を表示する。
// 未マッピングの必須フィールド（日付・数量）は赤くハイライトされる。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 720 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-5">
        {children}
      </div>
    </div>
  );
}

const csvHeaders = ["日付", "種目", "距離(km)", "メモ"];

const csvSampleData: Record<string, string>[] = [
  { 日付: "2024-05-01", 種目: "ランニング", "距離(km)": "5.2", メモ: "朝ラン" },
  { 日付: "2024-05-02", 種目: "ランニング", "距離(km)": "3.0", メモ: "" },
  { 日付: "2024-05-03", 種目: "ウォーキング", "距離(km)": "2.4", メモ: "通勤" },
];

const noop = () => {};

// 必須項目がすべて埋まった状態（日付・活動・数量がマッピング済み）。
export function Mapped() {
  const mapping: ColumnMapping = {
    date: "日付",
    activity: "種目",
    quantity: "距離(km)",
    memo: "メモ",
  };
  return (
    <Frame>
      <CSVColumnMapper
        csvHeaders={csvHeaders}
        csvSampleData={csvSampleData}
        mapping={mapping}
        onMappingChange={noop}
        onConfirm={noop}
      />
    </Frame>
  );
}

// 日付と数量だけマッピングし、活動列は未指定の状態。
// 活動が未マッピングのときは「固定の活動を使う」セレクタが表示される。
export function FixedActivity() {
  const mapping: ColumnMapping = {
    date: "日付",
    quantity: "距離(km)",
  };
  return (
    <Frame>
      <CSVColumnMapper
        csvHeaders={csvHeaders}
        csvSampleData={csvSampleData}
        mapping={mapping}
        onMappingChange={noop}
        onConfirm={noop}
      />
    </Frame>
  );
}

import { GoalHeatmap } from "actiko-frontend";

// 全ゴールの達成度を GitHub 風に可視化するヒートマップ（行=曜日, 列=週, 直近約4ヶ月）。
// データはローカル Dexie の goals / activityLogs から読むため、プレビュー環境（空DB）では
// 全セルがグレー（活動なし）の空状態グリッド + 凡例 + 日付ラベルが描画される。
// props は無く、グリッド骨格・凡例・色スケールの確認が目的。
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 340 }}>{children}</div>;
}

export function EmptyState() {
  return (
    <Frame>
      <GoalHeatmap />
    </Frame>
  );
}

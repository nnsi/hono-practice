import { LogFormBody } from "actiko-frontend";

// 記録フォームの本体。activity の recordingMode を解決し、対応する
// 記録モードコンポーネント（ManualMode 等）を描画する。kinds / todayLogs は
// Dexie から読むが、プレビュー環境の IndexedDB は空なので「種別なし」の
// 素の入力フォームが描画される（実機では種別チップ等が並ぶ）。
const noop = () => {};

const manualActivity = {
  id: "act-run",
  userId: "user-1",
  name: "ランニング",
  label: "ランニング",
  emoji: "🏃",
  iconType: "emoji" as const,
  iconUrl: null,
  iconThumbnailUrl: null,
  description: "",
  quantityUnit: "分",
  orderIndex: "a0",
  showCombinedStats: true,
  recordingMode: "manual" as const,
  recordingModeConfig: null,
  createdAt: "2024-05-01T00:00:00.000Z",
  updatedAt: "2024-05-01T00:00:00.000Z",
  deletedAt: null,
  _syncStatus: "synced" as const,
};

// 携帯幅の記録シートとしてカード内に描画する。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 320 }}
      className="p-4 bg-white rounded-2xl shadow-lifted"
    >
      {children}
    </div>
  );
}

export function Manual() {
  return (
    <Frame>
      <LogFormBody activity={manualActivity} date="2024-05-15" onDone={noop} />
    </Frame>
  );
}

export function Counter() {
  return (
    <Frame>
      <LogFormBody
        activity={{
          ...manualActivity,
          id: "act-water",
          name: "水分補給",
          emoji: "💧",
          quantityUnit: "杯",
          recordingMode: "counter" as const,
        }}
        date="2024-05-15"
        onDone={noop}
      />
    </Frame>
  );
}

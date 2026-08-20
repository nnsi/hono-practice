import { RecordDialog } from "actiko-frontend";

// 記録ダイアログ（ModalOverlay 付きモーダル）。ヘッダにアクティビティのアイコンと
// 名前、本体に LogFormBody（recordingMode を解決して対応する記録モード入力を描画）。
// kinds / todayLogs は Dexie 由来で空 → 素の入力フォームが描画される。
const noop = () => {};

const runningActivity = {
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

export function Default() {
  return (
    <RecordDialog activity={runningActivity} date="2024-05-15" onClose={noop} />
  );
}

export function Counter() {
  return (
    <RecordDialog
      activity={{
        ...runningActivity,
        id: "act-water",
        name: "水分補給",
        emoji: "💧",
        quantityUnit: "杯",
        recordingMode: "counter" as const,
      }}
      date="2024-05-15"
      onClose={noop}
    />
  );
}

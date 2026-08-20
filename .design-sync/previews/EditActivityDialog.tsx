import { EditActivityDialog } from "actiko-frontend";

// アクティビティ編集ダイアログ（ModalOverlay 付きモーダル）。初期値は渡した
// activity から内部フックが導出する（名前「ランニング」単位「分」等が入った状態）。
// 種類は Dexie から読むためプレビューの空 IndexedDB では行が出ないが、
// 名前・単位・記録モード・削除/保存ボタンは描画される。
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
    <EditActivityDialog
      activity={runningActivity}
      onClose={noop}
      onUpdated={noop}
    />
  );
}

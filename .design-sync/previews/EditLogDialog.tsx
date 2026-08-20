import { EditLogDialog } from "actiko-frontend";

// 記録編集ダイアログ（ModalOverlay 付きモーダル）。ヘッダにアクティビティ名、本体に
// 数量・メモの入力欄と削除/保存ボタン。種類チップは Dexie 由来で空 → 数量とメモのみ表示。
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

const log = {
  id: "log-1",
  activityId: "act-run",
  activityKindId: null,
  quantity: 30,
  memo: "朝のジョギング",
  date: "2024-05-15",
  time: null,
  _syncStatus: "synced" as const,
};

export function Default() {
  return <EditLogDialog log={log} activity={runningActivity} onClose={noop} />;
}

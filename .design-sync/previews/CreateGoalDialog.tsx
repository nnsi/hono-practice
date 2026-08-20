import { CreateGoalDialog } from "actiko-frontend";

// 目標新規作成ダイアログ（ModalOverlay 付きモーダル）。本体は CreateGoalFields
// （アクティビティ選択・日次目標・期間・曜日別目標・負債上限）。フォーム state は
// 内部フックが保持するので props を渡せば開いた状態で描画される。
const asyncNoop = async () => {};
const noop = () => {};

const base = {
  userId: "user-1",
  label: "",
  iconType: "emoji" as const,
  iconUrl: null,
  iconThumbnailUrl: null,
  description: "",
  showCombinedStats: true,
  recordingMode: "manual" as const,
  recordingModeConfig: null,
  createdAt: "2024-05-01T00:00:00.000Z",
  updatedAt: "2024-05-01T00:00:00.000Z",
  deletedAt: null,
  _syncStatus: "synced" as const,
};

const activities = [
  {
    ...base,
    id: "act-run",
    name: "ランニング",
    emoji: "🏃",
    quantityUnit: "分",
    orderIndex: "a0",
  },
  {
    ...base,
    id: "act-read",
    name: "読書",
    emoji: "📚",
    quantityUnit: "ページ",
    orderIndex: "a1",
  },
  {
    ...base,
    id: "act-study",
    name: "勉強",
    emoji: "📖",
    quantityUnit: "分",
    orderIndex: "a2",
  },
];

export function Default() {
  return (
    <CreateGoalDialog
      activities={activities}
      onClose={noop}
      onCreate={asyncNoop}
    />
  );
}

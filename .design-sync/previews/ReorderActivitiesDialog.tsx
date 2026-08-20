import { ReorderActivitiesDialog } from "actiko-frontend";

// アクティビティ並び替えダイアログ（ModalOverlay 付きモーダル）。渡した activities を
// 内部 state に取り込み、各行に上下矢印ボタンを描画する（端の行はボタンが disabled）。
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
    id: "act-water",
    name: "水分補給",
    emoji: "💧",
    quantityUnit: "杯",
    orderIndex: "a2",
  },
  {
    ...base,
    id: "act-study",
    name: "勉強",
    emoji: "📖",
    quantityUnit: "分",
    orderIndex: "a3",
  },
];

export function Default() {
  return <ReorderActivitiesDialog activities={activities} onClose={noop} />;
}

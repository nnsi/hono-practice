import { CreateLogDialog } from "actiko-frontend";

// 記録作成ダイアログ（ModalOverlay 付きモーダル）。初期表示はアクティビティ選択画面で、
// 渡した activities が一覧ボタンとして並ぶ（選択すると LogFormBody に遷移）。
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
];

export function SelectActivity() {
  return (
    <CreateLogDialog date="2024-05-15" activities={activities} onClose={noop} />
  );
}

export function Empty() {
  return <CreateLogDialog date="2024-05-15" activities={[]} onClose={noop} />;
}

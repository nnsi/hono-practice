import { ActivityCard } from "actiko-frontend";

// ActivityCard is a square tappable tile shown in the actiko home grid.
// Render in a 2-up grid at phone width. Emoji icons render directly; the
// remote-icon cache effect is skipped for emoji activities.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 320 }} className="grid grid-cols-2 gap-3">
      {children}
    </div>
  );
}

const makeActivity = (
  id: string,
  name: string,
  emoji: string,
  quantityUnit: string,
) => ({
  id,
  userId: "user-1",
  name,
  label: name,
  emoji,
  iconType: "emoji" as const,
  iconUrl: null,
  iconThumbnailUrl: null,
  description: "",
  quantityUnit,
  orderIndex: "a0",
  showCombinedStats: true,
  recordingMode: "manual" as const,
  recordingModeConfig: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  deletedAt: null,
  _syncStatus: "synced" as const,
});

const noop = () => {};

export function Grid() {
  return (
    <Frame>
      <ActivityCard
        activity={makeActivity("act-run", "ランニング", "🏃", "分")}
        isDone={false}
        onClick={noop}
        onEdit={noop}
      />
      <ActivityCard
        activity={makeActivity("act-read", "読書", "📚", "ページ")}
        isDone={true}
        onClick={noop}
        onEdit={noop}
      />
      <ActivityCard
        activity={makeActivity("act-water", "水を飲む", "💧", "杯")}
        isDone={false}
        onClick={noop}
        onEdit={noop}
      />
      <ActivityCard
        activity={makeActivity("act-study", "勉強", "✏️", "分")}
        isDone={true}
        onClick={noop}
        onEdit={noop}
      />
    </Frame>
  );
}

export function Default() {
  return (
    <Frame>
      <ActivityCard
        activity={makeActivity("act-run", "ランニング", "🏃", "分")}
        isDone={false}
        onClick={noop}
        onEdit={noop}
      />
    </Frame>
  );
}

export function Done() {
  return (
    <Frame>
      <ActivityCard
        activity={makeActivity("act-read", "読書", "📚", "ページ")}
        isDone={true}
        onClick={noop}
        onEdit={noop}
      />
    </Frame>
  );
}

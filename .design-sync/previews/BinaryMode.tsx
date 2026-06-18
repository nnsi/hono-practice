import { BinaryMode } from "actiko-frontend";

const activity = {
  id: "act-1",
  name: "ランニング",
  emoji: "🎯",
  quantityUnit: "回",
  recordingMode: "binary",
  recordingModeConfig: null,
};

const kinds = [
  { id: "k1", name: "屋外", color: "#f59e0b" },
  { id: "k2", name: "室内", color: "#3b82f6" },
];

// Binary mode is a two-button tally sheet — render inside a phone-sized card.
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

// Two kinds with today's tally line below.
export function WithTally() {
  return (
    <Frame>
      <BinaryMode
        activity={activity}
        kinds={kinds}
        date="2026-06-18"
        onSave={async () => {}}
        isSubmitting={false}
        todayLogs={[
          { activityKindId: "k1", quantity: 1 },
          { activityKindId: "k1", quantity: 1 },
          { activityKindId: "k2", quantity: 1 },
        ]}
      />
    </Frame>
  );
}

// Fresh day — buttons shown, no tally line yet.
export function NoLogsYet() {
  return (
    <Frame>
      <BinaryMode
        activity={activity}
        kinds={kinds}
        date="2026-06-18"
        onSave={async () => {}}
        isSubmitting={false}
        todayLogs={[]}
      />
    </Frame>
  );
}

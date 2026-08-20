import { CheckMode } from "actiko-frontend";

const activity = {
  id: "act-1",
  name: "ストレッチ",
  emoji: "🧘",
  quantityUnit: "回",
  recordingMode: "check",
  recordingModeConfig: null,
};

const kinds = [
  { id: "k1", name: "朝", color: "#22c55e" },
  { id: "k2", name: "夜", color: "#6366f1" },
];

// Check mode centers a large tap target — render inside a phone-sized card.
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

// Kinds present: pick one before checking; "朝" already recorded today.
export function WithKinds() {
  return (
    <Frame>
      <CheckMode
        activity={activity}
        kinds={kinds}
        date="2026-06-18"
        onSave={async () => {}}
        isSubmitting={false}
        todayLogs={[{ activityKindId: "k1", quantity: 1 }]}
      />
    </Frame>
  );
}

// Kindless single check — ready to tap.
export function SingleCheck() {
  return (
    <Frame>
      <CheckMode
        activity={activity}
        kinds={[]}
        date="2026-06-18"
        onSave={async () => {}}
        isSubmitting={false}
        todayLogs={[]}
      />
    </Frame>
  );
}

// Kindless, already recorded today — confirmed state.
export function AlreadyRecorded() {
  return (
    <Frame>
      <CheckMode
        activity={activity}
        kinds={[]}
        date="2026-06-18"
        onSave={async () => {}}
        isSubmitting={false}
        todayLogs={[{ activityKindId: null, quantity: 1 }]}
      />
    </Frame>
  );
}

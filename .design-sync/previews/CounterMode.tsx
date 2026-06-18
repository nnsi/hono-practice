import { CounterMode } from "actiko-frontend";

const config = JSON.stringify({ mode: "counter", steps: [1, 10, 100] });

const activity = {
  id: "act-1",
  name: "腕立て伏せ",
  emoji: "💪",
  quantityUnit: "回",
  recordingMode: "counter",
  recordingModeConfig: config,
};

const kinds = [
  { id: "k1", name: "通常", color: "#3b82f6" },
  { id: "k2", name: "ワイド", color: "#f59e0b" },
];

// Counter mode opens on its step-button panel — render inside a phone-sized card.
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

// Step buttons + kind selector + today's running total.
export function WithKinds() {
  return (
    <Frame>
      <CounterMode
        activity={activity}
        kinds={kinds}
        date="2026-06-18"
        onSave={async () => {}}
        isSubmitting={false}
        todayLogs={[
          { activityKindId: "k1", quantity: 10 },
          { activityKindId: "k1", quantity: 10 },
        ]}
      />
    </Frame>
  );
}

// No kinds, fresh day — just the step buttons.
export function StepsOnly() {
  return (
    <Frame>
      <CounterMode
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

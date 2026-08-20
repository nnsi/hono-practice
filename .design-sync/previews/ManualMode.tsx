import { ManualMode } from "actiko-frontend";

const activity = {
  id: "act-1",
  name: "ランニング",
  emoji: "🎯",
  quantityUnit: "分",
  recordingMode: "manual",
  recordingModeConfig: null,
};

const kinds = [
  { id: "k1", name: "屋外", color: "#f59e0b" },
  { id: "k2", name: "室内", color: "#3b82f6" },
];

// Manual mode is a full-width form — render inside a phone-sized card.
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

// Kind selector + quantity + memo.
export function WithKinds() {
  return (
    <Frame>
      <ManualMode
        activity={activity}
        kinds={kinds}
        date="2026-06-18"
        onSave={async () => {}}
        isSubmitting={false}
      />
    </Frame>
  );
}

// No kinds — quantity + memo only.
export function QuantityOnly() {
  return (
    <Frame>
      <ManualMode
        activity={activity}
        kinds={[]}
        date="2026-06-18"
        onSave={async () => {}}
        isSubmitting={false}
      />
    </Frame>
  );
}

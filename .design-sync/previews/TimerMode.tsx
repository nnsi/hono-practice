import { TimerMode } from "actiko-frontend";

const activity = {
  id: "act-timer-1",
  name: "勉強",
  emoji: "📖",
  quantityUnit: "分",
  recordingMode: "timer",
  recordingModeConfig: null,
};

const kinds = [{ id: "k1", name: "英語", color: "#6366f1" }];

// Timer mode opens on its stopwatch panel — render inside a phone-sized card.
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

// Idle stopwatch (00:00) with a Start button and the manual/timer tab row.
export function Idle() {
  return (
    <Frame>
      <TimerMode
        activity={activity}
        kinds={kinds}
        date="2026-06-18"
        onSave={async () => {}}
        isSubmitting={false}
      />
    </Frame>
  );
}

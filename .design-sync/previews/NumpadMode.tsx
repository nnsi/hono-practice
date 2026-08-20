import { NumpadMode } from "actiko-frontend";

const activity = {
  id: "act-1",
  name: "ランニング",
  emoji: "🎯",
  quantityUnit: "分",
  recordingMode: "numpad",
  recordingModeConfig: null,
};

// Mobile-width recording sheet — render inside a phone-sized card.
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

export function Numpad() {
  return (
    <Frame>
      <NumpadMode
        activity={activity}
        kinds={[]}
        date="2026-06-18"
        onSave={async () => {}}
        isSubmitting={false}
      />
    </Frame>
  );
}

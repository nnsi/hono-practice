import { RecordingModeSelector } from "actiko-frontend";

const counterConfig = JSON.stringify({ mode: "counter", steps: [1, 10, 100] });

// Mode-picker grid used in the activity editor — render inside a phone-sized card.
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

// Manual mode highlighted; no extra config field.
export function ManualSelected() {
  return (
    <Frame>
      <RecordingModeSelector
        recordingMode="manual"
        onRecordingModeChange={() => {}}
        recordingModeConfig={null}
        onRecordingModeConfigChange={() => {}}
      />
    </Frame>
  );
}

// Counter mode selected — reveals the step-values input.
export function CounterWithSteps() {
  return (
    <Frame>
      <RecordingModeSelector
        recordingMode="counter"
        onRecordingModeChange={() => {}}
        recordingModeConfig={counterConfig}
        onRecordingModeConfigChange={() => {}}
      />
    </Frame>
  );
}

import { TasksTabs } from "actiko-frontend";

// TasksTabs is a sticky segmented control (active / archived) spanning the page
// header; render it inside a phone-width header strip on a soft background.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360 }} className="bg-gray-50 rounded-xl p-1">
      {children}
    </div>
  );
}

export function ActiveSelected() {
  return (
    <Frame>
      <TasksTabs activeTab="active" onChange={() => {}} />
    </Frame>
  );
}

export function ArchivedSelected() {
  return (
    <Frame>
      <TasksTabs activeTab="archived" onChange={() => {}} />
    </Frame>
  );
}

import { EditActivityKindsField } from "actiko-frontend";

const kinds = [
  { id: "k1", name: "屋外", color: "#f59e0b" },
  { id: "k2", name: "室内", color: "#3b82f6" },
];

// Editable kind rows (name + color + delete) with an add link — render inside a phone-sized card.
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

// Two existing kinds plus the "種類を追加" link.
export function WithKinds() {
  return (
    <Frame>
      <EditActivityKindsField kinds={kinds} setKinds={() => {}} />
    </Frame>
  );
}

// No kinds yet — only the add link.
export function Empty() {
  return (
    <Frame>
      <EditActivityKindsField kinds={[]} setKinds={() => {}} />
    </Frame>
  );
}

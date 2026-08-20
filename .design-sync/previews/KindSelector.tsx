import { KindSelector } from "actiko-frontend";

const kinds = [
  { id: "k1", name: "屋外", color: "#f59e0b" },
  { id: "k2", name: "室内", color: "#3b82f6" },
  { id: "k3", name: "ジム", color: null },
];

// Pill row of selectable kinds — render inside a phone-sized card.
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

// One kind selected (filled black pill), others show color dots.
export function Selected() {
  return (
    <Frame>
      <KindSelector kinds={kinds} selectedKindId="k1" onSelect={() => {}} />
    </Frame>
  );
}

// Nothing selected yet.
export function Unselected() {
  return (
    <Frame>
      <KindSelector kinds={kinds} selectedKindId={null} onSelect={() => {}} />
    </Frame>
  );
}

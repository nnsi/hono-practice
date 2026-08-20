import { MemoInput } from "actiko-frontend";

// Labeled memo textarea — render inside a phone-sized card.
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

// Filled with a realistic note.
export function Filled() {
  return (
    <Frame>
      <MemoInput
        value="公園を3周。後半ペースアップできた"
        onChange={() => {}}
      />
    </Frame>
  );
}

// Empty — shows placeholder.
export function Empty() {
  return (
    <Frame>
      <MemoInput value="" onChange={() => {}} />
    </Frame>
  );
}

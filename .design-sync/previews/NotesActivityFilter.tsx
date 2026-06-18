import { NotesActivityFilter } from "actiko-frontend";

// ノート一覧上部の横スクロールフィルタチップ列。「すべて」+ アクティビティ名の
// チップを並べ、選択中は青く塗られる。props 駆動なので選択状態を固定で見せる。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 340 }} className="bg-white px-4 py-2">
      {children}
    </div>
  );
}

const activities = [
  { id: "act-run", name: "ランニング" },
  { id: "act-read", name: "読書" },
  { id: "act-study", name: "勉強" },
  { id: "act-work", name: "仕事" },
];

const noop = () => {};

export function AllSelected() {
  return (
    <Frame>
      <NotesActivityFilter
        activities={activities}
        selectedActivityId={null}
        onSelect={noop}
      />
    </Frame>
  );
}

export function ActivitySelected() {
  return (
    <Frame>
      <NotesActivityFilter
        activities={activities}
        selectedActivityId="act-read"
        onSelect={noop}
      />
    </Frame>
  );
}

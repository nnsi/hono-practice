import { NoteActivityChips } from "actiko-frontend";

// ノート詳細でアクティビティを紐づけるチップUI。初期は1つの折りたたみチップ
// （タグアイコン + 選択中の名前 or「アクティビティなし」）として表示され、
// 押すと候補が展開される。内部 useState で展開を管理するため、
// 既定の折りたたみ状態を選択あり/なしの2パターンで見せる。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 340 }} className="bg-white p-2">
      {children}
    </div>
  );
}

const activities = [
  { id: "act-run", name: "ランニング" },
  { id: "act-read", name: "読書" },
  { id: "act-study", name: "勉強" },
];

const noop = () => {};

export function Selected() {
  return (
    <Frame>
      <NoteActivityChips
        activityId="act-read"
        onChangeActivityId={noop}
        activities={activities}
      />
    </Frame>
  );
}

export function NoneSelected() {
  return (
    <Frame>
      <NoteActivityChips
        activityId={null}
        onChangeActivityId={noop}
        activities={activities}
      />
    </Frame>
  );
}

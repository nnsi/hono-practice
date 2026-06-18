import { NoteCard } from "actiko-frontend";

// ノート一覧の1行カード。タイトル・本文プレビュー(markdown整形)・更新日時・
// 紐づけアクティビティのバッジ・削除ボタンを表示する。pending 時は同期中の
// スピナーが付く。全幅行なので一覧カードと同じ枠でラップする。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 340 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
    >
      {children}
    </div>
  );
}

const noop = () => {};

export function Default() {
  return (
    <Frame>
      <NoteCard
        title="今週の振り返り"
        content="毎朝のランニングを続けられた一週間だった。読書習慣も少しずつ定着してきている。"
        updatedAt="2024-05-15T09:30:00.000Z"
        activityName="ランニング"
        onClick={noop}
        onDelete={noop}
      />
    </Frame>
  );
}

export function WithoutActivity() {
  return (
    <Frame>
      <NoteCard
        title="買い物メモ"
        content="牛乳、卵、パン、コーヒー豆を買う。週末のうちにまとめて済ませておきたい。"
        updatedAt="2024-05-14T18:05:00.000Z"
        activityName={null}
        onClick={noop}
        onDelete={noop}
      />
    </Frame>
  );
}

export function Pending() {
  return (
    <Frame>
      <NoteCard
        title="読書ノート『習慣の力』"
        content="習慣はきっかけ・ルーチン・報酬のループで形成される。小さな成功体験を積み重ねる。"
        updatedAt="2024-05-15T07:12:00.000Z"
        activityName="読書"
        syncStatus="pending"
        onClick={noop}
        onDelete={noop}
      />
    </Frame>
  );
}

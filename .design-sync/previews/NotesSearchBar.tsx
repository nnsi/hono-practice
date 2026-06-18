import { NotesSearchBar } from "actiko-frontend";

// ノート検索バー。虫眼鏡アイコン付きの入力欄で、入力があるとクリア(×)ボタンが出る。
// props 駆動（value / onChange）なので状態は固定値で見せる。
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 340 }}>{children}</div>;
}

const noop = () => {};

export function Empty() {
  return (
    <Frame>
      <NotesSearchBar value="" onChange={noop} />
    </Frame>
  );
}

export function WithQuery() {
  return (
    <Frame>
      <NotesSearchBar value="振り返り" onChange={noop} />
    </Frame>
  );
}

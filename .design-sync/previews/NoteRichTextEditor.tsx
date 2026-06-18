import { NoteRichTextEditor } from "actiko-frontend";

// ノート本文のリッチテキストエディタ。サンドボックス iframe 内に
// ツールバー（太字/斜体/見出し/箇条書き/番号/引用/解除）と編集領域を描画し、
// markdown ⇄ HTML を postMessage 経由で同期する。props は value/onChange/placeholder。
// 初期 markdown を value で渡し、ツールバー付きの編集面を見せる。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 420 }} className="bg-white p-2">
      {children}
    </div>
  );
}

const noop = () => {};

export function WithContent() {
  return (
    <Frame>
      <NoteRichTextEditor
        value={
          "# 今日の振り返り\n\n- 朝のランニングを30分こなせた\n- 集中して読書ができた\n\n> 小さな積み重ねが習慣になる"
        }
        onChange={noop}
        placeholder="ノートを書く..."
      />
    </Frame>
  );
}

export function Empty() {
  return (
    <Frame>
      <NoteRichTextEditor
        value=""
        onChange={noop}
        placeholder="ノートを書く..."
      />
    </Frame>
  );
}

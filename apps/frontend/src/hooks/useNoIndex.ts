import { useEffect } from "react";

/**
 * 検索エンジンによるインデックスを拒否する meta tag を document.head に動的に追加する。
 * 規約・プライバシーポリシー・特商法表記等の法務ページで使用し、販売事業者情報が
 * 検索結果に露出しないようにする。
 *
 * 注意: Google/Bingは JavaScript を実行するため dynamic meta tag も認識されるが、
 * 一部のクローラーは認識しない可能性がある。より強固な対策が必要な場合は
 * HTTP レスポンスヘッダ `X-Robots-Tag: noindex` を併用すること。
 */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);
}

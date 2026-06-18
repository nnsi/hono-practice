import { LegalModal } from "actiko-frontend";

// 利用規約・プライバシーポリシー等を表示するモーダル。
// ModalOverlay を内部で合成し、開いた状態で全文を描画する。
// terms は本文中に /contact リンク（Router 依存）を含まないため確実に描画できる。
const noop = () => {};

export function Terms() {
  return <LegalModal type="terms" onClose={noop} />;
}

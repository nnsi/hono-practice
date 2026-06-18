import { ContactPage } from "actiko-frontend";

// お問い合わせフルページ。メール / カテゴリ / 本文の静的フォーム。
// useContactForm は送信時にのみ apiClient / useNavigate を使うため、
// プレビュー環境（Router なし・Dexie 空）でも初期フォームは描画される想定。
// 送信ハンドラは実行されないので no-op 扱い。
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 520 }}>{children}</div>;
}

export function Default() {
  return (
    <Frame>
      <ContactPage />
    </Frame>
  );
}

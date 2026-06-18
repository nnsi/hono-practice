import { LoginForm } from "actiko-frontend";

// 未認証時のログインフォーム。Google / Apple のソーシャルログインボタン
// （外部SDK未ロードのオフラインではフォールバック表示）+ 区切り +
// ログインID / パスワード入力 + ログインボタンを縦に並べる。
// すべてコールバック props で、Router 非依存なのでそのまま描画される。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 380 }}
      className="bg-gray-100 rounded-2xl p-6 flex justify-center"
    >
      {children}
    </div>
  );
}

const asyncNoop = async () => {};

export function Default() {
  return (
    <Frame>
      <LoginForm
        onLogin={asyncNoop}
        onGoogleLogin={asyncNoop}
        onAppleLogin={asyncNoop}
      />
    </Frame>
  );
}

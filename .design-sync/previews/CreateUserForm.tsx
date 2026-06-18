import { CreateUserForm } from "actiko-frontend";

// 新規ユーザー登録フォーム。Google / Apple での登録ボタン（オフラインでは
// フォールバック表示）+ OAuth 同意文 + 区切り + ログインID / パスワード入力 +
// 利用規約・プライバシーポリシーへの同意チェック + 登録ボタンを並べる。
// コールバック props のみで Router 非依存なのでそのまま描画される。
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
      <CreateUserForm
        onRegister={asyncNoop}
        onGoogleLogin={asyncNoop}
        onAppleLogin={asyncNoop}
      />
    </Frame>
  );
}

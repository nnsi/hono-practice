# localStorage廃止・Cookie移行チェックリスト

## フロントエンド修正箇所

- [x] apps/frontend/src/utils/apiClient.ts
  - [x] localStorage.getItem("refreshToken") の削除・Cookie取得に置換（31行目）
  - [x] localStorage.setItem("token"), localStorage.setItem("refreshToken") の削除・Cookie保存に置換（50, 51行目）
  - [x] localStorage.removeItem("token"), localStorage.removeItem("refreshToken") の削除・Cookie削除に置換（54, 55行目）
  - [x] Authorizationヘッダーへのトークン付与をCookie送信に変更（70行目）

- [x] apps/frontend/src/providers/AuthProvider.tsx
  - [x] localStorage.getItem("token"), localStorage.getItem("refreshToken") の削除・Cookie取得に置換（37, 38, 50, 51, 79, 138行目）
  - [x] localStorage.setItem("token"), localStorage.setItem("refreshToken") の削除・Cookie保存に置換（91, 92, 121, 122, 157, 158行目）
  - [x] localStorage.removeItem("token"), localStorage.removeItem("refreshToken") の削除・Cookie削除に置換（103, 104, 151, 152行目）

- [x] apps/frontend/src/components/root/CreateUserForm.tsx
  - [x] localStorage.setItem("token"), localStorage.setItem("refreshToken") の削除・Cookie保存に置換（45, 46, 125, 126行目）

- [x] APIリクエスト時のfetch/axios等でcredentials: 'include'やwithCredentials: trueを設定

## バックエンド修正箇所

- [x] apps/backend/middleware/authMiddleware.ts
  - [x] Authorizationヘッダーからのトークン取得をCookieからの取得に変更（13行目）

- [x] apps/backend/feature/user/userRoute.ts
  - [x] Authorizationヘッダーからのトークン取得をCookieからの取得に変更（78行目）

- [x] CORS設定でAccess-Control-Allow-Credentials: trueを追加

- [x] トークン発行時にSet-CookieヘッダーでHttpOnly/Secure属性付きで返すよう修正

- [x] ログアウト時にCookie削除(Set-Cookie: 有効期限を過去に)

- [x] テストコード（authRoute.test.ts等）でAuthorizationヘッダー利用部分をCookie送信に修正（282, 318, 351, 366, 424, 456, 493, 544, 561, 584, 654, 664行目）

## 動作確認

- [ ] ログイン・リフレッシュ・ログアウト時にCookieが正しく保存/削除されるか
- [ ] APIアクセス時にCookieが正しく送信され、認証が通るか
- [ ] クロスドメイン環境でCookieが正しく動作するか
- [ ] XSS/CSRF等のセキュリティ観点で問題がないか
- [ ] localStorageにトークンが一切残っていないことを確認

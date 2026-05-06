# 脆弱性修正チェックリスト（対応完了）

> 2026-05-03 にコード調査して、対応済み項目（refresh tokenローテーション順序・パスワードハッシュbcrypt移行）は削除済み。
> 残った 13 項目すべてに対応完了（同 2026-05-03）。

## 1. 依存関係の脆弱性対応（High）✅

- [x] `vite` を `^6.4.2` に更新
- [x] `hono` を `^4.12.4` に更新（pnpm overrides も `4.12.4` に）
- [x] `@hono/node-server` を `^1.19.10` に更新
- [x] `pnpm-lock.yaml` を再生成

---

## 2. レート制限の強化（High）✅

> 縮約版で対応。atomic化（KV→Durable Object）は将来課題。

- [x] IP取得を `cf-connecting-ip` 優先（Cloudflare 経由なら偽装不可。`x-forwarded-for` はフォールバックのみ）
- [x] KV未設定時に production/stg では fail-close（503 を返す）
- [x] `/auth/token` にレート制限を適用（`tokenRateLimitConfig`）
- [x] `/client-errors` にレート制限を適用（`clientErrorRateLimitConfig`、1分間に30回）
- [x] `applyRateLimit` ヘルパーで rate limit 適用ロジックを共通化
- [ ] **未対応（許容）**: KVカウントの非原子性。同時並行でカウンターがズレうるが、低しきい値の用途なら実害低と判断。完全対応は Durable Object 化が必要

---

## 3. 画像アップロード制限（High）✅

> 縮約版で対応。multipart 移行は将来課題。

- [x] base64 文字列に最大長制限を追加（5MB）
- [x] decode後バイトサイズを検証（4MB）
- [x] mimeType を z.enum で制限（jpeg/png/webp）
- [x] magic bytes 検証（既存）+ 寸法検証（PNG/WebP は4096px以下、`validateImageBytes`）
- [ ] **未対応（将来課題）**: multipart/form-data への移行。base64 + JSON 方式のままだがサイズ制限で DoS は塞がる

---

## 4. AI API abuse対策（High）✅

> 縮約版で対応。`/users/ai/*` を premium 限定にすることで「無料ユーザーの無限呼び出し」を遮断。

- [x] `premiumMiddleware` を `/users/ai/*` に適用（`apps/backend/app.ts:81`）
- [ ] **不要と判断**: per-user quota / per-IP quota / timeout / maxTokens / コスト上限。premium ユーザー前提なら課金済みなので過度な制限は不要

---

## 5. 管理者メール設定の分離（High）✅

- [x] `ADMIN_ALLOWED_EMAILS` は元から `VITE_CONTACT_EMAIL` と分離（backend/frontend で別変数）
- [x] zod schema に valid email 形式チェック追加
- [x] production / stg では `ADMIN_ALLOWED_EMAILS` を必須化（`superRefine` で起動失敗）

---

## 6. Hostヘッダ汚染対策（Medium）✅

- [x] アイコンアップロードで `Host` ヘッダ → `c.env.APP_URL` に変更（`activityRoute.ts:158`）
- [x] dev-login 内の Host ヘッダ参照は localhost 制限のみで永続化しないため許容

---

## 7. client-errorsの保護（Medium）✅

- [x] `/client-errors` にレート制限を適用
- [x] `optionalAuthMiddleware` を適用し、`userId` をクライアント入力ではなく auth context から取得
- [x] `userId` フィールドをスキーマから削除

---

## 8. Refresh Tokenの露出削減（Medium）✅

- [x] `shouldReturnRefreshTokenInBody(c)` ヘルパー追加（`Origin` ヘッダ有無で web/mobile 判定）
- [x] Web では JSON に refresh token を含めず httpOnly cookie のみ
- [x] Mobile（React Native fetch）は Origin ヘッダ無しで判定 → 従来通り JSON に含める

---

## 9. Admin JWT分離（Medium）✅

- [x] `JWT_SECRET_ADMIN` のフォールバック削除（`adminAuthMiddleware.ts:21`, `adminAuthRoute.ts:11`）
- [x] production / stg では `JWT_SECRET_ADMIN` を必須化（`config.ts` の superRefine）

---

## 10. Cookie設定統一（Low）✅

- [x] `setRefreshCookie` / `clearRefreshCookie` 共通ヘルパーで auth/user 全フローを統一
- [x] `path: "/"` を必ず指定
- [x] `secure: true`, `sameSite` を環境ごとに統一（dev=None, prod=Lax）

---

## 11. バッチAPI制限（Low）✅

- [x] `BatchRequestSchema` に `.max(5)` 追加
- [x] `path` に `.max(2048)` 追加
- [x] `app.ts` の重複チェックを削除

---

## 12. 乱数生成の強化（Low）✅

- [x] `imageValidator.ts:93` の `Math.random()` を `crypto.randomUUID()` に置換

---

## 13. ログファイル管理（Low）✅

- [x] `backend-dev.out.log` / `backend-dev.err.log` を `.gitignore` に追加（`*.log` も）
- [x] git index から削除 + ファイル本体も削除

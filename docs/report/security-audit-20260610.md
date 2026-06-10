# セキュリティ監査レポート（包括）
> 実施日: 2026-06-10

## 対象範囲
- バックエンド: `apps/backend`（feature / feature-sync / middleware / query / lib / api）
- フロントエンド: `apps/frontend` / `apps/admin-frontend`
- モバイル: `apps/mobile`
- 共有パッケージ: `packages/auth-client` / `packages/frontend-shared` / `packages/sync-engine` / `packages/domain`
- インフラ・CI: `wrangler.toml` / `.github/workflows/*` / `apps/tail-worker` / `scripts/`
- 依存関係: `pnpm audit --prod`

## 実施方式
5レーンの並列セキュリティレビュー（認証・セッション / 認可・入力検証 / Webhook・外部連携 / フロント・モバイル / インフラ・CI）の結果を統合し、重大度の高い指摘は親レーンで実コードに対して裏取り・再評価した。

## 結果サマリ
- Critical: **0件**
- High: **2件**
- Medium: **9件**
- Low: **7件**
- Informational: **5件**

エージェントが当初 Critical とした `goalQueryService` の IDOR 疑いは、裏取りの結果「現状悪用経路なし（多層防御の欠如）」と判定し Medium に降格した（詳細は M-1）。

---

## High

### [H-1] stg 環境でスタックトレースが HTTP レスポンスに露出する
- `apps/backend/lib/honoWithErrorHandling.ts:47`
- `stack: c.env.NODE_ENV !== "production" ? err.stack : undefined` のため、`NODE_ENV = "stg"` の外部アクセス可能な環境で未ハンドル例外のスタックトレース（内部ファイルパス・モジュール構造）がレスポンス body に含まれる。`config.ts` では stg をプロダクション相当として扱っており、条件が不整合。
- 3レーン（認証 / Webhook / インフラ）が独立に同一指摘をした再現性の高い問題。

**推奨対応**: `stack` を返すのは `NODE_ENV === "development" || NODE_ENV === "test"` のみに限定する。

### [H-2] ログインエラーメッセージによるユーザー列挙 + アカウント種別漏洩
- `apps/backend/feature/auth/authLoginUsecase.ts:27-30`
- OAuth 専用ユーザー（`password === null`）に対しては `"invalid credentials - password cannot be null for standard login"` が 401 レスポンスにそのまま返る。存在しない ID / パスワード不一致の場合は `"invalid credentials"` のため、レスポンス差分から「そのログイン ID が存在し、かつ OAuth 連携アカウントである」ことが判別できる。

**推奨対応**: クライアントへのメッセージは全ケース `"invalid credentials"` に統一し、内部区別はサーバーログにのみ記録する。

---

## Medium

### [M-1] goalQueryService の activityLogs 集計に userId フィルタがない（多層防御の欠如）
- `apps/backend/query/goalQueryService.ts:58-73`
- `getGoalStats` の日次集計クエリが `activityId` のみで絞り込み、`eq(activityLogs.userId, userId)` を含まない。
- **裏取り結果**: goal の activityId は REST 作成時（`goalWriteUsecase.ts:32-35`）と sync 経路（`goalSyncWriteUsecase.ts:17-28`）の双方で所有権検証され、update では activityId を変更できないため、**現状は他ユーザーのログが混入する経路はない**。ただし将来 activity 共有等の機能が入った瞬間に情報漏洩経路になるため、1行の追加で塞いでおくべき。

**推奨対応**: where 句に `eq(activityLogs.userId, userId)` を追加する。

### [M-2] drizzle-orm 0.44.7 が SQL インジェクション advisory の対象バージョン
- root `package.json:75`（`pnpm.overrides` で `^0.44.7` 固定）/ `apps/backend/package.json:15`
- `pnpm audit`: drizzle-orm < 0.45.2 に「SQL injection via improperly escaped SQL identifiers」。脆弱パスは `sql.identifier()` にユーザー入力を渡す場合に限られ、現コードは固定文字列（`excluded.*` 等）のみのため直接の悪用は不可。ただしパッチ対象バージョンに留まり続けるのはリスク。

**推奨対応**: `pnpm.overrides` を `^0.45.2` 以上へ引き上げ（overrides 固定のため `pnpm update` だけでは上がらない点に注意）。

### [M-3] AI 解析結果の date / quantity に上限検証がない
- `apps/backend/feature/aiActivityLog/aiActivityLogGatewayImpl.ts:15-16` / `packages/domain/activityLog/activityLogValidation.ts:13`
- LLM が返す `date` は過去10年超のみ拒否で未来日付は無制限、`quantity` は負数拒否のみで上限なし。speechText 経由のプロンプトインジェクションで `2999-12-31` や `Number.MAX_SAFE_INTEGER` 級の値が DB に書き込める。

**推奨対応**: `validateActivityLogDate` に未来側上限（例: +1日〜+7日）、`ParsedActivityLogSchema` に `quantity` の上限（例: `.max(100000)`）を追加する。

### [M-4] AI エンドポイントにユーザー単位レートリミットがない（コスト悪用）
- `apps/backend/api/v1/aiActivityLogs.ts`（`/users/ai/activity-logs`）
- `premiumMiddleware` はあるが回数制限がなく、premium ユーザー1人が OpenRouter API コストを無制限に発生させられる。

**推奨対応**: `rateLimitConfigs.ts` にユーザー ID ベースの制限（例: 10回/分）を追加して適用する。

### [M-5] 管理者トークンを sessionStorage に保存
- `apps/admin-frontend/src/hooks/useAdminAuth.ts:45-47`
- 一般ユーザー側はアクセストークンをメモリ保持（`tokenHolder.ts`）なのに対し、admin JWT のみ sessionStorage 保存で XSS 時に窃取可能。

**推奨対応**: メモリ保持に統一する（リロード時再ログインのトレードオフは管理画面として許容すべき）。

### [M-6] リフレッシュトークンの平文部分が UUID v7 由来でエントロピー不足
- `apps/backend/feature/auth/authTokenUtils.ts:35-36`
- UUID v7 は上位48bitがタイムスタンプのため実効エントロピーは約74bit。selector + ハッシュ照合の構造上単独での攻撃は困難だが、長期クレデンシャルとしては CSPRNG フル乱数が望ましい。

**推奨対応**: `plainRefreshToken` を `crypto.getRandomValues` ベースの生成に変更（selector は v7 のままで可）。

### [M-7] deploy.yml で ADMIN_ALLOWED_EMAILS に公開連絡先変数を流用
- `.github/workflows/deploy.yml:237,282`
- admin アクセス許可リストに `vars.VITE_CONTACT_EMAIL`（公開連絡先）をマッピングしている。現状実害はないが、変数の意図がずれており、将来の変数分離時に管理者アクセスが意図せず変わるリスク。

**推奨対応**: 専用 secret（`ADMIN_ALLOWED_EMAILS_STG` / `_PROD`）に分離する。

### [M-8] Webhook シークレットが CI の `wrangler secret put` に含まれない
- `.github/workflows/deploy.yml`（secret put ブロック全体）
- `POLAR_WEBHOOK_SECRET` / `REVENUECAT_WEBHOOK_AUTH_KEY` が deploy フローで投入されない。`config.ts` で optional のため未設定でも起動し、新規環境では webhook が 500 で機能停止する（署名検証なしで処理が通ることはないため漏洩リスクではなく可用性・運用リスク）。

**推奨対応**: deploy.yml の secret put に両キーを追加する。

### [M-9] rich text エディタの postMessage targetOrigin `"*"` + setHtml の未サニタイズ innerHTML
- `apps/frontend/src/components/notes/NoteRichTextEditor.tsx:87,113` / `packages/frontend-shared/utils/noteRichText.ts:1264` / `apps/mobile/src/components/notes/NoteRichTextEditor.tsx:141`（`originWhitelist={["*"]}`）
- iframe/WebView へ `postMessage(…, "*")` で送信し、エディタ側 `setHtml` はサニタイズなしで `innerHTML` に展開する。iframe は `sandbox="allow-scripts"`（`allow-same-origin` なし）のため親フレームへのアクセスは封じられており実害は限定的だが、サニタイズ済み経路の保証が呼び出し側の規約頼みになっている。

**推奨対応**: targetOrigin の明示、`setHtml` 内部でのサニタイズ、モバイル `originWhitelist` の限定 + `onShouldStartLoadWithRequest` での外部 URL 遮断。

---

## Low

### [L-1] repository 層の UPDATE に userId スコープがない（多層防御）
- `apps/backend/feature/activity/activityWriteRepository.ts:59-99` / `apps/backend/feature/activityLog/activityLogMutationRepository.ts:34-53`
- usecase 層で `getXByIdAndUserId` による所有権確認後に呼ばれるため現状悪用不可だが、repository 単体では素の UPDATE。WHERE に userId を含める防御的修正を推奨。

### [L-2] admin `/client-errors/:platform` の path param 未検証
- `apps/backend/feature/admin/adminRoute.ts:103-106`
- provider 内部の allowlist で防御されているが、route 層で `z.enum(["web", "ios", "android"])` を適用すべき。

### [L-3] timingSafeEqual が長さ不一致で早期リターン
- `apps/backend/lib/timingSafeEqual.ts:9`（RevenueCat Bearer 検証で使用）
- シークレット長が推測可能。実害は限定的だが、固定長 HMAC 比較への変更か運用での固定長規定を推奨。

### [L-4] infra.yml の Action がコミット SHA 固定されていない（**前回 2026-04-27 監査の指摘が未対応**）
- `.github/workflows/infra.yml:74,132,203`（`hashicorp/setup-terraform@v3.1.2` / `actions/github-script@v7.0.1`）
- Terraform はインフラ操作権限を持つためサプライチェーン影響が大きい。pr.yml / deploy.yml は対応済みで一貫性も欠く。

### [L-5] ログアウト時に localStorage のタイマー状態が残存
- `apps/frontend/src/hooks/useTimer.ts:10-43` / `apps/frontend/src/auth/authController.ts:35-37`
- `clearLocalData` が `timer_act-<activityId>` キーを消去しない。共有 PC で次のユーザーに活動情報が見える。

### [L-6] モバイル Web ビルドでリフレッシュトークンを localStorage 保存
- `apps/mobile/src/auth/refreshTokenStorage.ts:9`
- `Platform.OS === "web"` 時に SecureStore の代わりに localStorage を使用。Web ビルドを本番配布しないなら明文化、するなら httpOnly cookie 方式へ。

### [L-7] R2 プロキシ（`/r2/*`）が未認証公開
- `apps/backend/app.ts:118` / `apps/backend/feature/r2proxy/`
- アイコン画像はキーパターン制限・トラバーサル対策・Content-Type 検証済みだが、URL を知る第三者は認証なしで取得可能。公開 CDN として意図的なら現状維持で可（その場合この項は Info 扱い）。

---

## Informational

- **[I-1]** レートリミットが固定ウィンドウ方式で境界バーストを最大2倍許容（`middleware/rateLimitMiddleware.ts:49-57`）。ログイン 5回/15分の現設定では実用上十分。
- **[I-2]** 開発環境で `SameSite=None` + `Secure: true` の組み合わせ（`feature/auth/authRouteContext.ts:21`）。localhost HTTP では cookie が送信されず本番と挙動が乖離しうる。
- **[I-3]** dev seed スクリプトの固定パスワード `password123`（`scripts/seedDevData.ts:16,25` / `scripts/mobile-e2e-server.ts:145`）。本番 DB への誤実行ガード（NODE_ENV チェック）の追加を検討。
- **[I-4]** `/admin/auth/dev-login` / `devRoute` は NODE_ENV ガード + Origin/Host 二重チェックで保護されているが、本番バンドルに含まれる。ビルドレベルでの除外が理想。
- **[I-5]** Polar webhook の `sub.metadata.userId` は Polar を信頼境界として受け入れている（署名検証が先行するため許容範囲）。

---

## 問題なしと確認した主要項目

| 領域 | 確認結果 |
|---|---|
| パスワードハッシュ | bcryptjs（saltRounds=10）、比較は定数時間 |
| JWT | HS256 明示固定（alg:none 不可）、aud 検証あり、アクセストークン60分 |
| リフレッシュトークン | SHA-256 ハッシュ化保存、selector/token 分離、CAS によるローテーション + grace window |
| Cookie | HttpOnly / Secure / SameSite=Lax（本番）/ Path 設定済み。アクセストークンは Bearer ヘッダのみで CSRF リスク限定 |
| IDOR（activity / activityLog / goal / task / note / freezePeriod / apiKey） | usecase 層で `getXByIdAndUserId` パターンを一貫適用、repository クエリも userId スコープあり（M-1 / L-1 を除く） |
| sync エンドポイント | userId はサーバー側で強制付与、`setWhere` に userId 含み他ユーザーレコードを上書き不可 |
| SQL インジェクション | Drizzle のパラメータ化クエリのみ。`sql` 生文は固定識別子のみ |
| Webhook | Polar: raw body → HMAC 検証 → parse の正順、タイムスタンプ 300 秒、timing-safe。RevenueCat: timingSafeEqual。両者 webhookId による冪等性 + onConflictDoNothing |
| API キー | crypto.getRandomValues 20バイト、SHA-256 ハッシュ保存、削除は userId スコープ付き |
| サブスクリプション | plan/status は webhook 側のサーバー決定値のみ。クライアントから plan を設定できる経路なし。checkout successUrl の origin 検証あり |
| R2 アップロード | base64 5MB 上限、magic bytes 検証、寸法 4096px 上限、mime allowlist |
| XSS | `dangerouslySetInnerHTML` 不使用、Markdown は rehype-sanitize 経由（M-9 の経路を除く） |
| トークン保存 | Web: アクセストークンはメモリ、リフレッシュは httpOnly cookie。Mobile: SecureStore（L-6 の web ターゲットを除く） |
| クライアントバンドル | VITE_* / EXPO_PUBLIC_* に秘密値の混入なし |
| シークレット管理 | wrangler.toml / git 管理下 .env に平文シークレットなし、CI は secrets 経由 |
| CORS | APP_URL allowlist 方式、credentials 併用は適切 |
| セキュリティヘッダ | backend に secureHeaders() 適用済み |
| tail-worker | path/method/status/error のみで PII なし |
| CI | pull_request_target 誤用なし、pr.yml / deploy.yml は SHA 固定済み（L-4 の infra.yml を除く） |
| レートリミット | login 5/15分、token 10/分、register 5/時、contact 2/24h、KV 不在時は本番 fail-close |

---

## 推奨対応順序

1. **H-1**（stg スタックトレース）— 1行修正、即時
2. **H-2**（ユーザー列挙）— メッセージ統一、即時
3. **M-1 / L-1 / L-2** — 多層防御の1行系修正をまとめて
4. **M-2**（drizzle-orm 更新）— overrides 引き上げ + 回帰テスト
5. **M-3 / M-4**（AI 入力上限・レートリミット）
6. **M-7 / M-8 / L-4**（CI・デプロイ設定の整理）
7. **M-5 / M-6 / M-9 / L-3 / L-5 / L-6 / L-7** — 計画的に対応

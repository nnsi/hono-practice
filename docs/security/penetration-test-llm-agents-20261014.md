# ペネトレーションテストレポート（LLMマルチエージェント自動実行）

> 実施日: 2026-10-14
> 実施方式: ブラックボックス（`http://localhost:2460` のみを初期情報として LLM エージェントが自律探索）
> 実行ツール: ScopeWeaver v0.3.1（ARTEX 派生の LLM マルチエージェント自律ペネトレーションテストシステム）

## 1. 目的と結論

### 目的

`http://localhost:2460` のみを情報源として、LLM エージェント（Planner + Worker 3並行）に攻撃面の列挙から脆弱性の検証までを自律実行させ、ブラックボックス前提で到達できる脆弱性を洗い出す。手動テスト（2026-10-09 実施分）との差分・網羅性の確認も目的とする。

### 結論サマリ

| 観点 | 結果 |
|---|---|
| 検出脆弱性 | **18件**（Critical 1 / High 2 / Medium 6 / Low 9） |
| 最重要 | **認証情報ゼロで管理者セッションを発行できる `POST /admin/auth/dev-login` バックドア（Critical）** |
| 手動テスト(10/09)との差分 | 手動では検出できなかった開発環境固有のバックドア・権限昇格を含む多数の新規発見 |
| 侵害の実証 | 管理者として全ユーザー(21名)の PII 参照、任意ユーザーの premium 化を実地確認 |

手動テストが「本番相当の堅牢な部分」を検証していたのに対し、エージェントは**開発環境に残存する dev-only のバックドアと、Vite dev server の設定起因の情報開示**を体系的に掘り起こした。両者は補完関係にある。

## 2. スコープと環境

- 初期情報: `http://localhost:2460` のみ
- エージェントが偵察で発見・スコープ拡張した要素:
  - `http://localhost:2460` … フロントエンド（Vite dev server / React SPA「Actiko」）
  - `http://localhost:3456` … バックエンド API（Hono）。配信 JS 内のデフォルト API URL から発見
  - `http://localhost:2462` … 管理画面フロントエンド（もう1つの Vite dev server）。`/@fs/` で読んだ vite.config.ts / ポート走査から発見
- 実行設定: 1時間のタイムアウト、Worker 3並行、23個のインテントを実行
- ツール側のエビデンスは ScopeWeaver のタスク #1（`http://localhost:8787`）に実行過程・トラフィックとともに保存

### 攻撃手法の特徴（手動テストとの違い）

- 配信 JS の解析に加え、**Vite dev server の `/@fs/` によるモノレポ全体のファイル読み取り**を情報収集経路として活用（ソースコード参照は「ブラックボックス」の外側だが、HTTP 経由で誰でも読める状態そのものが脆弱性 H-1）
- 開発/本番で有効になるルート（`/admin/auth/dev-login`, `/dev/subscription/plan`）の存在をソースと実地の両面から確認
- 検出した脆弱性を**他の脆弱性の検証に再利用**（例: 管理者バックドアでセッションを mint し、それを権限昇格検証のセットアップに使用）

## 3. 発見事項（重要度順）

### C-1: 認証情報ゼロで管理者セッションを発行できるバックドア `POST /admin/auth/dev-login`（Critical）

- `POST /admin/auth/dev-login`（バックエンド `:3456`）は**認証情報なし**で `dev@localhost` の DB バックの `admin_session` クッキーを発行する。ローカル Host ヘッダのみで成立（Origin ヘッダーなしでも可、プライベート LAN IP も「ローカル」扱い）。
- 取得したセッションで `GET /admin/users`（全21ユーザーのメール・名前）、`GET /admin/users/:id`（サブスク契約データ全文）、`GET /admin/contacts`（問い合わせフォームの PII: メール、本文、IP アドレス）、`PUT /admin/users/:id/subscription`（任意ユーザーのプラン書き換え）がすべて無認証と同等に利用可能。
- クッキー属性自体は堅牢（HttpOnly, SameSite=Lax, Path=/admin, 1h）で logout も DB セッションを失効させるが、**1リクエストで再発行できるため実質的に恒久的なバックドア**。
- 再現: `curl -X POST http://localhost:3456/admin/auth/dev-login -H "Origin: http://localhost:2460"` → 200 + Set-Cookie
- 対応案: 本番ビルドから dev-login ルートを除去（`NODE_ENV` 分岐の確認）、または最低限プライベート IP 以外からの Origin を拒否。**本番にこのルートが存在すれば全ユーザー PII が無認証露出する。**

### H-1: Vite 開発サーバーがモノレポ全体を無認証公開（`/@fs/` 任意ファイル読み取り、host: true）（High）

- `:2460` の Vite dev server（v8.1.2）は `fs.allow` がモノレポ全体（`/Users/yue/workspace/hono-practice`）を許可しており、`/@fs/Users/yue/workspace/hono-practice/apps/backend/server.node.ts` のような URL で**バックエンドのソース・設定を含む全ファイルを無認証で読める**。
- `/.env` や `.git` は fs.deny で 403 になる（陽性対照で確認済み）が、seed スクリプト・README・docker-compose.yml 経由で実効性のあるクレデンシャルが漏れる（M-3, M-4 へ連鎖）。
- 未圧縮ソース + インライン source map の配信、`/@vite/client` / `@react-refresh` の露出、`server.host: true`（全インターフェースバインド）も同根。
- 対応案: 開発サーバーを外部に晒さない（host: 'localhost'）、`fs.allow` を `apps/actiko-frontend` 配下に限定。本番は build 产物のみ配信するため影響は開発環境に限られるが、**LAN 内の同僚でも全ソースを読める状態**は情報漏洩経路。

### H-2: 無認証で任意ユーザーを premium 化できる `POST /dev/subscription/plan`（High）

- `POST /dev/subscription/plan`（バックエンド `:3456`）は**クッキー・トークンなし**（ローカル Host ヘッダのみ）で任意ユーザーのサブスクリプションを premium に書き換えられる。
- 専用テストアカウント（`i36_devplan@example.com`）で実証: 無認証リクエスト1発で free → premium（`canUseApiKey: true`）となり、premium 専用の `POST /users/api-keys`（201, API キー発行）が解錠された。
- ルートは dev/test にのみ存在（本番では 404）。ただし「ローカル」にプライベート LAN IP を含むため、**LAN 内の誰でも自分や他人を premium 化できる**。
- 対応案: 本番ビルドからの確実な除去、またはマイグレーションでの dev ルート分離。C-1 と同じく本番混入時の影響が大きい。

### M-1: レートリミットが設定済みなのに実効無効（`REDIS_URL` 未設定でサイレント無効）（Medium）

- 6種のリミッター（login 5/15min, token 10/min, register 5/h, contact 2/24h, client-errors 30/min, webhook 300/min）が実装・配線済みだが、`REDIS_URL` 未設定だと Redis ストアが作成されず `applyRateLimit()` が fail-open（`next()` を呼ぶだけ）。
- 実証: 同一メールからの `/contact` 3連続投稿がすべて 201（制限 2/24h の 150%）、`taro@example.com` への誤パスワード7連続がすべて 401 で 429 なし・`X-RateLimit-*` ヘッダーなし。
- 手動テスト(10/09)の M-1（レートリミットなし）と同根だが、**「設定はあるのに効いていない」という実装・設定ギャップ**としての性質が判明。本番は store 欠落時 503 fail-closed なので開発環境固有。
- 対応案: 開発でも `REDIS_URL` を設定（docker-compose に redis あり）、または fail-open 時の起動ログを WARN に昇格。

### M-2: 管理画面フロントエンド `:2462` も同じ設定問題を共有（Medium）

- 3つ目の生きた Vite dev server（`host: true`, port 2462）が、`:2460` と同じ問題（セキュリティヘッダー不在、未圧縮ソース配信、`/@fs/` でモノレポ全体読み取り）を抱える。admin 側 package.json・backend package.json が読めることを実証。
- H-1 と同じ対応（host の限定、fs.allow の縮小）を管理画面にも適用すること。

### M-3: seed/E2E クレデンシャルとテスト個人情報がソース経由で読み取り可能（Medium）

- `scripts/seedDevData.ts` / `scripts/seed/seedE2EUser.ts`（`/@fs/` で読み取り）にハードコードされた dev パスワード `password123`（bcrypt ハッシュ化されて seed）と、seed ユーザー4名（taro/hanako/demo/e2e@example.com）の実名・メールアドレス、Stripe テストサブスク ID が含まれる。
- `pnpm db-seed` 済みの開発 DB ではこれらは**バックエンドへの実効ログイン情報**（M-4 で実証）。

### M-4: seed ユーザーのパスワードとローカル PostgreSQL/Redis クレデンシャルの露出（Medium）

- README.md（`/@fs/` 経由）に seed アカウント4名（`password123`）の記載があり、`POST /auth/login` で実効ログインを確認。docker-compose.yml からローカル PostgreSQL（postgres:postgres, port 5435）とパスワードなし Redis（6379）も判明。
- H-1 のファイル読み取りが**具体的な認証・インフラ妥協パス**に連鎖することを示す実証。`.env`（JWT_SECRET 等）自体は fs.deny で 403。

### M-5: Vite dev server の 500 エラーでスタックトレースと絶対パス露出（Medium）

- `/@fs/` パスに null バイト等の不正値を含めると、500 HTML に Node.js の生エラーとフルスタックトレース（絶対パス `/Users/yue/workspace/hono-practice/...`、Vite 8.1.2、依存構成）が含まれる。
- 対応案: dev 専用のため本番影響なし。開発中の情報漏洩（パス・バージョン特定）として認識。

### M-6: SPA レスポンスにセキュリティヘッダー不在（Medium）

- `:2460` の全レスポンス（HTML・JS モジュール）に CSP、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy` がない。クリックジャッキング、MIME スニッフィング、リファラ漏洩、XSS 軽減の弱体化。
- 対照的にバックエンド `:3456` はヘッダー完備（10/09 手動テスト R-3 と整合）。**dev server 経由の配信に本番用ヘッダー付与がない**ことが差分。
- 対応案: dev server 前面に本番同等のヘッダーを付けるプロキシ、または dev でも `server.headers` で設定。

### L-1: `POST /auth/token` の CSRF（Low）

- 唯一クッキーのみで認証される状態変更エンドポイントで、Origin/Referer 検査なし、`X-Refresh-Operation` カスタムヘッダーが任意、ボディ検証なし（フォーム送信可能）。`refresh_token` クッキーが SameSite=None のため、被害者の閲覧ページから**サイレントに refresh-token ローテーションを強制し、新規アクセス JWT を mint 可能**（外部 Origin `http://attacker.example`・Origin なしの両方で 200 を実証）。
- 対応案: Origin 検査の追加、または当該ルートのみ `SameSite=Lax` 運用。

### L-2: アクティビティアイコンの MIME 検証不整合（Low）

- アップロード（`POST /users/activities/:id/icon`）の magic-byte 検証が GIF89a を追加受け入れ、mimeType `image/png` と宣言した GIF が 200 で受理。保存は `public/uploads/icons/<userId>/<activityId>_..._.webp`、配信は `data:image/webp` で実体は GIF バイト。宣言・保存・配信の内容型がすべて不一致。
- 対応案: magic-byte 検証と Zod enum の一致、配信時の内容型再検証。

### L-3: 未設定の外部サービスキーがエラーメッセージで露出（Low）

- `POST /users/ai/activity-logs/from-speech`（premium JWT 必須）→ 500 `OPENROUTER_API_KEY is not configured`、`POST /users/subscription/checkout`（JWT 必須）→ 503 `Polar checkout is not configured`。認証済みユーザーに OpenRouter/Polar 統合の存在と未設定状態が伝わる。
- 対応案: エラーメッセージの一般化（"AI feature is not available" 等）。

### L-4: `GET /admin/contacts/:id` の 500 エラーで SQL・パラメータ・スタックトレース流出（Low）

- 非 UUID の `:id` で 500。本文に Drizzle の SQL 文、バインドパラメータ、フルスタックトレース（絶対パス、`contactRepository.ts:73` 等のモジュール構成、drizzle-orm 0.45.2 / hono 4.12.27）。PostgreSQL uuid 列への非 UUID が unhandled で漏洩。
- 対応案: `:id` の Zod UUID 検証、グローバルエラーハンドラーでの 500 本体一般化。

### L-5: logout 後もアクセス JWT が最長15分有効（Low）

- `POST /auth/logout` は refresh クッキー系のみ失効。発行済み HS256 アクセス JWT（900s、jti なし、サーバー側ブラックリストなし）は logout 後も有効で、`GET /users/tasks` が 200 を返すことを実証（taro@example.com で生検証、X-Refresh-Token モバイル経路も同様）。
- 対応案: jti + 失効リスト、またはアクセストークン短命化とトレードオフ検討。

### L-6: 無認証 `GET /r2/icons/:name` が 500 で内部設定状態を開示（Low）

- 認証なしで 500 `R2 bucket not configured`（平文）。R2 プロキシの存在と `R2_BUCKET` binding 未設定（構成ミス状態）が匿名者に伝わる。スタックトレースなし。
- 対応案: 未設定時は 404/503 に一般化、起動時の binding 検証。

### L-7: ZodError 400 応答で内部スキーマ・検証規則・分類が露出（Low）

- `/auth/login`, `/user`, `/contact`, `/client-errors`, `/dev/subscription/plan` の 400 に生の validation-issues 配列（フィールド名・型、パスワード最小8、consents のリテラル要件、enum 値、client-error 分類学、`auth_diagnostic` リテラルまで）。
- 対応案: 10/09 手動テスト L-3 と同根。本番はメッセージ ID 形式へ一般化。

### L-8: 配信 SPA ソースに内部/本番 API URL が露出（Low）

- `/src/api/apiClient.ts` 等のフォールバック `http://localhost:3456`、`ApiReferencePage.tsx` の本番 `https://api.actiko.app/api/v1` が無認証で読める。内部構成と本番 API オリジンの開示。
- 対応案: 環境変数への集約（ビルド時注入）。

### L-9: Vite HMR WebSocket トークンが `/@vite/client` に平文で露出（Low）

- `const wsToken = "…"` が無認証で読め、`ws://localhost:2460/?token=...` の認証付き HMR WebSocket を第三者が開ける（cross-origin hijacking 防止の部分的無効化）。dev 専用。

## 4. 手動テスト(2026-10-09)との比較

| 項目 | 手動(10/09) | エージェント(10/14) |
|---|---|---|
| 重点 | 本番相当の認証・認可・インジェクション堅牢性 | 開発環境固有のバックドア・設定起因の露出 |
| Critical/High | 0件 | 3件（dev-login バックドア、dev plan 昇格、Vite 公開） |
| 到達手段 | 手動 curl + 実ブラウザ | `/@fs/` ソース読み + 実リクエスト検証の組合せ |
| レートリミット | 「ない」（M-1）| **実装はあるが REDIS_URL 未設定で無効**（M-1'） |
| 網羅 | 主要攻撃経路を深く検証 | 広く浅く、開発環境の全露出面を走査 |

両者を併用することで「本番で効く防御の確認」と「開発環境に残る穴の洗い出し」の両面が揃う。エージェントの発見のうち C-1/H-2（dev-only ルート）と H-1（Vite 設定）は、**本番デプロイ時に混入しないためのビルド・設定確認**を CI で担保することが実効的な対策になる。

## 5. 検証済み範囲と未検証事項

### 検証済み

- フロントエンド `:2460`・管理画面 `:2462`・バックエンド `:3456` の偵察（API サーフェス列挙、`/@fs/` 読み取り）
- 管理者バックドア（C-1）の実効と、全ユーザー PII・サブスク・問い合わせデータの参照
- 無認証 premium 昇格（H-2）の実効（API キー発行まで）
- レートリミット無効（M-1）の挙動検証
- seed クレデンシャル（M-3/M-4）の実効ログイン確認
- CSRF（L-1）、JWT 残存（L-5）、各種情報開示（L-2〜L-9）の実地検証

### 未検証・断片

- SQL インジェクション全経路の再検証（10/09 手動テストで主要パラメータは◎、今回は新規経路を重点的に未実施）
- 公開 API v1 のスコープ検証（API キー発行が H-2 経由で可能になったが、スコープ境界の検証は次回タスクで実施予定）
- 本番（Cloudflare / api.actiko.app）への影響確認（C-1/H-2 が本番ビルドに含まれるかは別途ビルド設定の確認が必要）
- トラフィックプロキシ経由のキャプチャ（ScopeWeaver の MITM プロキシは本タスクで未使用）

## 6. クリーンアップ

- 作成アカウント: `i36_devplan@example.com`（userId `01a13936-fbc1-7155-873f-2e224274b82a`、H-2 検証用、free→premium 済み）
- 同アカウントの subscription 行（admin PUT で `currentPeriodEnd: 2027-10-01` 設定済み）
- 既存アカウント `sqli_sleep_s5' OR pg_sleep(4)--`（10/09 手動テスト由来、エージェントが `/admin/users` で観測）
- dev-login 管理者セッション（クッキー、1h TTL で自然失効）

## 7. 総評

エージェントは与えられた単一 URL から出発し、フロント → バックエンド → 管理画面へとスコープを自律拡張しながら、**18件（Critical 1）**の脆弱性を1時間で検出した。最重要は `POST /admin/auth/dev-login` で、認証情報ゼロで管理者として全ユーザーの PII に到達できる経路が実証された。ただし同ルートは dev-only であり、本番ビルドに含まれないことが確認できれば実害は開発環境に限定される。

一方で、10/09 の手動テストが示した「本番相当の防御の堅牢さ」（IDOR 耐性、SQLi 不成立、JWT 検証）は本テストでも崩れていない。**両テストの合わせ技で言えるのは: 本番ロジックは堅いが、開発環境が LAN・設定ミス経由で大きく開いており、dev-only ルートの本番混入防止と Vite 設定の引き締めが次のアクション**である。

---

> 元データ: ScopeWeaver タスク #1 のエクスポート（`actiko-pentest-findings.json`、全18件のエビデンス・再現手順を含む）。本レポートは同データを重要度順に再構成したもの。

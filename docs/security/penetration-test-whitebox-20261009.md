# ペネトレーションテストレポート（ホワイトボックス）

> 実施日: 2026-10-09
> 前提: 同日実施のブラックボックステスト (`penetration-test-20261009.md`) の続き。今回はソースコード（`apps/backend` 中心）を読んだうえで、コードから導いた攻撃仮説を HTTP で実検証した。

## 1. 目的と結論

### 目的

コード理解に基づき、ブラックボックスでは到達できなかった攻撃面（API キーのスコープ検証、レースコンディション、内部エンドポイントの悪用、エラー経路の情報漏洩など）を検証し、**他ユーザーの情報・DB 全体の窃取可否**を再評価する。

### 結論サマリ

| 観点 | 結果 |
|---|---|
| 他ユーザーのデータ窃取 | **不可**（全攻撃が阻止された） |
| DB 全体の窃取 | **不可** |
| 認可バイパス（スコープ・Premium 逃れ） | **不可** |
| 新規検出 | Low 2件 / Info 3件（いずれも悪用可能性は限定的） |

ブラックボックスで未検証だった「v1 公開 API のスコープ検証」「Premium 降格後の API キー無効化」はいずれも正しく機能した。レースコンディション系では DB 一意制約によりデータ整合性は守られたが、**競合時のエラー処理が 500 + スタックトレース（dev）になる**堅牢性問題を2件検出した。

## 2. 実施方式

1. ソース読解: `apps/backend`（app.ts / middleware / feature / api/v1 / infra）、`packages/domain`、`packages/types`
2. コードから攻撃仮説を抽出（下記3章）
3. 仮説ごとに `http://localhost:3456` へ HTTP 攻撃を実行して検証
4. テストユーザーは前回作成の pentest1 / pentest2 を再利用。Premium 化が必要な検証は開発用エンドポイント `POST /dev/subscription/plan`（development 限定・localhost 限定）と開発 DB の `user_subscription.current_period_end` 更新で準備

## 3. コード読解で確認した防御設計（良い点）

| 領域 | 確認事項 |
|---|---|
| JWT | `authMiddleware` で alg 固定 HS256・`aud` 検証・ユーザー存在確認。秘密鍵は128文字（`.env`） |
| パスワード | bcrypt (cost 10) + SHA-256 レガシー互換。loginId 不存在時もダミーハッシュで bcrypt 比較しタイミング差を排除、エラー文言も統一 (`authLoginUsecase.ts`) |
| リフレッシュトークン | selector + SHA-256 ハッシュで DB 保存、ローテーション＋冪等リカバリ（operation secret）。Cookie は HttpOnly/Secure/SameSite=None |
| OAuth | Google/Apple とも `jose` の JWKS 検証（issuer/audience/maxTokenAge） |
| レートリミット | login 5/15分/IP、register 5/時間、contact 2/日、webhook 300/分。**本番 (production/stg) ではストア欠落時 fail-close (503)**、dev は fail-open（前回 M-1 の実態は「dev で REDIS_URL 未設定のため無効」で、本番では稼働する設計） |
| API キー | 生成は `crypto.getRandomValues` 20バイト（160bit）、**SHA-256 ハッシュ化して DB 保存**（DB 漏洩してもキー再利用不可）、マスク表示。利用のたびに Premium 有効性を DB 照会 |
| v1 スコープ | `V1_SCOPE_MAPPING` を単一ソースに `requireResourceScope` で GET/HEAD→read、それ以外→write を強制。ベースパス（`/activity-logs`）にもマッチすることを Hono 実機テストで確認 |
| Webhook | Polar は HMAC-SHA256 + 5分時刻許容 + `timingSafeEqual`、RevenueCat は bearer key を `timingSafeEqual` |
| Admin | Google OAuth + 許可メールリスト + Origin チェック + DB バックの失効可能セッション。dev-login は development + local Origin/Host 限定 |
| バッチ | `/batch` は GET 固定・`/users/` プレフィックス強制・`..`/`%2e` トラバーサル検査・認証は外側の JWT を `__authenticatedUserId` で引き継ぎ |
| SQL | Drizzle ORM のパラメータクエリのみ。`sql` テンプレートは固定文字列（`excluded.*` 等）のみでユーザー入力の結合なし |
| アイコンアップロード | MIME 許可リスト + マジックバイト検証 + 所有者確認 |
| エラー処理 | `honoWithErrorHandling` で 500 の stack は development/test のみ（過去監査 H-1 の是正を確認） |

## 4. 攻撃と結果の詳細

### 4.1 v1 公開 API のスコープ / 認可（前回未検証）

pentest1 を Premium 化し、スコープ `activity-logs:read` のみの API キーで検証。

| # | 攻撃 | 結果 | 判定 |
|---|---|---|---|
| W-6 | `GET /api/v1/activity-logs?date=...`（read スコープ） | 200 | ◎ |
| W-7 | `POST /api/v1/activity-logs`（read のみで書き込み） | 403 `API key does not have required scope` | ◎ |
| W-8/9 | `GET/POST /api/v1/tasks`（別リソース） | 403 | ◎ |
| W-10 | `POST /api/v1/ai/activity-logs/from-speech`（voice 不要で） | 403 | ◎ |
| W-11 | `GET /api/v1/activity-logs/stats`（ベースパス直下） | 200（read 許可）/write なら 403 | ◎ |
| W-12 | 他人の activity-log ID を `GET /api/v1/activity-logs/:id` で参照 | 404 `activity log not found`（所有者フィルタ） | ◎ |
| W-13 | **他人の activityId を指定して `POST /api/v1/activity-logs`** | 500 `internal server error` + **スタックトレース露出（dev）**。データは作られない | △ L-1 |
| W-37 | voice スコープキーで AI エンドポイント | スコープ通過、AI gateway 未設定で 500（到達は設計どおり） | ◎ |
| W-14 | Premium → free 降格後もキー使用 | 401 `Premium subscription required`（都度サブスク照会） | ◎ |

### 4.2 レースコンディション

| # | 攻撃 | 結果 | 判定 |
|---|---|---|---|
| W-21 | 同一 loginId でユーザー登録 8 並列（TOCTOU） | DB 一意制約で **重複アカウント 0件**。ただし 8 要求中 6 件が **500 + スタックトレース（dev）**（一意制約違反を未ハンドル）。1件 409、1件 200 | △ L-2 |
| W-36 | 同一 refresh token で `/auth/token` 4 並列 | 2×200 / 2×401。ローテーションはアトミックでトークン窃取なし | ◎ |

### 4.3 内部エンドポイントの悪用

| # | 攻撃 | 結果 | 判定 |
|---|---|---|---|
| W-1〜4 | `POST /dev/subscription/plan` のガード検証 | localhost Origin/Host からは任意 loginId のプラン変更可（設計どおり）。`Origin: https://evil.example` でも **Host が local なら通る**（`isLocalOrigin || isLocalHost` の OR 判定）。production/stg では 404 | i-1 |
| W-15〜20 | `/batch` で他人データ・領域外アクセス | 自分のデータのみ返却。`..`/`%2e` トラバーサル → 400。絶対 URL → 400。`/users/*` のみ。6件超 → 400 | ◎ |
| W-38 | `/batch` で二重エンコード `%252e` | バリデーションはすり抜けるが Hono ルーティング上 dot-segment 解決がないため領域外到達不可。到達できないパスを指定するとサブリクエストの 404（text/plain）を `.json()` し **誤った 400 `Invalid JSON`** | i-2 |
| W-32 | 不正 UUID をパスに注入 | 400（`createTaskId: Invalid id`）で 500 にならず | ◎ |

### 4.4 その他の検証

| # | 攻撃 | 結果 | 判定 |
|---|---|---|---|
| W-23/24 | pentest2 の goal を pentest1 が GET/PUT/DELETE | 404。owner は 200 | ◎ |
| W-31 | pentest2 の task を pentest1 が GET/PUT | 404。owner は 200 | ◎ |
| W-25 | pentest2 の note を pentest1 が `GET /users/notes/:id` | 404 | ◎ |
| W-26 | `X-Refresh-Operation` に変な値 | 400 `invalid refresh operation`（Zod 詳細は露出せず） | ◎ |
| W-27 | refresh token を `Authorization: Bearer` で /auth/token | 200（モバイル経路の設計どおり） | ◎ |
| W-28 | Origin 付き（Web）ログイン応答 | body に refreshToken なし（Cookie のみ） | ◎ |
| W-29 | checkout `successUrl` に外部オリジン | 許可オリジン検証あり（Polar 未設定のため 503 で未到達、コード上は許可リスト判定を確認） | ◎ |
| W-33 | `/client-errors` 無認証で投稿 | 204 で受理（設計どおり。本番は 30/分/IP 制限） | ◎ |
| W-34 | `/contact` 無認証で投稿 | 201（設計どおり。本番は 2/日/IP 制限） | ◎ |
| W-35 | **bcrypt 72バイト切り詰め**: 先頭72文字が同じ別パスワード（76文字×2種）で登録・ログイン | **両方のパスワードでログイン成功**（bcrypt 仕様の切り詰め。Zod 上限100文字のため73文字以上の実効強度は72バイト） | i-3 |

## 5. 発見事項（重要度順）

### L-1: 他人リソース参照時に 500 + スタックトレース（dev）で応答する経路がある（Low）

- `POST /api/v1/activity-logs`（内部 `/users/activity-logs` も同じ usecase）で、**他人の activityId** を渡すと `activity not found` が plain `Error` で throw され 500 になる（`feature/activityLog/activityLogUsecase.ts:131`）。dev/test ではレスポンスにスタックトレース（絶対パス含む）が露出する。
- データ窃取影響はないが、(a) 適切な 400/404 を返すべき箇所が 500、(b) LAN 公開 dev サーバでは内部構造が漏れる。
- 対応案: `createActivityLog` の activity 参照エラーを `ResourceNotFoundError` 等に分類。

### L-2: ユーザー登録の競合時、一意制約違反が未ハンドルで 500（Low）

- `feature/user/userUsecase.ts` は `getUserByLoginId` による事前チェック→INSERT の TOCTOU。並列登録で DB 一意制約（`user_login_id_unique`）違反が発生し、8 要求中6件が 500（dev ではスタック露出）。**重複アカウント自体は DB が防止**している。
- 対応案: INSERT 時の unique 違反をキャッチして 409 に変換。

### i-1: dev 用エンドポイントのガードがクライアント制御ヘッダのみ（Info）

- `POST /dev/subscription/plan` は development 限定で 404 になるため本番影響なし。ただし dev サーバを LAN 公開した場合、Host が `192.168.*` 等なら無条件で通過し（`isLocalHost` の OR 判定）、Origin を偽装しなくても同一 LAN 上の誰でも**任意ユーザーのプランを書き換え可能**。
- 対応案: dev サーバを信頼できないネットワークに公開しない運用ルールを明記（コード上は development 限定で十分妥当）。

### i-2: `/batch` のサブリクエストが非 JSON 応答だと誤った `Invalid JSON` 400（Info）

- 存在しない `/users/*` パスを指定すると、サブリクエストの 404（text/plain）を `await result.json()` して SyntaxError → 400 `Invalid JSON`。攻撃可否は無く誤解を招くだけ。

### i-3: bcrypt の 72 バイト切り詰めにより 73 文字以上のパスワードの実効強度が 72 バイト（Info）

- パスワード上限 100 文字に対し bcrypt 仕様で 72 バイト超は切り詰め。先頭72文字が同一なら異なるパスワードでも認証を通ることを実証（W-35）。攻撃には元パスワードの大部分を知る必要があり実害は小さい。
- 対応案: 上限を 72 バイトに揃える、または 73 バイト超を拒否。

### 前回レポートの修正

- **M-1（ログイン総当たり）を下方修正**: ログインのレートリミット（5回/15分/IP）は実装済み。ローカル dev は `REDIS_URL` 未設定のため無効化されていただけで、production/stg ではストア欠落時に fail-close (503) する設計。本番で `RATE_LIMIT_KV_NS`/Redis が正しくバインドされていることをデプロイ設定で確認すれば閉じられる。

## 6. 検証済み範囲と未検証事項

### 検証済み

- v1 公開 API のスコープ強制（read/write/voice、ベースパス含む）、Premium 降格時のキー無効化
- v1・内部 API の IDOR（activity-log / goal / task / note の ID 直参照・他ユーザー activityId 参照）
- 登録 TOCTOU レース、リフレッシュトークン並列ローテーション
- `/batch` のパス制約・トラバーサル（`..`、`%2e`、`%252e`、絶対URL）
- dev エンドポイントのガード、client-errors / contact の無認証投稿（設計どおり）
- bcrypt 切り詰め、`X-Refresh-Operation` 入力検証、モバイル/Web のトークン授受差分
- コードレビュー: webhook 署名検証、Admin 認証、OAuth 検証、API キーのハッシュ化保存、SQL 組み立て、アイコンアップロード検証、CORS 許可Origin制御

### 未検証（環境依存）

- Polar / RevenueCat webhook の実署名検証（ローカルに secret 未設定、コードレビューのみ）
- Polar checkout の実際の決済フロー（`POLAR_ACCESS_TOKEN` 未設定）
- Google / Apple ログインの実フロー（外部サービス）
- AI 音声ログの実行（`OPENROUTER_API_KEY` 未設定。スコープ到達は W-37 で確認）
- admin-frontend アプリ本体（本次は backend API が対象）
- 本番 Cloudflare 環境でのレートリミット稼働確認（デプロイ設定の確認事項）

## 7. クリーンアップ

今回のテストで追加作成したデータ（ユーザーの合意済み扱い、開発 DB）:

- pentest1: Premium 化（`user_subscription.current_period_end` を30日後に更新）、API キー3件（read-only / full / voice）
- テストアカウント: `racetest+…@example.com`、`bc72+…@example.com`（bcrypt切り詰め検証）、`bcrypt72+…@example.com`
- pentest2: activity `GOAL-ACT` + goal、task `SECRET-TASK-PENTEST2`
- `/contact` 1件、`/client-errors` 1件（無認証投稿の確認）

## 8. 総評

ホワイトボックスで読解した防御（スコープガード、都度サブスク照会、API キーのハッシュ化、レートリミットの fail-close、webhook 署名、Admin の多層ガード、タイミング耐性）はいずれも実装されており、ブラックボックスで示された堅牢性を裏付けた。新規の悪用可能な脆弱性は見つからなかった。

残る改善は堅牢性・運用面に寄るもの（L-1/L-2 のエラー分類、i-1 の dev 運用、i-3 のパスワード上限、前回 L-1/L-2/L-3）。レースコンディションで「データ整合性は DB 制約が守り、アプリ層のエラー処理が取りこぼす」というパターンが2件出たため、`createXxx` 系 usecase の参照エラー分類を一巡り見直すことを推奨する。

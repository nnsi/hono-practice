# ペネトレーションテストレポート（LLMマルチエージェント・ホワイトボックス）

> 実施日: 2026-10-14
> 前提: 同日実施の LLM エージェント・ブラックボックステスト (`penetration-test-llm-agents-20261014.md`) の続き。今回はソースコード（`/Users/yue/workspace/hono-practice` 全体）を読んだうえで、コードから導いた攻撃仮説を HTTP で実検証した。
> 実行ツール: ScopeWeaver v0.3.1（Planner + Worker 3並行、10ゴール、約55分で完了・全ゴール達成）

## 1. 目的と結論

### 目的

コード理解に基づき、これまでの3つのレポート（手動ブラックボックス 10/09・手動ホワイトボックス 10/09・エージェントブラックボックス 10/14）がカバーしなかった領域（tail-worker、admin-frontend、packages/domain のビジネスロジック、モバイル経路、webhook の再帰的処理、ファイル格納、`/batch` 書き込み系、Drizzle `sql\`\``、コード実行系、リフレッシュトークン回りのエッジ）を検証する。

### 結論サマリ

| 観点 | 結果 |
|---|---|
| 検出脆弱性（新規） | **8件**（Critical 1 / High 2 / Low 5） |
| 最重要 | **iconUrl パストラバーサルから .env を読み、漏れた JWT_SECRET で任意ユーザーのアクセストークンを偽造できるアカウント乗っ取りチェーン（Critical）** |
| 攻撃チェーン実証 | ファイル読み取り（.env/JWT_SECRET）→ JWT 偽造 → 他人アカウントでデータ参照・作成まで完全実施 |
| 前回レポートの確認 | dev-login バックドア・レートリミット無効など 10/14 BB の18件は再確認（本レポートでは再掲しない） |

攻撃チェーン（High×2 + Critical）は**モバイル/v2 同期経路が v1 のドメイン検証をバイパスしている**ことに起因し、ホワイトボックスならではの発見。手動ホワイトボックス（10/09）が「防御は堅牢」と結論したのに対し、**同期 API の iconUrl 自由記述権限がサーバー全体の機密性・完全性を壊している**。

## 2. 実施方式

1. ソース読解: `apps/backend`・`apps/frontend`・`apps/admin-frontend`・`apps/tail-worker`・`packages/domain`・`packages/types`・`apps/mobile`
2. 未検証領域を10ゴールに分解し、コードから攻撃仮説を抽出
3. 仮説ごとに `http://localhost:3456`（必要に応じ :2460/:2462）へ実リクエストで検証
4. 検出した脆弱性を他の検証に再利用（例: トラバーサルで .env を読み、得た JWT_SECRET でトークン偽造を検証）

## 3. 発見事項（重要度順）

### C-1: iconUrl トラバーサル → JWT_SECRET 漏洩 → 任意ユーザーアカウント乗っ取り（Critical）

**チェーン全体**: H-1（ファイル読み取り）で `apps/backend/.env` を読む → `JWT_SECRET`（HS256 署名鍵）を取得 → 任意の userId でアクセストークンを偽造 → そのユーザーとして全操作可能。

- 署名側: `apps/backend/feature/auth/authTokenUtils.ts:13-29` が `{userId, aud:"actiko-backend", iat, exp=iat+900s}` を HS256 で署名。検証側: `apps/backend/middleware/authMiddleware.ts:38-68` は署名検証後 `payload.userId` をそのまま信頼（jti なし・失効リストなし）。
- 実証: 漏れた秘密鍵のみで（パスワード・リフレッシュトークン不使用）`wb2_jwtvictim@example.com` と `taro@example.com` のトークンを偽造 → `GET /user/me` が各アカウントのプロフィールを 200、`GET /users/tasks` が taro の非公開タスクを返却、`POST /users/notes` が被害者として 201 でデータ作成。
- 影響: **全ユーザーのアカウント乗っ取り（データ窃取・改竄・なりすまし投稿）**。開発環境だが、本番で同等の iconUrl トラバーサル（H-1）と静的秘密鍵運用が続けば本番でも成立。
- 対応案: (1) H-1 のトラバーサル修正（iconUrl の格納時バリデーション）、(2) 秘密鍵ローテーション、(3) 長期的には `userId` 単一クレーム依存の脱却（トークン失効手段の用意）。

### H-1: iconUrl パストラバーサルによる任意ファイル読み取り（High）

- `POST /users/v2/activities/sync` は `iconUrl` を自由文字列（`z.string().max(2000)`、形状・トラバーサル検査なし）で永続化（`packages/types/sync/request/activity.ts:9-10`、`apps/backend/feature-sync/activity/activitySyncActivityRepository.ts:47-48` の COALESCE upsert）。
- dev モードの `GET /users/activities/:id` は `"/public/uploads/"` を含む iconUrl を `convertLocalUploadUrlToDataUrl`（`apps/backend/infra/storage/localUploadDataUrl.ts:36-47`）で data URL 変換するが、`path.join(process.cwd(), uploadDir, url.split("/public/uploads/")[1])` に**包含検査がない**ため `../` で `public/uploads`・リポジトリ外へ脱出可能。
- 実証: `iconUrl = ".../public/uploads/icons/../../../.env"` を sync で植え付け → `GET /users/activities/:id` の応答 iconUrl が **`apps/backend/.env` の全文（DATABASE_URL・JWT_SECRET）を base64 化した data URL**。リポジトリ外のファイル（`../../../../`×8）も読めてマーカー内容を確認。他ユーザーの格納アイコンも所有者確認なしで読めた。
- 対応案: `localUploadDataUrl.ts` の包含検査（`path.resolve` 結果が uploads 配下である確認）、iconUrl の形式バリデーション（相対パス・`..` 拒否）、所有者確認。

### H-2: DELETE アイコン経由の任意ファイル削除（High）

- `DELETE /users/activities/:id/icon` の `deleteActivityIcon`（`apps/backend/feature/activity/activityIconUsecase.ts:140-163`）は DB 格納の `activity.iconUrl` から `"/public/uploads/(.+)$"` でストレージキーを抽出し、`localStorageService.delete`（`apps/backend/infra/storage/localStorageService.ts:44-49`）が `rm(join(uploadDir, key))` を実行。**包含検査なし**のため `../` で脱出。
- iconUrl は H-1 と同じく v2 sync で攻撃者自由記述。
- 実証: トラバーサル入りの iconUrl を植え付け → `DELETE .../icon` 1リクエストで **リポジトリ外のマーカーファイルを実際に削除**（200）。存在しないファイルは 200、存在するが読み取り専用のファイルは 500 となり、**任意ファイル存在オラクル**としても動作。
- 対応案: H-1 と同じ包含検査。`rm` 前に削除対象が当該 activity の所有アイコンか照合。

### L-1: activity-log のサーバー側重複排除なし（Low）

- `POST /users/activity-logs`・`/batch`・`/users/v2/activity-logs/sync` の全書き込み経路が純 INSERT（`activityLogMutationRepository.ts`、sync は record id キーの upsert のみ）で、同一 `(date, activityId, quantity, memo)` の重複行を作る。CSV インポートの dedup キー（`packages/domain/csv/csvDedup.ts`）は**クライアント側（frontend/mobile のみ）で適用**されるため、直接 API クライアント・`/api/v1/*` API キー・古いローカル DB の sync クライアントは統計を二重計上できる。
- 対応案: サーバー側（usecase 層）での dedup、または一意制約。

### L-2: 未検証 UUID パスパラメータで 500 + スタックトレース露出（Low）

- `GET /users/goals/:id/stats`、`GET /users/goals/:goalId/freeze-periods`、`DELETE /users/api-keys/:id`、`GET /admin/contacts/:id` の4ルートが素のパスパラメータを Drizzle の UUID 比較に渡す。非 UUID で Postgres uuid キャストエラー → `honoWithErrorHandling.ts:55-64` が dev/test で `err.stack`（SQL 全文・バインドパラメータ・絶対パス）を応答。
- 対応案: `:id` の Zod UUID 検証（手動 WB 10/09 の L-4 と同根だが対象ルートが拡大）。

### L-3: ゴール統計の平均が SQL 数値 SUM の文字列連結で破壊（Low）

- `GET /users/goals/:id/stats`（`apps/backend/query/goalQueryService.ts`）が `sql<number>\`COALESCE(SUM(...), 0)\`` の結果を Number 変換せずドメイン関数（`packages/domain/goal/goalStats.ts`）へ渡し、`+` 演算が**文字列連結**になる。1日2本の quantity 3 が "03" に連結され、平均が "0303"/2 = 151.5（正しくは 3）。`dailyRecords[].quantity` も "03" のような文字列で返る。極端な値では average/max が null (NaN) 化。
- 対応案: SUM 結果の `Number()` 変換、またはドメイン層での型強制。

### L-4: v2 sync が v1 のドメイン検証をバイパス（Low）

- `POST /users/v2/activity-logs/sync` は `quantity` に max なし、`date` に範囲検査なしで、**10年以上過去・遠未来の日付・999999 超の数量**を受理（v1 `POST /users/activity-logs` は 400 で拒否）。未来日ログで連続日数（streak）が実際に水増しされることを確認。`task-schedules` sync は `.max(999999)` を持つのに activity-logs は持たない、というスキーマ間不整合。
- 対応案: `validateActivityLogDate`（ドメイン）の sync 経路への適用、`quantity` max の統一。

### L-5: sync リクエスト内重複 ID で 500（7/8 エンドポイント）（Low）

- `POST /users/v2/{activities,activity-logs,goals,notes,tasks,goal-freeze-periods}/sync` は同一 record id を2回含むリクエストで Postgres `ON CONFLICT DO UPDATE cannot affect row a second time` により **500（バッチ全体ロールバック）**。`taskSchedule` のみ `.refine` の重複チェックを持つ。オフラインの2端末分マージやリプレイで sync が完了不能になる。
- 対応案: 各 sync スキーマへの重複 id refine 追加（task-schedule と同じパターン）。

## 4. 攻撃チェーン図（最重要）

```
[v2 activities sync で iconUrl にトラバーサル注入]  (H-1)
        ↓ 同期は z.string() のみで自由記述
[GET /users/activities/:id が .env を data URL で返す]  (H-1)
        ↓ base64 デコード
[JWT_SECRET / DATABASE_URL 入手]
        ↓ 秘密鍵で HS256 署名
[任意 userId のアクセストークン偽造]  (C-1)
        ↓ authMiddleware は署名+aud のみ検証
[被害ユーザーとして全 API 操作可能（データ窃取・作成）]
```

派生: 同じ iconUrl 植え付けから `DELETE .../icon` で**任意ファイル削除**（H-2）も可能。

## 5. 検証済み範囲と未検証事項

### 検証済み（10ゴールすべて達成）

- **tail-worker**: トリガー・キュー処理・呼び出しルートの認証を確認（admin-frontend と合わせて目立った問題は L-5 系の sync エラー処理のみ。tail-worker 由来の新規 Critical/High なし）
- **admin-frontend**: コードパス・セッション処理を確認（admin API の誤用経路なし。実運用の問題は 10/14 BB の :2462 関連と同じ設定系）
- **packages/domain**: streak/points/統計計算（L-3）、sync 競合解決（L-5）、activity-log 重複（L-1）、日付・数量検証（L-4）を実検証
- **モバイル経路**: X-Refresh-Token ヘッダーフローを含むリフレッシュローテーションのエッジケース（並行利用・logout→refresh 競合・cookie とヘッダー混在）— 実害は確認されず（手動 WB 10/09 の評価を補強）
- **webhook**: 署名検証以降の再帰的処理（idempotency・リプレイ・プランマッピング）— コード確認＋可能な範囲で実検証、新規問題なし
- **ファイル格納**: icon アップロード・格納・配信のエッジケース（H-1/H-2、SVG 埋め込みは v1 MIME 検証でカバー）
- **/batch**: POST/DELETE サブリクエスト — 権限昇格・領域外到達なし（手動 WB 10/09 の評価を補強）
- **Drizzle sql\`\`**: ユーザー入力が到達する `sql` テンプレートをコード全体で検索し、注入は全箇所パラメータ化で防止を確認
- **eval/Function/child_process/shell**: バックエンドで該当使用なし
- **JWT 偽造耐性**: 署名鍵が漏れない前提では強固（手動 10/09 と整合）。ただし C-1 で**鍵漏洩経路**を実証

### 未検証・断片

- Polar/RevenueCat webhook の実署名・実イベント検証（ローカルに secret 未設定、コードレビュー中心）
- tail-worker の Cloudflare Queues 実環境での挙動（ローカルは直接 DB 参照）
- H-1/H-2 の本番（Workers/R2）での成立可否 — 本番の storage service が R2 の場合はパス解決が異なるため、dev 限定の可能性が高い。要デプロイ構成確認
- C-1 の本番成立は H-1 次第。本番で `.env` 相当のファイルが読めなければ成立しない

## 6. クリーンアップ

- 作成アカウント: `wb2_jwtvictim@example.com`（C-1 検証用、userId `01a139e4-40b5-7174-9f37-7e3d5c51de0f`）
- taro@example.com の activity `01a139d7-61f0-7720-a53b-4b81eaa859b7`（H-1/H-2 検証用に iconUrl を植え付け。複数回書き換え・最後に通常 icon へ戻す操作を実施した可能性あり、不要なら削除）
- 検証で作成した activity-log・note 一式（wb2_/taro 由来の重複ログ・未来日ログを含む）
- 削除を検証したマーカーファイルは sw-run 配下（テスト用に作成したものなので影響なし）

## 7. 総評

ホワイトボックス観点で最も重要な発見は、**「v2 同期 API の iconUrl 自由記述 → サーバー側パス包含検査の欠落」という2つの小さな穴が合わさり、.env 経由の JWT_SECRET 漏洩 → 任意ユーザー乗っ取りという Critical チェーンになる**こと（C-1）。個々の部品（JWT 署名検証、ドメイン検証、アップロード MIME 検査）はそれぞれ堅牢だが、**sync 経路だけ v1 の検証層をバイパスしている**点（L-4 も同根）が全体の弱点だった。

対応優先度:
1. **H-1/H-2 のパス包含検査**（`localUploadDataUrl.ts`・`localStorageService.ts`）— C-1 を根絶
2. **JWT_SECRET のローテーション**（今回の検証で開発秘密鍵はエビデンスに露出）
3. sync スキーマの検証統一（L-4/L-5）
4. 統計の数値変換（L-3）と activity-log のサーバー側 dedup（L-1）

手動テスト2本＋エージェント2本の計4レポートで、手動では到達しなかった「同期 API とドメイン層の不整合」をエージェントのホワイトボックスが掘り当てた形。開発環境の露出（dev-login・Vite 系）は 10/14 BB レポート参照。

---

> 元データ: ScopeWeaver タスク #3（white-box）のエクスポート（`actiko-whitebox-findings.json`、8件のエビデンス・再現手順を含む）。タスク #3 は10ゴールすべて達成で完了（所要約55分）。

# ペネトレーションテストレポート

> 実施日: 2026-10-09
> 実施方式: ブラックボックス（ソースコード非参照・URLのみ開示という前提）

## 1. 目的と結論

### 目的

`http://localhost:2460` のみを情報源として攻撃を実施し、**他ユーザーの情報、または DB 全体の情報を窃取できるか**を検証する。

### 結論サマリ

| 観点 | 結果 |
|---|---|
| 他ユーザーのデータ窃取 | **不可**（全攻撃が阻止された） |
| DB 全体の窃取 | **不可** |
| 認証バイパス・なりすまし | **不可** |
| 見つかった脆弱性 | Medium 1件 / Low 3件 / Info 3件 |

主要なデータ窃取経路（IDOR、認証バイパス、SQL インジェクション、弱い JWT 鍵、トークン偽造）はすべて防がれていた。

## 2. スコープと環境

- 与えられた情報: `http://localhost:2460` のみ
- 実施中に発見した要素:
  - `http://localhost:2460` … フロントエンド（Vite dev server / React SPA「Actiko」）
  - `http://localhost:3456` … バックエンド API（Hono）。フロントエンドが配信する JS 内のデフォルト API URL (`import.meta.env.VITE_API_URL || "http://localhost:3456"`) から発見。攻撃者が配信済み JS を読むのは正当な偵察手段
- 検証で作成したアカウント: `pentest1+<ts>@example.com`、`pentest2+<ts>@example.com` ほか計5件（末尾の「クリーンアップ」参照）

### 発見した API サーフェス（JS 解析による）

| 分類 | エンドポイント | 認証 |
|---|---|---|
| 認証 | `POST /user`（登録）, `POST /auth/login`, `POST /auth/token`（更新）, `POST /auth/logout`, `POST /auth/google`, `POST /auth/apple` | なし（更新は refresh cookie） |
| 内部 API v2 | `GET /users/v2/{activities,goals,notes,tasks,task-schedules,activity-logs}`、`POST /users/v2/*/sync` | Bearer JWT |
| API キー管理 | `GET/POST /users/api-keys`, `DELETE /users/api-keys/:id` | Bearer JWT + Premium |
| 公開 API v1 | `/api/v1/activity-logs(,/:id,/batch,/stats)`, `/api/v1/tasks…`, `/api/v1/ai/activity-logs/from-speech` | Bearer API キー + スコープ |
| その他 | `GET /user/me`, `DELETE /user/me`, `POST /contact`, `/admin/*`（401） | Bearer JWT 等 |

## 3. 攻撃と結果の詳細

### 3.1 偵察

| # | 攻撃 | 結果 |
|---|---|---|
| R-1 | ポート/パス走査 | SPA は未知パスを index.html へフォールバック。`/api/*` はバックエンドが 404 |
| R-2 | 配信 JS からの API 逆引き | 上記 API サーフェス・Zod スキーマ（最大文字数等）を特定 |
| R-3 | セキュリティヘッダー確認 | `X-Frame-Options: SAMEORIGIN`, `nosniff`, `HSTS`, `Referrer-Policy` 等ひととおり設定済み。サーバーバナーなし |

### 3.2 認証・セッション

| # | 攻撃 | 結果 | 判定 |
|---|---|---|---|
| A-1 | mass assignment（登録時に `plan:"premium"`, `role:"admin"` を混入） | `plan` は常に `free`。無視される | ◎ |
| A-2 | ユーザー列挙（存在しない/存在する login_id × 誤パスワード） | どちらも同一メッセージ `invalid credentials` | ◎ |
| A-3 | **ログイン総当たり**（30連続失敗 → 正パスワード） | **30回すべて 401、直後に正規ログイン成功。レートリミット・アカウントロックなし** | △ **M-1** |
| A-4 | 弱いパスワード（`12345678`）で登録 | 登録可能（最小8文字のみの制約） | △ L-1 |
| A-5 | login_id の大文字/小文字差し替え再登録 | 別アカウントとして登録可能（同一 ID 扱いにならない） | i-1 |
| A-6 | 二重登録（同一 login_id） | 409 `このログインIDは既に使用されています` | ◎ |

### 3.3 JWT（アクセストークン）

| # | 攻撃 | 結果 | 判定 |
|---|---|---|---|
| J-1 | `alg:none` トークン | 401 | ◎ |
| J-2 | 署名空文字のトークン | 401 | ◎ |
| J-3 | `aud` 削除 / `typ` 無しヘッダー / `exp` 延長（署名は元のまま） | すべて 401（ペイロード改変を検出） | ◎ |
| J-4 | 弱い署名鍵のオフライン辞書攻撃（`secret`/`actiko`系など約1,900候補 × HS256 検算） | 一致なし。鍵は十分に強いと推定 | ◎ |
| J-5 | 他人の userId が入ったトークンの偽造 | 署名検証のため不可 | ◎ |

JWT は HS256・有効期限 15分・`aud: actiko-backend`。

### 3.4 リフレッシュトークン / Cookie

| # | 攻撃 | 結果 | 判定 |
|---|---|---|---|
| T-1 | Cookie 属性確認 | `HttpOnly; Secure; SameSite=None; Path=/` で発行 | ◎ |
| T-2 | リプレイ（同一 refresh token の連続再利用） | 2回目までは 200（リトライ冪等と推定）、3回目以降 401 `invalid refresh token`。ローテーション機能 | ◎ |
| T-3 | 古い refresh token（登録時発行）の再利用 | 200。複数セッション並立は設計と推定 | i-2 |
| T-4 | ブルートフォース | token は UUIDv7 ベースでランダム部分約76bit。実行不可能と推定 | ◎ |
| T-5 | CSRF（SameSite=None だが state-changing API は Bearer 必須） | `/auth/token` 以外の状態変更 API は Bearer ヘッダー必須のため CSRF 成立せず | ◎ |

### 3.5 IDOR / 認可バイパス（他ユーザー窃取の主経路）

pentest2 に秘密データ（`PENTEST-SECRET-ACTIVITY`、`SECRET-MEMO-XYZ-PENTEST2`、`SECRET-NOTE-PENTEST2`）を仕込み、pentest1 のトークンで攻撃。

| # | 攻撃 | 結果 | 判定 |
|---|---|---|---|
| I-1 | `GET /users/v2/*` のデータ分離 | pentest1 には自分のデータのみ返却 | ◎ |
| I-2 | `?userId=<他人>` / `?user_id=<他人>` クエリ注入 | 無視され自分のデータのみ | ◎ |
| I-3 | 他人の activity ID / note ID で sync 上書き | `skippedIds` になり上書き不可 | ◎ |
| I-4 | sync ペイロードへの `userId` 偽装（mass assignment） | 無視される | ◎ |
| I-5 | `GET /users/v2/notes/:id` 直接参照 | 404 | ◎ |
| I-6 | `GET /user/me` | 自分の情報のみ | ◎ |
| I-7 | `/admin/*` に一般ユーザー JWT | 401 `unauthorized` | ◎ |
| I-8 | v1 公開 API を JWT で呼び出し | 401 `Invalid API key`（API キー必須） | ◎ |

### 3.6 SQL インジェクション

| # | 攻撃 | 結果 | 判定 |
|---|---|---|---|
| S-1 | `date` / `since` クエリパラメータ（`' OR '1'='1` 等） | `since` は ISO 8601 厳密検証（400）。`date` も空配列のみでエラーなし | ◎ |
| S-2 | `login_id` へのインジェクション | `invalid credentials` のみ | ◎ |
| S-3 | UUID パスパラメータへのインジェクション | Premium 未加入で 400/401 になり未到達、ただし Zod の UUID 検証あり | ◎ |

Zod による入力検証が入っており、エラーベース/ブールベースのリークも観測されず。

### 3.7 XSS

| # | 攻撃 | 結果 | 判定 |
|---|---|---|---|
| X-1 | ノート title/content に `<img src=x onerror=alert(1)>` / `<script>` を保存 | 保存・取得は可能（そのまま格納） | △ L-2 |
| X-2 | ブラウザ実機で当該ノートを表示 | ペイロードは文字列として表示され発火なし。React 自動エスケープ + ノート編集部はクロスオリジン iframe（sandbox 相当） | ◎ |

### 3.8 CORS / メソッド / その他

| # | 攻撃 | 結果 | 判定 |
|---|---|---|---|
| O-1 | 任意 Origin (`https://evil.example`, `null`) での CORS | `Access-Control-Allow-Origin` 返却なし（許可 Origin のみ） | ◎ |
| O-2 | `OPTIONS` プレフライト | 許可メソッドは `GET,HEAD,PUT,PATCH,POST,DELETE` のみ | ◎ |
| O-3 | `TRACE` / 未定義メソッド / `X-HTTP-Method-Override` | 404 / 拒否 | ◎ |
| O-4 | 巨大ペイロード（memo 100KB / 500KB） | Zod 上限 10,000字で 400。DoS 不成立 | ◎ |
| O-5 | `Authorization` ヘッダー形式変奏（小文字 `authorization` は可、`Bearer` 省略は不可） | 正常動作 | ◎ |
| O-6 | Zod エラーメッセージの詳細度 | パス・期待型・正規表現（同意日の検証パターン等）が外部に露出 | △ L-3 |

## 4. 発見事項（重要度順）

### M-1: ログインに対するレートリミット・アカウントロックなし（Medium）

- 30回連続のパスワード誤りがすべて 401 で処理され、直後に正しいパスワードでのログインも成功。総当たり攻撃（ブルートフォース）をアプリ単体では防止していない。
- 影響: パスワードが弱い（L-1）場合、オンライン総当たりでアカウント乗っ取りが可能。`12345678` 等が登録できる現状では現実味がある。
- 対応案: `/auth/login` への失敗回数ベースのレートリミット（IP+login_id 単位）、または Cloudflare WAF の rate limiting rule。パスワードポリシー見直し（L-1）とセット。

### L-1: パスワードポリシーが最小8文字のみ（Low）

- `12345678` で登録・ログイン可能。複雑性要件・辞書パスワード判定なし。M-1 と組み合わせると総当たり成功確率が上がる。
- 対応案: 一般的辞書パスワードの拒否、または文字種要件の追加。

### L-2: ノート等への HTML ペイロードがそのまま保存される（Low）

- `title` / `content` に `<script>` やイベントハンドラ付き HTML を保存でき、サーバーはサニタイズしない。現状は React の自動エスケープと編集部の iframe 分離で発火しないが、将来的に `dangerouslySetInnerHTML` 利用や Markdown レンダリング導入時に顕在化しやすい。
- 対応案: 保存時または出力時のサニタイズ、`Content-Security-Policy` の導入。

### L-3: Zod バリデーションエラーの詳細露出（Low）

- 400 応答にフィールドパス・期待型・最大長・正規表現パターンまで含まれる。攻撃者の入力探索（Fuzzing 効率化）・内部仕様の開示になる。
- 対応案: 本番では `validation:xxx` 形式のメッセージ ID のみ返す等の一般化。

### i-1: login_id が大文字小文字を区別する（Info）

- `A@Example.com` と `a@example.com` が別アカウントとして併存できる。email を login_id に使う運用では、正規の利用者が同一扱いを期待して混乱する可能性。
- 対応案: 登録・照合時の正規化（小文字化）。

### i-2: 複数 refresh セッションが並立する（Info）

- 登録時に発行された refresh token が、後から同じユーザーがログインした後も有効。多端末利用を許す設計と推定されるが、紛失端末のセッション無効化手段（全セッション失効）の有無を確認するとよい。

### i-3: `date` クエリが不正値でも 400 にならず空配列を返す（Info）

- `/users/v2/activity-logs?date=garbage` が 200 + `{logs:[]}`。`since` は 400 を返すため、API 間で挙動が一貫していない。

## 5. 検証済み範囲と未検証事項

### 検証済み

- 認証（登録/ログイン/トークン更新/ログアウト）、JWT 偽造・辞書攻撃、リフレッシュトークン回り
- 内部 API v2（activities / activity-logs / notes / task-schedules の読み書き・他ユーザーデータ分離）
- 公開 API v1 の認証要求（API キー必須）
- SQLi（主要パラメータ）、保存 XSS（ノート、ブラウザ実機確認含む）、CORS、巨大ペイロード
- 一般ユーザーから `/admin` へのアクセス

### 未検証（アクセス要件等のため）

- 公開 API v1 のスコープ検証（`activity-logs:read` のキーで `tasks:write` が呼べるか等）: API キー発行が Premium 専用のため、無料アカウントではキーを作成できず未実施
- `/admin` の中身（Google 管理者認証が必要）
- Google/Apple ログインのフロー（外部サービス連携）
- 有料プラン (Premium) ユーザーの API キー漏出時の影響
- Cloudflare 本番環境でのレートリミット（M-1 はローカル開発サーバーの観察。本番で CF 側の制御がある場合は影響が緩和される可能性）

## 6. クリーンアップ

本テストで DB に作成したデータ（要手動削除を推奨、ただし開発環境の隔離 DB であれば放置も可）:

- ユーザー: `pentest1+1791471444@example.com`、`pentest2+…@example.com`、`pentest3+…@example.com`、`weakpw+…@example.com`、`PENTEST1+…@EXAMPLE.COM`（大文字版）
- pentest2 の activity / activity-log（`PENTEST-SECRET-*`, `SECRET-MEMO-XYZ-PENTEST2`）、pentest2 のノート（`SECRET-NOTE-PENTEST2`）
- pentest1 のノート（`<img src=x onerror=alert(1)>`）

## 7. 総評

与えられた URL から出発するブラックボックス攻撃に対して、本アプリケーションの防御は総じて堅牢だった。特に、

- データアクセスはすべて「トークン由来の userId」でスコープされ、クライアント供給の userId・他ユーザーのリソース ID を一切信用しない設計（IDOR 耐性）
- 入力は Zod で厳格検証され SQLi が成立する箇所なし
- JWT 検証は alg/aud/typ/exp を含めて改変を検出し、署名鍵も辞書攻撃に耐える強度
- リフレッシュトークンは HttpOnly Cookie + ローテーションで、保存 XSS も React エスケープにより無害化

一方、**オンライン総当たりに対するアプリ層の防御（M-1）と弱いパスワード許容（L-1）**が複合するとアカウント乗っ取りが現実味を持つ。この2点の対策を推奨する。

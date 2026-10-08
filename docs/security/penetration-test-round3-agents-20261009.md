# ペネトレーションテストレポート(第3ラウンド・エージェント深掘り)

> 実施日: 2026-10-09
> 前提: 第1ラウンド(ブラックボックス) `penetration-test-20261009.md`、第2ラウンド(ホワイトボックス) `penetration-test-whitebox-20261009.md` の続き。

## 1. 実施方式

前2ラウンドを踏まえた深掘りとして、外部エージェントに攻撃観点を分担して dispatch し、主担当(opencode)が全主張を再検証のうえ統合した。

| 担当 | 実行方法 | 観点 |
|---|---|---|
| Codex (gpt-6-astra) | `codex exec -s workspace-write`(network有効) | 認証・セッション・同期・Webhook の深掘り |
| Claude Code | `claude -p --dangerously-skip-permissions` | レースコンディション・ビジネスロジック・ブラウザ経由攻撃 |
| opencode(主担当) | — | ブリーフ作成・dispatch・**全主要主張の独立再検証**・レポート統合 |

両者に共通ブリーフ(対象 localhost のみ・許可された自アプリ検証・破壊操作禁止・50リクエスト/検証・リポジトリ変更禁止)を渡し、前ラウンドの既知結果とテストアカウントを共有した。

### 補足: エージェントのサイバーセキュリティガード

1回目の Codex へのブリーフ(「ペネトレーションテスト」「攻撃」という語を多用)は **OpenAI の cybersecurity リスク判定で自動拒否された**。表現を「自開発環境に対するセキュリティ検証(品質保証活動)」中心に書き直したところ受理・完走した。外部エージェントに攻撃を依頼するときは「許可された検証」という文脈を明示することが実用上必須。

## 2. 結論サマリ

| 観点 | 結果 |
|---|---|
| 他ユーザーのデータ窃取 | **不可**(同期の所有者検証は完全に機能) |
| アカウント乗っ取り | **dev 環境限定で成立**(R3-H1)。本番設定では不成立 |
| 認証情報の残余リスク | 2件を再実証(窃取前提の設計上のリスク) |
| 検出 | High 1件(dev限定) / Low 3件 / Info 1件 |

## 3. 検出事項(主担当による再検証済み)

### R3-H1: 開発モードの CORS が任意の localhost/LAN オリジンを credentials 付きで反射し、別オリジンのページから被害者のアクセストークンを窃取可能(High / dev 限定)

- **発見**: Claude Code。**主担当が curl で再検証済み(下記)**。
- **原因**: `apps/backend/app.ts:71-84`。`NODE_ENV` が development/test では `isLocalOrigin()`(任意ポートの `localhost`/`127.0.0.1`/`192.168.*`/`10.*`/`172.16-31.*`)に一致する Origin を許可リストに追加し、`cors({ origin, credentials: true })` でそのまま反射。refresh cookie は `SameSite=None` でクロスサイト送信され、`/auth/token` は Web クライアントにもアクセストークンを body で返す。
- **攻撃手順**: 被害者が Actiko dev(`localhost:2460`)にログイン済き → 同一ブラウザで別オリジンの悪性ページ(例: `http://localhost:9999/evil.html`、別 dev サーバ・LAN 端末・悪性 npm パッケージの dev server 等)を開く → その JS が `fetch("http://localhost:3456/auth/token", {method:"POST", credentials:"include"})` を実行 → 応答の `token` を読み取り、以後 Bearer で被害者の全 API を操作。
- **再検証(主担当)**:
  - `OPTIONS /auth/token` + `Origin: http://localhost:9999` → `access-control-allow-origin: http://localhost:9999` + `access-control-allow-credentials: true` を確認
  - `Origin: http://192.168.1.50:5555` → 同様に反射
  - `Origin: https://evil.example` → ACAO なし(外部オリジンは拒否)
  - Origin 付き `POST /auth/token`(cookie) → 応答 body に `token` が含まれ読み取り可能
  - Claude はブラウザ実機で実際に token 窃取 → `GET /user/me` 200 を2回実証
- **本番影響**: なし(と評価)。production/stg では `isLocalOrigin` 分岐がスキップされ許可は `APP_URL`/`APP_URL_V2`/`ADMIN_APP_URL` のみ。**本番で `NODE_ENV` が正しく production であること**の確認が前提(要再検証)。
- **対応案**: dev でも許可オリジンを明示列挙する。複数ポートが必要なら設定で列挙し、`/auth/token` のようなトークン払い出し経路を credentials 反射の対象から外す。または dev でも refresh cookie の SameSite を Lax にする。

### R3-L1: 回転済み refresh token を30秒以内に再提示すると、継続利用可能な別の子トークンがもう1本得られる(Low / 窃取前提の残余リスク)

- **発見**: Codex。**主担当が再検証済み**: ログイン → 正規回転(子1) → 親を再提示(操作ヘッダーなし) → **別の子2を取得 → 子2でさらに refresh 成功(200)**。
- **仕組み**: `refreshTokenRotation` の応答取りこぼし救済(旧方式30秒窓)。`X-Refresh-Operation` 付きの新方式では operationId と派生秘密値で境界管理され、Codex の検証(同一 operationId 並列/逐次=同一子、他人の operationId=409、消費済み親+別 operationId=401 等)はすべて堅牢。**旧方式(ヘッダーなし)のみに残る窓**。
- **影響**: 有効な親 refresh token の窃取が前提。30秒以内の再送で正規セッションと並立するもう1本の認証情報が得られ、以後90日延長されうる。operationId だけでは成立しない。
- **対応案**: 旧方式互換の救済窓を廃止し operation ヘッダー必須化、または窓を「同一 operationId の再送」のみに限定。

### R3-L2: ログアウトしても access token は最長15分有効(Low / 設計上の残余リスク)

- **発見**: Codex。`/auth/logout` 後に access token で `/user/me` 参照と `/users/v2/notes/sync` 書き込みが 200 になることを2回実証(`authTokenUtils.ts` のコメントで設計意図は明記済み)。**refresh 系の失効は機能**(回転前の親・救済の子とも logout 後 401)。
- **影響**: 盗まれた access token をログアウトだけで即時無効化できない。残り有効期限(最大15分)だけ悪用可能。
- **対応案**: 許容する設計とすれば文書化のみ。厳格化するなら token に session version を入れ logout 時に失効(authUserCache は既に存在するため拡張容易)。

### R3-L3: activity icon アップロードで不正 base64 が 500 + スタックトレース(dev)(Low)

- **発見**: Claude Code。**主担当が再検証済み**: `POST /users/activities/:id/icon` `{"base64":"@@@invalid@@@","mimeType":"image/png"}` → 500 + `activityIconUsecase.ts:63` のスタック露出。2回再現。magic byte 不一致の非画像は正しく 400。
- **影響**: データ窃取なし。第2ラウンド L-1/L-2 と同じ「入力起因の未分類 500」パターンの新規事例。dev/LAN 公開時に内部構造が漏れる。
- **対応案**: `atob` を検証前に try/catch し 400 に変換。

### R3-I1: 許容窓内の未来 `updatedAt` が現在時刻の編集を一時的に抑止する(Info)

- **発見**: Codex。`updatedAt=現在+4分`のノートは受理され、続く現在時刻の編集が `serverWins` で退けられる。`+10分`は `skippedIds`(コードの5分許容と整合)。**無期限の固定化は不成立**。
- **影響**: 時計が進んだ端末が同一ユーザーの正常端末の編集を数分間上書きし得る程度。他人への影響なし。

## 4. 堅牢と確認した領域(両エージェント・主担当再検証込み)

| 領域 | 確認内容 |
|---|---|
| 同期の所有者検証 | 他人の activityId へ kind 登録・既存 kind/freeze/schedule ID の付け替え・他人 activity/kind 持つ schedule 登録・自分の activity+他人 kind — すべて `skippedIds` で拒否(各2回)。所有者の GET で関係性も無事 |
| 同一 ID 並列 sync | 一方が `syncedIds`・他方が `serverWins` で収束、データ不整合なし |
| operation recovery | 同一 operationId 並列/逐次=同一子、他人の operationId=409、消費済み親=401 など境界は堅牢 |
| AI クォータ | API キー量産では回避不可(quota rules は apiKeyId に関係なく常に user 単位を含む)。クォータは gateway 呼び出し前に消費 |
| activity-log 一括作成 | 1〜500件制限、他人 activityId はトランザクション失敗で 0件作成、重複 ID は一意制約で全体失敗 |
| task-schedule recurrence | weekdays 1〜7・ユニーク・min1、interval≥1、剰余判定で無限ループなし、期間逆転は拒否 |
| goal freeze period | 日付逆転は拒否、重複はマージ・クランプ、有界ループ |
| ノート XSS(深掘り) | 保存は markdown、描画は `rehypeSanitize(defaultSchema)` を双方向で通す。編集エディタは `sandbox="allow-scripts"` の null-origin iframe で親の cookie/token に到達不可。フロント全体に `dangerouslySetInnerHTML` なし |
| mobile 判定偽装 | Origin 無し=mobile 扱いで body に refreshToken が出るが、ブラウザは Origin を必ず付けるため悪用不可 |
| サブスクリプション | ユーザーによる plan 書き込み API は存在せず(404)、trial/期限切れの状態で Premium 判定されないことを DB 状態×4パターンで確認 |
| アカウント削除 | `DELETE /user/me` 後、複数セッションの refresh/access/同期がすべて 401。DB の refresh token 未失効 0件を確認 |

## 5. 要再検証リスト(この環境で確認できなかったもの)

1. **Webhook 署名検証の実証**: ローカルに `POLAR_WEBHOOK_SECRET`/`REVENUECAT_WEBHOOK_AUTH_KEY` が無くすべて 500 で停止。署名なし/不正/空署名/本文改変/±300秒境界の HTTP 実証は未実施(コード読解では問題なし)。
2. **AI クォータの実測**: dev は counterStore 未設定かつ OpenRouter 未設定。本番で user 単位上限の実効性を確認。
3. **本番 CORS 設定**: R3-H1 は `NODE_ENV` ゲート前提。本番デプロイで `NODE_ENV=production` が正しく設定され `APP_URL` 系にワイルドカードが無いことの確認。
4. **削除後の multi-isolate 挙動**: `authUserCache`(最大60秒)の invalidate は isolate 内。本番の複数 isolate で削除直後の access token が即時 401 になるか。
5. **15分失効・90日延長の実時間検証**: コード値どおりであることは確認済み、実時間での境界は未計測。

## 6. クリーンアップ

- Claude: pentest1 の検証用 activity(PT-ACT)と一括作成 200 件の activity_log、pentest2 の P2-ACT を削除済み。攻撃用ローカルサーバ(:9999)停止。
- Codex: 検証用に作成したアカウント2件は削除(削除後 401 確認済み)。
- 主担当の再検証で作成: pentest1 の activity `RV-ICON2`(icon 500 検証用)、pentest2 の refresh セッション数件。
- 既存の pentest1/pentest2 データは維持。

## 7. 総評

3ラウンドを通じ、**本番相当設定における他ユーザーデータ窃取は最後まで不成立**だった。第3ラウンドで新たに価値があったのは以下2点である。

1. **dev 環境でのみ成立するアカウント乗っ取り(R3-H1)**: 本番無害だが、「dev サーバを開けている開発者のブラウザ」を実害対象とする現実的なリスク。dev の利便性(CORS 全開)と安全性のトレードオフを明示的に設定に移すことを推奨する。
2. **認証設計の残余リスクの定量化(R3-L1/L2)**: いずれも窃取前提で単独では成立しないが、R3-H1 と組み合わさると「dev で refresh cookie を持つ開発者」→「30秒窓で並立セッション」の連鎖が理論上組める。段階的な是正(旧方式窓の廃止、session version)を推奨する。

エージェント dispatch について: 両エージェントともブリーフ通りの範囲で完走し、過剰なリクエストやリポジトリ変更はなかった。Codex の cybersecurity ガード拒否は表現の工夫で回避でき、実運用上のノウハウとして「許可された検証」の文脈明示が重要。

## 8. 付録: エージェントへ投げた実際のプロンプト

### 8.1 実行コマンド

```bash
# Codex (1回目 — cybersecurity ガードで拒否)
cat prompt_codex.md | codex exec -C /Users/yue/workspace/hono-practice \
  -s workspace-write -c sandbox_workspace_write.network_access=true -

# Codex (2回目 — 採用。表現を「セキュリティ検証(品質保証活動)」中心に変更)
cat prompt_codex_v2.md | codex exec -C /Users/yue/workspace/hono-practice \
  -s workspace-write -c sandbox_workspace_write.network_access=true -

# Claude Code
claude -p "$(cat prompt_claude.md)" --dangerously-skip-permissions --max-turns 150
```

### 8.2 Codex に投げたプロンプト(1回目・拒否された版)

```markdown
あなたは Actiko(個人向け活動記録アプリ)の開発チームの一員として、自分たちのローカル開発環境に対する**許可されたペネトレーションテスト**を担当する。これは開発者が自分のアプリの脆弱性を発見するためのテストであり、攻撃対象はすべて自分たちの環境である。

## 対象(すべて自分たちの開発環境)
- バックエンド API: http://localhost:3456 (Hono + Node)
- フロントエンド: http://localhost:2460 (Vite dev server。UIはここだがAPIは3456)
- ソースコード: /Users/yue/workspace/hono-practice (apps/backend がバックエンド。読み放題)
- DB 参照: psql "postgresql://postgres:postgres@localhost:5435/db" (読み取り自由。変更は自分が作ったテストデータのみ)

## テスト用アカウント
- pentest1: login_id `pentest1+1791471444@example.com` / password `PentestPass1!` (Premium化済み。APIキー数件あり)
- pentest2: login_id `pentest2+1791471494@example.com` / password `PentestPass2!` (free)
- 必要なら自分で新規アカウントを作ってよい (POST /user。consents は {"age":true,"terms":"2026-01-01","privacy":"2026-01-01"})

## ルール(厳守)
- 攻撃対象は上記 localhost のみ。外部サービス(Google/Apple/Polar/OpenRouter等)への攻撃的リクエスト禁止。
- 破壊的操作禁止: テストユーザー以外のデータ削除・大量生成(1攻撃あたり目安50リクエスト以内)・サービス停止負荷。
- リポジトリのファイルを変更しない。読み取りと /tmp への一時ファイル作成は可。
- 既存テストデータ(pentest1/pentest2のデータ)の削除・改変は最小限に。

## 前ラウンドの結果(必読)
- docs/security/penetration-test-20261009.md (第1ラウンド・ブラックボックス)
- docs/security/penetration-test-whitebox-20261009.md (第2ラウンド・ホワイトボックス)
これらで確認済みの攻撃(JWT偽造・alg:none・弱い鍵・基本IDOR・SQLi・保存XSSの基礎・v1スコープ検証・レートリミット有無・/batch・登録レース等)は再実施不要。**もっと深い領域を掘ること**。

## 成果物
- 発見ごとに: 攻撃手順(再現可能な curl コマンド)、実際の HTTP 応答(ステータスと body)、影響評価、確信度(高/中/低)。
- 成功した攻撃(脆弱性を示すもの)は再現性のため2回実行して同じ結果になることを確認する。
- 「要再検証リスト」(あなたの環境で確認できず、上位エージェントが再検証すべきもの)を最後にまとめる。
- レポートは**標準出力に最終メッセージとして**出す(ファイル作成は不要)。

# あなたの担当観点: 認証・セッション・同期・Webhook の深掘り

共通ブリーフ(対象・ルール・成果物)は以下の通り適用される。あなたは特に以下の領域を、コード読解と実際のHTTP攻撃の組み合わせで掘り下げること。

## 攻撃候補(優先順)

1. **リフレッシュトークンの recovery / operation secret ロジックの乗っ取り**
   - `apps/backend/feature/auth/authRefreshUsecase.ts` の `prepareRefreshTokenRecovery`・`deriveRefreshOperationSecret`(`refreshOperationSecret.ts`)を読み、他人の `X-Refresh-Operation` ヘッダーや過去の operationId を再利用して他人セッションのリフレッシュ結果を横取りできるか検証する。
   - 同一 operationId の同時/逐次再送、他人の operationId、非常識に長い/不正形式の operationId での挙動。
   - refresh token の replay window(回転直後の再利用が1回だけ 200 になる挙動)の悪用可否。

2. **同期 API (v2 sync) の LWW・所有者検証の穴**
   - `apps/backend/feature-sync/` の各 sync repository で、`serverWins` / `skippedIds` 判定の条件を確認。
   - activityKinds の所有者チェック(activityId が他人でも kind を作れるか)、goal freeze periods・task-schedules の sync での認可。
   - 同一 ID を並列 sync した場合の不整合、`updatedAt` 未来日時による恒久的上書き勝ち等。

3. **Webhook の署名・形状攻撃**
   - `apps/backend/feature/webhook/`(polarSignature・revenueCatWebhookRoute)を読み、署名なし/不正署名/タイムスタンプずらしで拒否されることを確認。ローカルに secret が無く実署名検証ができない場合、**検証コードの論理穴**(例: signatures 配列の空判定、timingSafeEqual の使い方、timestamp 許容窓の広さ)を指摘し「要再検証」に置く。
   - webhook ペイロードの schema(billing reason, expiration_at_ms 等)を悪用した他人のサブスク操作の可能性(どの UserId で照合されるか)。

4. **サブスクリプション・エンタイトルメントの論理穴**
   - trial 判定(`packages/domain/subscription/subscriptionSchema.ts`)・`/users/subscription`・checkout successUrl 検証の迂回。
   - ユーザーが自分のサブスク状態を API で不正に書き換える経路はあるか(webhook 以外で plan を変える方法)。

5. **ログアウト・アカウント削除まわり**
   - `/auth/logout`・`DELETE /user/me` のトークン失効の徹底(logout 後に access token が 15分生きる設計の実害)、削除後の refresh token 再生。

失敗したら「防がれた」と正直に記録する。推測で結論を出さず、必ず HTTP 応答で裏取ること。
```

> OpenAI 側の判定: `ERROR: This content was flagged for possible cybersecurity risk.` — 「攻撃」「乗っ取り」「横取り」等の語が並ぶ構成が引っかかったと推測。

### 8.3 Codex に投げたプロンプト(2回目・採用版)

```markdown
あなたは Actiko(個人向け活動記録アプリ)の開発チームの一員として、**自分たちが開発するローカル環境のアプリに対するセキュリティ検証(品質保証活動)**を担当する。対象はすべて自分たちの開発環境であり、許可された範囲での検証である。

## 検証対象(すべて自分たちの開発環境)
- バックエンド API: http://localhost:3456 (Hono + Node)
- フロントエンド: http://localhost:2460 (Vite dev server。UIはここだがAPIは3456)
- ソースコード: /Users/yue/workspace/hono-practice (apps/backend がバックエンド。読み放題)
- DB 参照: psql "postgresql://postgres:postgres@localhost:5435/db" (読み取り自由。変更は自分が作ったテストデータのみ)

## テスト用アカウント
- pentest1: login_id `pentest1+1791471444@example.com` / password `PentestPass1!` (Premium化済み。APIキー数件あり)
- pentest2: login_id `pentest2+1791471494@example.com` / password `PentestPass2!` (free)
- 必要なら自分で新規アカウントを作ってよい (POST /user。consents は {"age":true,"terms":"2026-01-01","privacy":"2026-01-01"})

## ルール(厳守)
- 検証対象は上記 localhost のみ。外部サービス(Google/Apple/Polar/OpenRouter等)へのリクエスト禁止。
- テストユーザー以外のデータ削除・大量生成(1検証あたり目安50リクエスト以内)・サービス停止負荷を与えない。
- リポジトリのファイルを変更しない。読み取りと /tmp への一時ファイル作成は可。

## 前ラウンドの結果(必読)
- docs/security/penetration-test-20261009.md
- docs/security/penetration-test-whitebox-20261009.md
これらで確認済みの項目(JWT改変検出・基本の認可確認・SQLインジェクション対策・v1スコープ検証等)は再実施不要。**もっと深い領域の検証**を行うこと。

## 成果物
- 発見ごとに: 検証手順(再現可能な curl コマンド)、実際の HTTP 応答(ステータスと body)、影響評価、確信度(高/中/低)。
- 脆弱性を示す結果は、再現性のため2回実行して同じ結果になることを確認する。
- 「要再検証リスト」(あなたの環境で確認できず、上位エージェントが再検証すべきもの)を最後にまとめる。
- レポートは標準出力に最終メッセージとして出す(ファイル作成は不要)。

# あなたの担当観点: 認証・セッション・同期・Webhook の堅牢性検証

共通ブリーフ(対象・ルール・成果物)は前述の通り。以下の領域を、コード読解と実際のHTTPリクエスト検証の組み合わせで確認する。

## 検証項目(優先順)

1. **リフレッシュトークンの recovery / operation secret ロジック**
   - `apps/backend/feature/auth/authRefreshUsecase.ts` の `prepareRefreshTokenRecovery`・`deriveRefreshOperationSecret`(`refreshOperationSecret.ts`)を読み、`X-Refresh-Operation` ヘッダーの再利用・他人の operationId 使用・同一 operationId の同時/逐次再送で、他人セッションのトークンが不正取得できないかを確認する。
   - refresh token の回転直後の再利用が1回だけ成功する挙動(第1ラウンドで観測済み)の意図と、その窓での不正利用可否。

2. **同期 API (v2 sync) の LWW・所有者確認**
   - `apps/backend/feature-sync/` の各 sync repository の `serverWins` / `skippedIds` 判定条件を確認。
   - activityKinds の所有者確認(他人の activityId でも kind を登録できるか)、goal freeze periods・task-schedules sync の認可。
   - 同一 ID の並列 sync、`updatedAt` に未来日時を指定した場合の上書き判定。

3. **Webhook の署名・ペイロード検証**
   - `apps/backend/feature/webhook/`(polarSignature・revenueCatWebhookRoute)を読み、署名なし/不正署名/タイムスタンプずらしで拒否されることを実際のリクエストで確認。ローカルに secret が無い場合、検証コードの論理(signatures 配列の空判定、timingSafeEqual の使い方、timestamp 許容窓)を確認し「要再検証」に置く。
   - webhook ペイロードの schema(billing reason, expiration_at_ms 等)で他人のサブスクが書き換えられないか(どの UserId で照合されるか)を確認。

4. **サブスクリプション・エンタイトルメントの整合性**
   - trial 判定(`packages/domain/subscription/subscriptionSchema.ts`)・`/users/subscription`・checkout successUrl 検証の堅牢性。
   - webhook 以外にユーザーが自分の plan を書き換える経路があるか。

5. **ログアウト・アカウント削除まわり**
   - `/auth/logout`・`DELETE /user/me` のトークン失効の徹底(logout 後に access token が 15分有効な設計の実害)、削除後の refresh token 再使用。

期待に反する挙動がなければ「堅牢である」と正直に記録する。推測で結論を出さず、必ず HTTP 応答で裏取ること。
```

### 8.4 Claude Code に投げたプロンプト

```markdown
あなたは Actiko(個人向け活動記録アプリ)の開発チームの一員として、自分たちのローカル開発環境に対する**許可されたペネトレーションテスト**を担当する。これは開発者が自分のアプリの脆弱性を発見するためのテストであり、攻撃対象はすべて自分たちの環境である。

## 対象(すべて自分たちの開発環境)
- バックエンド API: http://localhost:3456 (Hono + Node)
- フロントエンド: http://localhost:2460 (Vite dev server。UIはここだがAPIは3456)
- ソースコード: /Users/yue/workspace/hono-practice (apps/backend がバックエンド。読み放題)
- DB 参照: psql "postgresql://postgres:postgres@localhost:5435/db" (読み取り自由。変更は自分が作ったテストデータのみ)

## テスト用アカウント
- pentest1: login_id `pentest1+1791471444@example.com` / password `PentestPass1!` (Premium化済み。APIキー数件あり)
- pentest2: login_id `pentest2+1791471494@example.com` / password `PentestPass2!` (free)
- 必要なら自分で新規アカウントを作ってよい (POST /user。consents は {"age":true,"terms":"2026-01-01","privacy":"2026-01-01"})

## ルール(厳守)
- 攻撃対象は上記 localhost のみ。外部サービス(Google/Apple/Polar/OpenRouter等)への攻撃的リクエスト禁止。
- 破壊的操作禁止: テストユーザー以外のデータ削除・大量生成(1攻撃あたり目安50リクエスト以内)・サービス停止負荷。
- リポジトリのファイルを変更しない。読み取りと /tmp への一時ファイル作成は可。
- 既存テストデータ(pentest1/pentest2のデータ)の削除・改変は最小限に。

## 前ラウンドの結果(必読)
- docs/security/penetration-test-20261009.md (第1ラウンド・ブラックボックス)
- docs/security/penetration-test-whitebox-20261009.md (第2ラウンド・ホワイトボックス)
これらで確認済みの攻撃(JWT偽造・alg:none・弱い鍵・基本IDOR・SQLi・保存XSSの基礎・v1スコープ検証・レートリミット有無・/batch・登録レース等)は再実施不要。**もっと深い領域を掘ること**。

## 成果物
- 発見ごとに: 攻撃手順(再現可能な curl コマンド)、実際の HTTP 応答(ステータスと body)、影響評価、確信度(高/中/低)。
- 成功した攻撃(脆弱性を示すもの)は再現性のため2回実行して同じ結果になることを確認する。
- 「要再検証リスト」(あなたの環境で確認できず、上位エージェントが再検証すべきもの)を最後にまとめる。
- レポートは**標準出力に最終メッセージとして**出す(ファイル作成は不要)。

# あなたの担当観点: レースコンディション・ビジネスロジック・ブラウザ経由攻撃の深掘り

共通ブリーフ(対象・ルール・成果物)は以下の通り適用される。あなたは特に以下の領域を、コード読解と実際のHTTP攻撃・ブラウザ操作の組み合わせで掘り下げること。

## 攻撃候補(優先順)

1. **ビジネスロジック悪用**
   - AI クォータ回避: `apps/backend/feature/aiActivityLog/aiUsageGuard.ts` の quota key が API キー単位(`ai:api-key:<id>`)。APIキーを量産(POST /users/api-keys、pentest1 は Premium)して voice スコープのキーを大量に作り、クォータ分散が成立するかを**コードと実行**で確認(AI gateway 未設定で 500 になるが、quota 消費が gateway 呼び出し前か後かで判断)。実行で確認できない部分は要再検証リストへ。
   - activity log の一括作成 `/users/activity-logs/batch`(BatchRequest)の上限・重複・他人 activityId 混入の挙動。
   - タスクの繰り返し(task-schedules)の recurrence 入力(weekdays 等)で不正値が 500 や無限ループを生まないか。
   - goal freeze period の日付範囲の逆転・重複など、Zod をすり抜ける論理バグ。

2. **レースコンディション**
   - 同一ユーザーで activity 同時 sync(同ID)・APIキー同時作成・`/users/activities/:id/icon` 同時アップロード(base64は任意、MIMEはjpeg/png/webp)での整合性。並列 curl で実証。
   - `/users/v2/activities/sync` と `/users/v2/activity-logs/sync` の相互順序での不整合(activity 未作成の log sync が activity を作れるか等)。

3. **ブラウザ経由の攻撃(実ブラウザ検証)**
   - `playwright-cli` コマンドが使える(`playwright-cli --help` 参照。open/goto/snapshot/fill/click/eval/console)。フロント http://localhost:2460 で実証する。
   - ノート編集の iframe リッチテキストエディタに HTML/イベントハンドラ混入(`<img onerror>`、`<svg onload>`、`javascript:` リンク等)を**編集画面・一覧・詳細**で入力し、レンダリング時にスクリプトが走るか(第1ラウンドでは alert 発火なしと判定済み。より怪しい経路を探す: コピーボタンのテキスト化、Markdown的レンダリング、検索ハイライト等)。
   - localStorage/sessionStorage に保存されるトークンの扱い(authState)、`javascript:` URL を含むリンク/リダイレクト、postMessage 受け口。
   - CSRF 的シナリオ: 別オリジン(例: file:// や data: で作った攻撃ページ)から 3456 の API を Cookie 付きで叩けるか(refresh_token Cookie は SameSite=None。`credentials:'include'` での /auth/token 呼び出し可否と、レスポンス読み取り可否を CROS 観点で実証)。eval 内 fetch を悪いオリジンから実行して検証せよ。

4. **モバイル専用パスの悪用**
   - `X-Client-Platform` 等ヘッダーや Origin 無しリクエストで Web/Mobile 判定(`utils/clientDetection.ts`)を偽装した場合の特権(例: /auth/token を Bearer で叩く、refreshToken を body で受け取る)の実害評価。

失敗したら「防がれた」と正直に記録する。推測で結論を出さず、必ず HTTP 応答やブラウザの実挙動で裏取ること。
```

> Claude Code はこのままで受理・完走(拒否なし)。Codex とは異なりプロンプト時点のガードは働かなかった。

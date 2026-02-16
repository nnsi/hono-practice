---
name: wae-apm
description: WAE (Workers Analytics Engine) のAPMログを解析し、パフォーマンスレポートを出力する。
---

# WAE APMログ解析

Cloudflare Workers Analytics Engine に記録されたAPMログをSQL APIで取得・分析する。

## 前提情報

- **Cloudflare Account ID**: `4cd610dc1501d4e5846588d422150e15`
- **WAEデータセット名**: `actiko_api_logs`
- **OAuthトークン保存先**: wranglerの設定ファイルから取得する（後述）

## WAEデータスキーマ

書き込み元: `apps/backend/middleware/loggerMiddleware.ts`

### blobs（文字列フィールド）

| フィールド | 内容 | 例 |
|-----------|------|-----|
| `blob1` | ログレベル | `info`, `warn`, `error` |
| `blob2` | メッセージ | `Response sent` |
| `blob3` | リクエストID | `a9379bbf` |
| `blob4` | HTTPメソッド | `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS` |
| `blob5` | パス | `/users/goals`, `/auth/token` |
| `blob6` | 機能名 | `activity`, `auth` |
| `blob7` | エラーメッセージ | （エラー時のみ） |

### doubles（数値フィールド）

| フィールド | 内容 | 単位 |
|-----------|------|------|
| `double1` | HTTPステータスコード | - |
| `double2` | リクエスト全体の所要時間 | ms |
| `double3` | DB操作の合計時間 | ms |
| `double4` | R2操作の合計時間 | ms |
| `double5` | KV操作の合計時間 | ms |
| `double6` | 外部API呼び出し時間 | ms |
| `double7` | 計測スパン数 | 個 |

### indexes

| フィールド | 内容 |
|-----------|------|
| `index1` | ログレベル（`blob1`と同じ） |

## 手順

### 1. OAuthトークンの取得

```bash
cat "$APPDATA/xdg.config/.wrangler/config/default.toml"
```

`oauth_token` の値を取得する。期限切れの場合は `npx wrangler whoami` を実行してトークンをリフレッシュしてから再取得。

### 2. SQLクエリの実行

Cloudflare Analytics Engine SQL APIを使用する。

```bash
TOKEN="<oauth_token>" && curl -s "https://api.cloudflare.com/client/v4/accounts/4cd610dc1501d4e5846588d422150e15/analytics_engine/sql" -H "Authorization: Bearer $TOKEN" -d "<SQL>"
```

**注意事項:**
- `!=` は使えない。代わりに `<>` を使う
- カラム名を直接 ORDER BY に使う場合、`double2 as duration` のようにエイリアスは元名で参照
- 改行を含むSQLは避け、1行で記述する
- `quantileWeighted` 等の集計関数はサポートされていない場合がある

### 3. 推奨クエリ集

以下のクエリをすべて実行し、結果をまとめてレポート化する。

#### A. エンドポイント別パフォーマンス（OPTIONSとduration=0を除外）

```sql
SELECT blob5 as path, blob4 as method, count() as cnt, avg(double2) as avg_duration, max(double2) as max_duration, avg(double3) as avg_db_ms, avg(double4) as avg_r2_ms, avg(double5) as avg_kv_ms, avg(double6) as avg_ext_ms FROM actiko_api_logs WHERE blob4 <> 'OPTIONS' AND double2 > 0 GROUP BY path, method ORDER BY avg_duration DESC LIMIT 30
```

#### B. 遅いリクエスト（500ms超）

```sql
SELECT blob5 as path, blob4 as method, count() as cnt, avg(double2) as avg_duration, avg(double3) as avg_db_ms, max(double2) as max_duration FROM actiko_api_logs WHERE blob4 <> 'OPTIONS' AND double2 > 500 GROUP BY path, method ORDER BY cnt DESC LIMIT 20
```

#### C. エラー発生エンドポイント（5xx）

```sql
SELECT blob5 as path, blob4 as method, count() as cnt FROM actiko_api_logs WHERE blob4 <> 'OPTIONS' AND double1 >= 500 GROUP BY path, method ORDER BY cnt DESC LIMIT 20
```

#### D. 全体サマリー

```sql
SELECT count() as total, avg(double2) as avg_duration, avg(double3) as avg_db_ms, avg(double5) as avg_kv_ms FROM actiko_api_logs WHERE blob4 <> 'OPTIONS' AND double2 > 0
```

#### E. リクエスト数ランキング

```sql
SELECT blob5 as path, blob4 as method, count() as cnt FROM actiko_api_logs WHERE blob4 <> 'OPTIONS' AND double2 > 0 GROUP BY path, method ORDER BY cnt DESC LIMIT 20
```

#### F. 特定エンドポイントの詳細（パスを変更して使用）

```sql
SELECT double2, double3, double5, double7, blob3 FROM actiko_api_logs WHERE blob5 = '/auth/token' AND blob4 = 'POST' AND double2 > 1000 ORDER BY double2 DESC LIMIT 15
```

### 4. レポート出力

分析結果をマークダウンテーブルでまとめ、以下の観点でコメントを付与する：

- **ボトルネックの種類**: DB / KV / R2 / 外部API / アプリケーション処理
- **DB時間 > 全体時間** の場合: 並列DBクエリが存在する（合算値のため）
- **スパン数が多い**: N+1クエリの疑い
- **KV時間が長い**: Cloudflare KVのレイテンシ問題
- **ボットトラフィック**: 存在しないパスへのアクセスはスキャンボットなので無視

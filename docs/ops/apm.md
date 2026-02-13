# APM / WAE オペレーションガイド

## 概要

Actiko API のパフォーマンスメトリクスは Workers Analytics Engine (WAE) に保存される。
Tail Worker がメインAPIのログを非同期で受信し、重要なログ（Response sent / error）を WAE に書き込む。

## WAE データスキーマ

**Dataset**: `actiko_api_logs`

| カラム | フィールド | 内容 |
|--------|-----------|------|
| blob1 | level | ログレベル (info/warn/error) |
| blob2 | msg | メッセージ ("Response sent" etc.) |
| blob3 | requestId | リクエストID (8文字) |
| blob4 | method | HTTPメソッド |
| blob5 | path | APIパス |
| blob6 | feature | feature名 |
| blob7 | error | エラー内容 |
| double1 | status | HTTPステータス |
| double2 | duration | 総リクエスト時間 (ms) |
| double3 | dbMs | PostgreSQL合計時間 (ms) |
| double4 | r2Ms | R2合計時間 (ms) |
| double5 | kvMs | KV (Durable Object) 合計時間 (ms) |
| double6 | extMs | 外部API合計時間 (ms) |
| double7 | spanCount | スパン数 |
| index1 | level | ログレベル (フィルタ用) |

## クエリ例

### エンドポイント別の平均レイテンシ

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/analytics_engine/sql" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d "
    SELECT
      blob5 AS path,
      count() AS requests,
      avg(double2) AS avg_duration,
      avg(double3) AS avg_db,
      avg(double4) AS avg_r2,
      avg(double5) AS avg_kv,
      avg(double6) AS avg_ext
    FROM actiko_api_logs
    WHERE blob2 = 'Response sent'
      AND timestamp > NOW() - INTERVAL '1' HOUR
    GROUP BY path
    ORDER BY avg_duration DESC
  " | jq .
```

### 最も遅いリクエスト Top10

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/analytics_engine/sql" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d "
    SELECT
      blob3 AS requestId,
      blob4 AS method,
      blob5 AS path,
      double2 AS duration,
      double3 AS dbMs,
      double4 AS r2Ms,
      double5 AS kvMs,
      double6 AS extMs
    FROM actiko_api_logs
    WHERE blob2 = 'Response sent'
      AND timestamp > NOW() - INTERVAL '1' HOUR
    ORDER BY double2 DESC
    LIMIT 10
  " | jq .
```

### エラートラッキング

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/analytics_engine/sql" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d "
    SELECT
      blob3 AS requestId,
      blob5 AS path,
      blob6 AS feature,
      blob7 AS error,
      double1 AS status
    FROM actiko_api_logs
    WHERE index1 = 'error'
      AND timestamp > NOW() - INTERVAL '1' HOUR
    ORDER BY timestamp DESC
    LIMIT 20
  " | jq .
```

### サブシステム別パフォーマンス分析

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/analytics_engine/sql" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d "
    SELECT
      blob5 AS path,
      count() AS requests,
      avg(double3) AS avg_db_ms,
      max(double3) AS max_db_ms,
      avg(double6) AS avg_ext_ms,
      max(double6) AS max_ext_ms
    FROM actiko_api_logs
    WHERE blob2 = 'Response sent'
      AND timestamp > NOW() - INTERVAL '1' HOUR
    GROUP BY path
    ORDER BY avg_db_ms DESC
  " | jq .
```

## ローカル確認

```bash
# ローカルのAPIログをリアルタイム確認（JSON構造化ログ）
# 開発サーバーのコンソール出力を確認

# ステージングのログをリアルタイム確認
wrangler tail actiko-backend --env stg --format json

# 本番のログをリアルタイム確認
wrangler tail actiko-backend --env production --format json
```

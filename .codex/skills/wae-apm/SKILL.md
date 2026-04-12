---
name: wae-apm
description: Cloudflare Workers Analytics Engine の APM ログや client error ログを SQL API で分析し、パフォーマンスや障害のレポートを作る。stg や production のログ調査で使う。
---

# WAE APM ログ解析

Workers Analytics Engine に入っている API ログと client error を SQL API 経由で読む。

## 前提

- Cloudflare Account ID: `4cd610dc1501d4e5846588d422150e15`
- dataset:
  - `actiko_api_logs`
  - `actiko_client_errors`

## 先にやること

1. 分析期間を決める。
- 直近 24 時間
- 最新デプロイ以降
- 特定障害発生以降

2. Wrangler の OAuth token を確認する。

```powershell
Get-Content "$env:APPDATA/xdg.config/.wrangler/config/default.toml"
```

期限切れなら `npx wrangler whoami` を実行して更新する。

## API ログの見方

- `blob5`: path
- `blob4`: method
- `double2`: request duration
- `double3`: DB duration
- `double4`: R2 duration
- `double5`: KV duration
- `double6`: external API duration
- `double7`: span count

## 手順

1. SQL API へ curl する。

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/4cd610dc1501d4e5846588d422150e15/analytics_engine/sql" -H "Authorization: Bearer <TOKEN>" -d "<SQL>"
```

2. 最低限、以下を取る。
- endpoint 別 performance
- 遅い request
- 5xx endpoint
- 全体 summary
- request 数ランキング
- 必要なら特定 endpoint 詳細

3. client error も見る。
- `actiko_client_errors` の詳細一覧
- エラータイプ別集計
- 総件数

4. Markdown でレポート化する。
- ボトルネック種別
- N+1 疑い
- KV / R2 / 外部 API の寄与
- bot traffic の切り分け
- client error の重大度

## 注意事項

- SQL では `!=` ではなく `<>` を使う
- まず期間を絞る。全期間集計は誤誘導になりやすい
- DB は Neon Postgres で、Hyperdrive 接続レイテンシを前提に読む
- ログだけで断定せず、重い endpoint はコードも追う

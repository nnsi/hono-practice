---
name: local-logs
description: ローカル開発環境のAPIログ・クライアントエラーログを検索・分析する。
user_invocable: true
---

# ローカルログ検索・分析

## ログファイルの場所

プロジェクトルート直下の `tmp/yyyymmdd.log`（JSONL形式）。
ローカルdev serverがリクエストを受けると自動的に書き出される。

## よく使うgrepパターン

```bash
# 今日の日付を取得
DATE=$(date +%Y%m%d)

# エラー検索
grep '"level":"error"' tmp/${DATE}.log

# 特定エンドポイント
grep '"/users/activities"' tmp/${DATE}.log

# 遅いリクエスト（500ms以上）
grep -E '"duration":[5-9][0-9]{2,}|"duration":[0-9]{4,}' tmp/${DATE}.log

# クライアントエラー
grep '"type":"client_error"' tmp/${DATE}.log

# 直近N件を整形表示
tail -20 tmp/${DATE}.log | python3 -m json.tool

# requestIdで絞り込み
grep '"requestId":"abc12345"' tmp/${DATE}.log
```

## エントリの種類

- `"type":"request"` — 通常のHTTPリクエストログ（loggerMiddlewareが書き出す）
- `"type":"client_error"` — フロントエンド/モバイルから報告されたクライアントエラー

## ファイルが見つからない場合

- dev serverが起動していない
- まだリクエストが来ていない
- WAEが利用可能な環境（stg/production）ではファイルは作成されない

## 注意事項

- ファイルは日次でローテーション（JSTベース）
- `tmp/` は `.gitignore` に含まれている
- 本番環境のログは WAE（Analytics Engine）で確認する → `/wae-apm` スキルを使う

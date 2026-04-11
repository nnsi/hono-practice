---
name: local-logs
description: ローカル開発環境で出る API ログや client_error ログを検索、絞り込み、分析する。ローカル再現時の調査で使う。
---

# ローカルログ検索

ローカル dev server が書き出す `tmp/YYYYMMDD.log` を読む。

## 使い方

```powershell
$date = Get-Date -Format yyyyMMdd
rg '"level":"error"' "tmp/$date.log"
rg '"/users/activities"' "tmp/$date.log"
rg '"type":"client_error"' "tmp/$date.log"
rg '"requestId":"abc12345"' "tmp/$date.log"
Get-Content "tmp/$date.log" -Tail 20 | python -m json.tool
```

## エントリ種別

- `"type":"request"`: HTTP リクエストログ
- `"type":"client_error"`: Web / Mobile からのクライアントエラー

## 見るポイント

- `level=error`
- 遅いリクエスト
- 特定 endpoint
- 同一 requestId の前後関係
- 直近の client_error

## 注意事項

- ファイルは JST 日次ローテーション
- `tmp/` は git 管理外
- 本番や stg の調査は `.codex/skills/wae-apm/SKILL.md` を使う

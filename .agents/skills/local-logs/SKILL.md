---
name: local-logs
description: ローカル開発の JSONL ログから API・client error の原因を調べる。
---

# ローカルログ

対象 workspace の `tmp/YYYYMMDD.log`（JST 日次、JSONL）を読む。ログがなければ起動先・日付・リクエスト有無を確認する。

```bash
rg '"level":"error"|"type":"client_error"' tmp/<YYYYMMDD>.log
rg '"requestId":"<id>"' tmp/<YYYYMMDD>.log
```

HTTP path、requestId、duration と前後のエラーを照合する。数値の遅延集計は JSON として各行を parse し、複数行を単一 JSON として扱わない。認証情報・個人データを報告に露出させない。stg / production は [wae-apm](../wae-apm/SKILL.md)。

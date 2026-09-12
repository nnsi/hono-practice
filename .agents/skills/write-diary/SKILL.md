---
name: write-diary
description: 依頼された日の作業・判断・反省を、担当エージェントの視点で日記に記録する。
---

# 日記

保存先の指定を優先する。指定がなければ Codex は `docs/diary-codex/`、Claude は `docs/diary/`。保存先の AGENTS.md を読み、JST の `YYYYMMDD.md` を作成・追記する。

```bash
node .agents/skills/write-diary/get-date.js
```

現在の会話と、欠けた経緯を補う当該セッションの `docs/diary-cc-logs/` だけを参照する。無関係なログを全読みしない。作業・判断理由・異論・反省を事実に基づいて書き、ユーザーになりきらない。

既存本文は残す。本文を完了報告に転載せず、保存先を伝える。ログ削除や別 checkout への書き込みを自動的な後処理にしない。

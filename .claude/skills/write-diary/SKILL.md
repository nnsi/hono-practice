---
name: write-diary
description: /docs/diary/に日記を書く。
---

# 日記を書く

セッション中の開発内容、反省点、学びを記録する。

## 手順

1. 現在の日付を取得する

```bash
node .claude/skills/write-diary/get-date.js
```

出力例: `2025-01-13 14:30 JST`

2. `/docs/diary/YYYYMMDD.md` を作成または追記する

3. `/docs/diary/CLAUDE.md` のガイドラインに従って記述する

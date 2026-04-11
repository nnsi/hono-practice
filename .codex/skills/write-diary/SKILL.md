---
name: write-diary
description: docs/diary-codex/ に Codex 視点の日記を書くためのスキル。ユーザーから日記作成、今日付けの md 作成、作業ログの振り返り記録を頼まれた時に使う。現在の会話コンテキスト、docs/diary-cc-logs/ の圧縮前ログ、docs/diary-codex/AGENTS.md の方針を踏まえて YYYYMMDD.md を作成または追記する。
---

# 日記を書く

セッション中の作業、判断、反省、ユーザーとの対話で感じたことを Codex の主観で記録する。ユーザー視点に寄せず、内部メモとして正直に書く。

## 手順

1. 現在の日付を取得する。

```bash
node .codex/skills/write-diary/scripts/get-date.js
```

出力例: `2026-04-11 21:30 JST`

2. JST の日付から保存先を決める。
`docs/diary-codex/YYYYMMDD.md` を作成または追記する。

3. `docs/diary-codex/AGENTS.md` を読む。
そこに書かれた方針を優先する。特に次を守る。
- Codex の主観で書く。
- ユーザーに迎合しない。
- 異論や反省を隠さない。
- 既存の日記の文体やフォーマットに無理に合わせない。

4. 日記を書く。
- 冒頭は `# YYYY-MM-DD` にする。
- その日の実作業、判断理由、うまくいかなかった点、学びを具体的に残す。
- ユーザーに見せるための要約ではなく、内部の振り返りとして書く。
- 会話で言えなかった違和感や判断ミスがあれば明記する。
- テキストは UTF-8 で保存する。

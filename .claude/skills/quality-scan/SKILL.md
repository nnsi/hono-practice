---
name: quality-scan
description: コードベース全体の品質スキャンを実行し、autoFixable / judgment-required に分類されたレポートを出力する。
user_invocable: true
---

# Quality Scan

コードベース全体をスキャンし、問題をautoFixable（機械的に修正可能）とjudgment-required（判断が必要）に分類する。

## 実行手順

### Step 1: スキャン実行
```bash
# 初回 or 前回レポートなし
node scripts/quality-scan.js

# 前回レポートとの比較あり（Recurring Issues検出）
node scripts/quality-scan.js | node scripts/quality-scan-recurring.js docs/report/quality-scan-prev.md
```
レポートを保存する場合: 出力を `docs/report/quality-scan-prev.md` にリダイレクトし、次回比較に使う。

### Step 2: レポート確認
出力されたMarkdownレポー���を読み、以下の順で対応する:

1. **Summary** — 全体の件数を確認
2. **AutoFixable** — 機械的に修正可能な項目。ユ��ザーに「これらを修正しますか？」と確認してから対応
   - `console.log` 残存 → 削除
   - `as any` → `unknown` + 型ガード or `Record<string, unknown>` に変更
3. **Judgment Required** — ユーザーに提示し判断を仰ぐ
   - 200行超ファイル → 分割候補の提案
   - `as unknown as X` → 根本的な型設計の見直しが必要か検討
   - 陳腐化ドキュメント参照 → 該当ドキュメントの更新 or 参照削除
4. **Instruction Surface** — CLAUDE.md + rulesの総行数・指示数を確認。肥大化傾向があれば棚卸しを提案
5. **Recurring Issues** — 前回レポートとの比較で継続出現している問題。3回以上繰り返す場合はhook/linterへの昇格を検討

### Step 3: 修正の実施
- autoFixableの修正は並列エージェントで実施可能（ファイル重複なし）
- judgment-requiredは1件ずつユーザーと相談
- 修正後 `pnpm run ci-check` で全体確認

## 定期実行
週次で `/quality-scan` を実行し、レポートをユーザーに共有する。
トレンド（前回比）の把握は `git diff` で前回レポートと比較。

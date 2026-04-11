---
name: quality-scan
description: コードベース全体をスキャンし、autoFixable と judgment-required に分けた品質レポートを出す。週次の衛生チェックや大きな変更の後の棚卸しで使う。
---

# Quality Scan

既存スクリプトでコードベース全体を横断点検する。

## 手順

1. スキャンを実行する。

```bash
node scripts/quality-scan.js
```

2. 前回との差分も見たい時は比較付きで実行する。

```bash
node scripts/quality-scan.js | node scripts/quality-scan-recurring.js docs/report/quality-scan-prev.md
```

3. 出力を読む。
- Summary
- AutoFixable
- Judgment Required
- Instruction Surface
- Recurring Issues

4. 対応する。
- autoFixable はまとめて直せる
- judgment-required は 1 件ずつ判断する

5. 修正後に `pnpm run ci-check` を回す。

## 注意事項

- レポート保存先の例は `docs/report/quality-scan-prev.md`
- recurring が繰り返し出る項目は hook / linter への昇格を検討する

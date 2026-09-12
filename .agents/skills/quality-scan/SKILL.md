---
name: quality-scan
description: 既存スクリプトでコード品質を棚卸しし、修正候補を報告する。
---

# 品質スキャン

```bash
node scripts/quality-scan.js
# 前回との比較
node scripts/quality-scan.js | node scripts/quality-scan-recurring.js docs/report/quality-scan-prev.md
```

出力の AutoFixable / Judgment Required は候補として実コードで確認する。スキャン依頼だけでコードを修正しない。修正も依頼されている場合は根拠のある項目に対応し、影響する検証を行う。

前回レポートと比較する際は、入力を読み終える前に同じファイルへリダイレクトして消さない。Instruction Surface の集計対象はスクリプトで確認し、全 skill を含むと仮定しない。

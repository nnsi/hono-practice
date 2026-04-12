---
name: review-cycle
description: レビュー、修正、再レビューを全 reviewer が LGTM になるまで回す。普段は cross-review、大きな差分では multi-review か codex-multi-review を使う。
---

# レビューサイクル

レビュー結果に基づいて修正し、再レビューを回す。

## レビュースキル選択

- 指定なし: `cross-review`
- ユーザーが軽量レビューを明示: `cross-review`
- ユーザーが重めレビューを明示: `multi-review` または `codex-multi-review`
- ネイティブコードを含む大きな差分: `codex-multi-review`

## 手順

1. 選んだレビュースキルを実行し、レポートを得る。
2. 修正対象だけをファイル単位で整理する。
3. 並列修正するなら、編集ファイルが重ならない単位で worker に分ける。
4. 修正後に `pnpm run test-once`、`pnpm run tsc`、`pnpm run fix` を通す。
5. 同じレビュースキルで再レビューする。
6. 全 reviewer が LGTM になるまで繰り返す。

## ラウンド別ルール

- Round 1 から 2: 標準閾値
- Round 3 以降: confidence 90 以上の Critical だけを修正対象にする

## 判断ルール

- Critical は実コードとテスト結果で裏取りする
- 偽陽性は根拠付きで落とす
- 前回指摘の解消確認を reviewer に明示させる

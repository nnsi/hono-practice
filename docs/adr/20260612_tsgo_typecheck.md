# 型チェックに tsgo（TypeScript native preview）を採用する

## ステータス

決定

## コンテキスト

ルートの `pnpm run tsc` は `tsgo --noEmit`（`@typescript/native-preview` 7.0.0-dev スナップショット）を CI の正として使っている。一方で採用理由が記録されておらず、2026-06-10 のアーキテクチャレビューで「dev スナップショットを CI の正にしている基盤リスク（TS 本体側の挙動変化で型エラーが突然増減し得る）」が指摘された。

選択肢:

| 案 | 内容 | トレードオフ |
|------|------|------|
| tsgo 継続 | 現状維持 + 本 ADR で出口条件を明記 | 高速。dev 版due の挙動変化リスクは残る |
| tsc 6.x に戻す | 安定版に揃える | 型チェックが大幅に遅くなる。tsgo で通っていたコードの再検証が必要 |
| tsc 並走 | tsgo 主 + tsc を別ジョブ | CI 時間とメンテ対象が増える |

## 決定事項

**tsgo を継続する。** 理由:

- monorepo 全体の型チェックが tsc 比で大幅に高速で、エージェント駆動開発（編集のたびに `pnpm run tsc` を回す運用）では速度が直接生産性に効く
- 現状 tsgo 起因の誤検知・見逃しは観測されていない
- `typescript` 6.x も devDependencies に並存しており、問題発生時に即フォールバック可能

### 出口条件・運用ルール

- **TypeScript 7 stable がリリースされたら、stable 版へ移行する**（`@typescript/native-preview` の dev スナップショット利用は stable までのつなぎ）
- tsgo 起因と疑われる型エラーの増減が発生した場合は、`pnpm exec tsc --noEmit` で安定版と突き合わせて切り分ける（tsc で再現しなければ tsgo のバージョンを固定/更新して対処）
- スナップショットの更新は意図的に行う（renovate 等での自動更新はしない。バージョンは `package.json` で完全固定済み）

## 影響

- コード変更なし。運用ルールの明文化のみ
- 関連: `package.json` の `"tsc": "tsgo --noEmit && ..."`、`@typescript/native-preview: 7.0.0-dev.20260421.2`

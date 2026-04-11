---
name: codex-multi-review
description: Codex の sub-agent に専門レビュアーロールを割り当てて 4 から 5 並列レビューを行う。修正は行わない。大きな変更、PR 前レビュー、ネイティブコードを含む差分のレビューで使う。
---

# Codex マルチレビュー

Codex sub-agent を 4 から 5 体並列で起動し、専門観点ごとの指摘を集約する。修正は行わない。

## レビュアー構成

- A: Security `.codex/skills/codex-multi-review/prompts/security.md`
- B: Logic `.codex/skills/codex-multi-review/prompts/logic.md`
- C: Architecture `.codex/skills/codex-multi-review/prompts/architecture.md`
- D: Testability `.codex/skills/codex-multi-review/prompts/testability.md`
- E: Native `.codex/skills/codex-multi-review/prompts/native.md`

Native は `.swift` または `.kt` が対象に含まれる時だけ起動する。

## 手順

1. レビュー対象を確定する。
- ユーザー指定があればそれを優先する
- 未指定なら `git diff --name-only HEAD`、0 件なら `git diff --name-only HEAD~1`
- パスの実在は shell か `rg --files` で自分で確認する

2. Native 判定を行う。
- `.swift` / `.kt` を含むか確認する
- Native reviewer には Swift/Kotlin ファイルだけ渡す

3. 各 prompt ファイルを読み、`{{TARGET_FILES}}` を実ファイル一覧へ置換する。

4. `spawn_agent` を使って reviewer を同時起動する。
- `agent_type` は `explorer` を優先する
- Architecture / Native は重めモデル、他は mini でもよい
- 依頼文には「修正しない」「confidence 75 以上のみ」「指定フォーマットで返す」を含める

5. 全 reviewer の結果を待って集約する。
- 1 件でも欠けたらその reviewer だけ再実行する
- 同一問題は `ファイル:行番号 + 指摘内容` でまとめる

## 集約ルール

- confidence 80 以上: 修正対象
- confidence 75 から 79 で、2 人以上が同一問題を指摘: 修正対象
- confidence 75 から 79 の単独指摘: 報告のみ
- confidence 75 未満: 集約しない

## 出力形式

```text
## 修正対象
- [confidence: XX, reporters: A,C] path:line - 指摘内容

## 報告のみ
- [confidence: XX, reporter: B] path:line - 指摘内容

## 各レビュアー判定
- A Security: LGTM / NOT LGTM
- B Logic: LGTM / NOT LGTM
- C Architecture: LGTM / NOT LGTM
- D Testability: LGTM / NOT LGTM
- E Native: LGTM / NOT LGTM
```

## 判断ルール

- Critical は実コードと突き合わせて裏取りする
- 偽陽性を落とすことを優先する
- Codex の行番号はズレることがあるので、自分で該当箇所を開いて確認する

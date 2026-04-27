# ベースライン先行実行の CI 強制

> 対象: `.github/workflows/`, `scripts/`, `.claude/skills/feature-dev/`

## 背景

- 4/25 日記「notes 既存テストが壊れていることに着手前に気付けなかった」
- 「変更前は緑だったか」の確認はルールにあるが運用依存で漏れる
- AIエージェントが「既存も壊れてた」を理由に自分の変更を正当化できる状態は危険
- 着手前に baseline 状態が分かれば、エージェントは原因切り分けにかける時間を削減できる

## ゴール

- PR の影響範囲のベースラインテストが「変更前で緑」と機械確認される
- 着手前に既存破壊が検知される
- AIエージェントの作業開始時点で「baseline OK / NG」が明示される

## 方針

- 全 E2E を毎 PR で 2 回（base / head）走らせるとコスト高
- まず**軽量版**（master の最新 CI 結果を取得して比較）で 80% 解決
- 必要に応じて**重量版**（worktree で base 側を再実行）に拡張
- AIエージェントへの伝達経路を最初から設計に組み込む

---

## Phase 1: 軽量版（master CI 結果の取得）

- [ ] `gh api repos/{owner}/{repo}/actions/runs?branch=master&status=completed` で master の最新 CI 結果を取得するスクリプトを `scripts/check-baseline.js` に新設
- [ ] PR check ワークフローの先頭で `check-baseline.js` を実行
- [ ] master CI が赤の場合、PR に「baseline NG: master CI が失敗中」コメントを自動投稿
- [ ] master CI 結果を `.github/baseline-status.json` に書き出し（後続ジョブから参照可能）

## Phase 2: 影響テスト推定

- [ ] PR の changed files から影響テストを推定するスクリプト `scripts/affected-tests.js` を新設
  - feature ディレクトリの import グラフを辿る
  - `apps/backend/feature/{name}/**` 変更 → 同 feature の `*.test.ts` 全部
  - `packages/{name}/**` 変更 → 当該 package を import している feature を逆引き
- [ ] 推定結果を PR コメントに表示（「影響テスト: N 件」）
- [ ] 推定漏れに備えて「全 E2E 実行」のフォールバックフラグを PR description で指定可能に

## Phase 3: 重量版（worktree で base 実行）

- [ ] CI で `git worktree add /tmp/baseline origin/master` を実行
- [ ] Phase 2 の影響テストのみ baseline 側で実行
- [ ] 結果を PR コメント（「baseline 側で X 件失敗」）
- [ ] CI 時間が許容外（>15分）なら nightly に降格、PR は軽量版のみに絞る判断軸を文書化

## Phase 4: AIエージェント連携

- [ ] `worktree-setup` skill で master の最新 CI 結果を `.claude/worktree-baseline.json` に出力
- [ ] `feature-dev` skill の冒頭ステップに「`baseline.json` を読んで状態を確認 / NG なら原因切り分けから着手」を追加
- [ ] エージェントプロンプトテンプレートに `## ベースライン状態` セクションを必須化
- [ ] 並列エージェント起動時、各エージェントに baseline ハッシュを渡す（途中で master が変わっても整合性を保つ）

## Phase 5: ドキュメント整備

- [ ] `.claude/rules/baseline-check.md` を新設（書式: parallel-agents.md と同等）
- [ ] CLAUDE.md からリンク
- [ ] エージェントが baseline 確認をスキップした場合に diary に記録するルール追加
- [ ] 過去事例（4/25 notes 破壊）を例として収録

---

## 受け入れ条件

- [ ] PR で base が壊れている時に CI で明確に通知される
- [ ] 過去の「既存テスト壊れ見落とし」事例（4/25 notes など）を後追い再現で CI 検知できる
- [ ] AIエージェント着手時に `baseline.json` が存在し、状態が読める
- [ ] エージェントが baseline NG 状態で着手した場合、diary でその旨が記録される

## 非ゴール

- 100% 自動修復は目指さない（検知して報告するのが責務）
- 全 E2E を毎 PR で 2 回実行することは目指さない（CI 時間と相談）
- baseline 側のテスト失敗を PR の責任としない（あくまで状態通知）

## 関連

- 既存: `.github/workflows/`, `lefthook.yml`
- ルール: `.claude/rules/parallel-agents.md`（エージェント側の検証規律）

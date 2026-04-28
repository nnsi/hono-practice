---
description: 新タスク着手前に master CI の状態を確認するルール。
---

# Baseline チェック

## いつ確認するか

- **新タスク着手前**: feature-dev Phase 0 の最初に必ず確認する
- **worktree 作成後**: `/worktree-setup` が完了したら `.claude/worktree-baseline.json` を読む
- **テスト失敗時**: 自分の変更が原因か master が壊れているかを切り分けるために参照する

## 確認方法

```bash
# worktree 作成後は worktree-baseline.json を読む
cat <worktreeパス>/.claude/worktree-baseline.json

# ファイルがない場合はスクリプトで取得
node scripts/check-baseline.js
node scripts/check-baseline.js --out .claude/worktree-baseline.json
```

## overallStatus の読み方

| 値 | 意味 | 対処 |
|---|---|---|
| `"ok"` | master の全 CI が成功 | 通常通り着手する |
| `"ng"` | master の一部 CI が失敗 | `ngWorkflows` を確認し、原因切り分けから着手する |
| `"unknown"` | gh CLI 未認証等で取得不能 | 着手は可能。テスト失敗時は master 状態も疑うこと |

## NG 時の対処

1. `ngWorkflows` に列挙された workflow 名を確認する
2. その workflow が自分の変更と無関係であれば「master が壊れていた」と記録し、ユーザーに報告する
3. 自分の変更と関連する workflow が NG の場合は、master 時点での状況を git log で確認してから実装に進む
4. **絶対にやってはいけないこと**: NG のまま着手し、テスト失敗を自分の変更のせいだと思い込む

## 過去事例

- **4/25 notes 事件**: master の E2E (notes) が既に壊れていたのに、エージェントが着手。テスト失敗が自分の変更のせいだと誤認し、原因切り分けに無駄な時間をかけた。baseline チェックが機能していれば防げた。

## 関連

- スクリプト: `scripts/check-baseline.js`
- CI ジョブ: `.github/workflows/pr.yml` の `baseline-check` ジョブ（PR に自動コメント）
- worktree セットアップ: `.claude/skills/worktree-setup/SKILL.md`
- feature-dev: `.claude/skills/feature-dev/SKILL.md`（冒頭に確認手順あり）

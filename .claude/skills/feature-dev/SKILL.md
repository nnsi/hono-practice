---
name: feature-dev
description: 機能開発の「完了の定義」チェックリスト。進め方は縛らない。
user_invocable: true
---

# 機能開発チェックリスト

進め方（探索の仕方・エージェントの体数・設計案の数・Phase の順序）は指示しない。判断はオーケストレータが行う。
このスキルは **何が満たされたら完了か** だけを定める。長いセッションで文脈が要約されても抜けないよう、
チェックリストは会話ではなく **計画ドキュメント（`docs/plan/<feature>.md`）の末尾にコピーして**、そこで進捗を管理する。

> 2026-09-10: 300行の手順書から縮小。理由と検証方法は `docs/diary/20260910.md` 参照。抜けが再発した項目だけ戻す。

## 引数

`/feature-dev [--auto]` — `--auto` はレビュー完了後に日記・commit & push・worktree cleanup まで続ける（push 前の確認は省略しない）。

## ユーザー承認が必要な3箇所

1. 要件・設計の確定（計画ドキュメントが承認済みならスキップ）
2. 方針が本質的に分かれる判断が出た時（ユーザーが「任せる」と言っていても、選んだ案と理由は提示する）
3. push 前

それ以外は止まらず進める。Phase ごとの報告は不要。

## 完了の定義

### 着手前
- [ ] 計画ドキュメントがある（`docs/plan/<feature>.md`）。設計判断は ADR に残す（`docs/adr/template.md`）
- [ ] worktree で隔離した（`/worktree-setup`）。worktree パス・API/Vite ポート・DB 名を計画ドキュメントに記録した
- [ ] baseline を確認した（`.claude/rules/baseline-check.md`）。`ng` なら原因切り分けを先にやる
- [ ] 「Web でやることは Mobile でもやるか」を確認し、Mobile 側の変更範囲を計画に書いた

### 実装
- [ ] 手を動かす作業は Codex に委譲した（`CLAUDE.md` の委譲節。effort 明示、`< /dev/null`、自己完結の指示、計画ドキュメントのパスを渡す）
- [ ] 新ロジックにテストを追加した。時刻依存ロジックは property test（`.claude/rules/property-test.md`）
- [ ] 新規 route には Hono 統合テスト（`.claude/rules/integration-test.md`）
- [ ] 横断チェック: i18n（`packages/i18n/locales/{ja,en}/`）、`aria-label` / `accessibilityLabel`、Mobile の `dark:` スタイル
- [ ] フロントのルート追加時は dev server 起動中に作成した（`routeTree.gen.ts` 自動生成。`tsr generate` は使わない）

### 検証（エージェントの報告は信用しない。自分で回す）
- [ ] `pnpm run test-once` → `pnpm run tsc` → `pnpm run fix` を worktree で自分で実行し全パス
- [ ] 新パラメータ・新ロジックが「結果に影響する」ことをテストが担保している（受け付けるだけのテストは不十分）
- [ ] DB 変更: migration 適用 + API が 200 + DB にデータが入ることを確認
- [ ] UI 変更: `/browser-check` で **操作** を確認（表示だけでは不十分）。375px 幅も確認。Mobile は `expo start --web` で確認できる範囲を確認
- [ ] worktree の dev server は自分で起動する（`apps/backend`, `apps/frontend` で `pnpm dev &`）

### レビュー
- [ ] `/review-cycle` で全員 LGTM（Critical は実コードで裏取り、偽陽性は根拠を示してスキップ）
- [ ] レビュー修正後に test-once → tsc → fix を再実行し、`/browser-check` をもう一度やった

### 仕上げ
- [ ] 完了報告: 実装サマリー / 変更ファイル / テスト結果 / ブラウザ確認結果 / worktree 情報。高リスク主張にはエビデンス（`.claude/rules/response-style.md`）
- [ ] push 前にユーザー確認。PR は `gh pr create`、body に Summary / Test plan と会話のシステムリマインダーが指定する attribution 行
- [ ] `--auto` 時: 日記は **メインリポジトリ** で書く（worktree ブランチに含めない）。`npx kill-port <API> <Vite>` → `/worktree-cleanup`（node プロセスを直接 kill しない）

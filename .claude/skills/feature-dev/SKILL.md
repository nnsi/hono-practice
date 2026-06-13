---
name: feature-dev
description: 機能開発の一気通貫ワークフロー。
user_invocable: true
---

# 機能開発ワークフロー

ヒアリングから実装・レビュー・動作確認までを一気通貫で実行するオーケストレーションスキル。

## 引数

`/feature-dev [--auto]`

- `--auto`: 自動化拡張。レビュー完了後に日記・コミット＆プッシュ・worktree cleanupまで自動実行する

## ベースライン確認（着手前に必ず実施）

実装を始める前に master の CI 状態を確認する。

1. `.claude/worktree-baseline.json`（worktree 配下）または `.github/baseline-status.json` を読む
2. ファイルが存在しない場合は `node scripts/check-baseline.js` を実行して取得する
3. `overallStatus` を確認する:
   - `"ok"`: master が緑。通常通り着手する
   - `"ng"`: master が赤。**自分の変更を疑う前に** `ngWorkflows` の workflow を確認し、原因切り分けから着手する。master の壊れが先か、自分の変更が原因かを明確にしてからユーザーに報告する
   - `"unknown"`: gh CLI 未認証等で取得できず。着手は可能だが、テスト失敗時は master 状態も疑うこと

詳細: `.claude/rules/baseline-check.md` 参照

---

## Phase管理: TaskCreateチェックリスト

**feature-dev開始時に、以下のタスクを全て TaskCreate で登録する。**
各Phase完了時に TaskUpdate で `completed` にマークし、次のPhaseに進む前にタスクリストを確認する。

```
Phase 0:  Discovery
Phase 0A: Codebase Exploration
Phase 0B: Clarifying Questions
Phase 0C: Architecture Design
Phase 1:  Worktree Setup
Phase 2:  Implementation + Verification
Phase 3:  Browser Check (1st)
Phase 4:  Review Cycle
Phase 5:  Browser Check (2nd)
Phase 6:  Completion Report
Phase 7:  Commit & PR
```

`--auto` の場合は追加:
```
Phase 8:  Diary
Phase 9:  Cleanup
```

`test-once → tsc → fix` が通っても「完了」ではない。タスクリストを見て次の未完了Phaseに進む。

---

## Phase 0: Discovery

ユーザーから実装内容をヒアリングし、要件を整理する。

1. **要件の確認**: ユーザーの説明から以下を整理する
   - 何を作る/変えるのか（ゴール）
   - 影響範囲（backend / frontend / mobile / packages）
   - 変更の規模感（S / M / L）
2. 不明点があればこの時点で質問する（Phase 0Bの前提情報として必要な分だけ）

## Phase 0A: Codebase Exploration

既存コードを深く理解する。Exploreエージェントを2-3体並列で起動し、それぞれ異なる観点で調査する。

- 類似機能の実装パターンをトレース
- アーキテクチャ・抽象化レイヤーのマッピング
- 関連する既存機能の分析
- parallel-agents.md の「Explore出力テンプレート」に従う
- 各エージェントに「読むべき重要ファイル5-10個のリスト」を返させる

**Sサイズの変更ではスキップ可。**

## Phase 0B: Clarifying Questions

Phase 0Aの調査結果と要件を突き合わせ、曖昧な点を全て洗い出す。

- エッジケース・エラーハンドリング
- 既存機能との統合ポイント
- 後方互換性
- パフォーマンス要件
- **「Webでやることは Mobile でもやる必要があるか？」を必ず自問する**

質問をまとめてユーザーに提示し、**回答を得てからPhase 0Cへ進む**。
ユーザーが「任せる」と言った場合は、自分の判断を提示して明示的な確認を取る。

## Phase 0C: Architecture Design

設計案を**1つ**作り、以下を提示する（2026-06-12 Fable移行で「3案並列作成」から簡素化。設計判断はオーケストレータ自身が行い、検討して捨てた代替案はトレードオフとして言及する）:

- 変更ファイル一覧
- トレードオフ（メリット / デメリット、検討した代替案とそれを選ばなかった理由）
- エージェント分割案（並列可能な作業グループ）
- ブラウザ確認で検証する操作フロー

**Lサイズの変更のみ**、アプローチが本質的に分かれる場合（最小変更 vs 構造変更など）に2案をエージェント並列で作成して比較する。

**おすすめ案とその理由を述べた上で、ユーザーに選択を求める。**
ユーザーが事前に「承認不要」と明示している場合はおすすめ案で進行する。

## Phase 1: Worktree セットアップ

`/worktree-setup` スキルを実行する。

1. worktree名はフィーチャー内容から短い名前を決める（例: `add-tags`, `fix-sync`）
2. `/worktree-setup <name>` を実行
3. 結果から以下を記録し、以降の全Phaseで使う:
   - **worktreeパス**: `.worktrees/<name>` の絶対パス
   - **APIポート / Viteポート**
   - **DB名**

## Phase 2: 実装

サブエージェントまたはエージェントチームで実装する。

`parallel-agents.md` のルールに従う。特にworktree環境では**作業ディレクトリの絶対パス明示**が必須。

### フロントエンドのルート追加がある場合

**実装前にフロントエンドのdev serverを起動する**。TanStack Routerの `routeTree.gen.ts` はViteプラグインが自動生成するため、dev server起動中にルートファイルを作成すれば自動反映される。`tsr generate` コマンドは未使用export削除等の副作用があるため使わない。

```bash
cd <worktreeパス>/apps/frontend && pnpm dev &
```

**まとまった実装はサブエージェントに委譲する。** オーケストレータ（自分）はPhase管理・検証・判断が主務。ただし**数行レベルの修正（レビュー指摘対応、importパス修正、定数変更等）は自分で直してよい** — エージェント往復のオーバーヘッドの方が大きい（2026-06-12 Fable移行で「一切実装しない」から緩和）。新規ファイル作成や複数ファイルにまたがる実装は委譲する。エージェント失敗時のリカバリは、自分で全部巻き取るのではなく別エージェントの再起動を先に検討する。

### 実装完了後の検証

**エージェントの完了報告は信用しない**。以下を自分で実行する:

```bash
cd <worktreeパス> && pnpm run test-once && pnpm run tsc && pnpm run fix
```

さらに、**新しいパラメータ・新しいロジックが実際に使われることをテストで検証する**。「パラメータを受け付ける」テストだけでは不十分。「そのパラメータが計算結果に影響する」ことまで担保されているか確認し、不足していればテストを追加する。

### 横断的関心事チェック

新機能のUIコンポーネントが既存の横断的パターンに従っているか確認する。既存の類似機能と照合し、漏れがあれば対応する。

- **i18n**: `useTranslation` を使っているか。翻訳ファイル（`packages/i18n/locales/{ja,en}/`）に名前空間が追加されているか
- **アクセシビリティ**: `accessibilityLabel`（Mobile）や `aria-label`（Web）が設定されているか
- **ダークモード**（Mobile）: `dark:` プレフィックスのスタイルが適用されているか

全パスするまでPhase 3に進まない。

## Phase 3: ブラウザ動作確認（1回目）

`/browser-check` スキルを実行する。ただしポートはworktree環境のものを使う。

**並列確認**: 複数画面の確認が必要な場合、サブエージェントに `playwright-cli -s <session名>` を使わせることで並列化できる（例: フロントエンドとmobileを同時確認）。

### worktree環境の開発サーバー起動

worktree環境ではメイン環境とポートが分離されているため、自分で起動する:

```bash
cd <worktreeパス>/apps/backend && pnpm dev &
cd <worktreeパス>/apps/frontend && pnpm dev &
```

`apps/admin-frontend` 等、他のフロントエンドアプリが確認対象に含まれる場合はそれも起動し、`.env` がworktreeのバックエンドポートを向いていることを確認する。

### 確認内容

1. **操作検証**: Phase 0で定義した検証フローを実施
2. **モバイルビューポート**: UI変更時は375px × 812pxで確認
3. **React Native Web**（mobileかつRNの範囲で動作確認できるもの）:
   - `cd <worktreeパス>/apps/mobile && npx expo start --web` で起動
   - ブラウザで操作確認

### 問題発見時

- 問題があればPhase 2に戻って修正
- 修正後は再度 `test-once` → `tsc` → `fix` を通す

## Phase 4: レビューサイクル

`/review-cycle` スキルを実行する。

- レビュー対象はworktreeパス内の変更ファイルがあるディレクトリ
- Codexの `-C` パスはworktreeパスを指定
- 両方からLGTMが出るまで繰り返す
- レビュー指摘の修正もサブエージェントに委譲する（Phase 2と同じ理由）
- 修正後は `test-once` → `tsc` → `fix` を必ず通す

## Phase 5: ブラウザ動作確認（2回目）

Phase 4の修正でリグレッションが入っていないことを確認する。

- `/browser-check` スキルを実行（Phase 3と同じ手順）
- 特にレビュー修正で変更した箇所に注目
- 問題があればPhase 4に戻る（修正 → レビュー → 確認のループ）

## Phase 6: 完了報告

ユーザーに以下を報告する:
- 実装内容のサマリー
- 変更ファイル一覧
- テスト結果
- ブラウザ確認結果
- worktree情報（パス、ブランチ名）

### Phase 7: コミット＆プッシュ＆PR作成

worktreeのブランチで:

```bash
cd <worktreeパス>
git add -A
git commit -m "<コミットメッセージ>"
git push -u origin wt/<name>
```

- コミットメッセージはPhase 0のゴールに基づいて作成
- pushする前にユーザーに確認（`--auto` でもpushは確認する）

push後、PRを作成する:

```bash
cd <worktreeパス>
gh pr create --title "<PRタイトル>" --body "$(cat <<'EOF'
## Summary
<実装内容の要点を1-3行>

## Test plan
<テスト・動作確認の結果>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- PRタイトルはPhase 0のゴールから簡潔に作成（70文字以内）
- bodyにはPhase 6の完了報告内容を反映

---

## `--auto` 指定時の追加Phase

### Phase 8: 日記

`/write-diary` スキルを**メインリポジトリ（worktreeではない）**で実行する。worktreeブランチに含めない。理由: 並行して複数の feature-dev を走らせた場合、日記が必ずconflictするため。

### Phase 9: クリーンアップ

1. worktree内の開発サーバープロセスをポート指定でkill

```bash
npx kill-port <APIポート> <Viteポート>
```

**絶対に `node.exe` や `node` プロセスを直接killしないこと。Claude Code自身がNode.jsで動いているため自滅する。**

ポートkillに失敗した場合（プロセスがロックしている等）は、その旨ユーザーに伝えてPhase 9を完了としてよい。手動対処コマンドを提示する。

2. `/worktree-cleanup <name>` を実行

## 注意事項

- **ユーザー承認が必要なのは3箇所のみ**: Phase 0B（質問への回答）、Phase 0C（設計の選択）、Phase 7（push前の確認）。それ以外のPhaseは停止せず連続実行し、Phase完了時は簡潔な進捗報告に留める（2026-06-12 Fable移行で「各Phase完了ごとに報告して次へ」から変更。長く自律的に走らせる方が品質・速度ともに良い）
- **Phase間でコンテキストを引き継ぐ**: worktreeパス、ポート番号、Explore結果、検証フロー定義
- **開発サーバーはworktree環境でのみ起動する**（メイン環境は触らない）
- **ブラウザ確認はplaywright-cliで実施する**（`/browser-check` 参照）。`-s <session名>` でセッションを分離すればサブエージェントに委譲・並列化できる（Phase 3/5の複数画面確認に有効）

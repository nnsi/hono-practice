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

**このPhaseはスキップ禁止。**

Phase 0Aの調査結果と要件を突き合わせ、曖昧な点を全て洗い出す。

- エッジケース・エラーハンドリング
- 既存機能との統合ポイント
- 後方互換性
- パフォーマンス要件
- **「Webでやることは Mobile でもやる必要があるか？」を必ず自問する**

質問をまとめてユーザーに提示し、**回答を得てからPhase 0Cへ進む**。
ユーザーが「任せる」と言った場合は、自分の判断を提示して明示的な確認を取る。

## Phase 0C: Architecture Design

2-3体の `code-architect` 的なエージェントを並列起動し、異なるアプローチで設計案を作る。

| エージェント | フォーカス |
|-------------|-----------|
| A | **最小変更** — 既存コード最大活用、変更量最小 |
| B | **クリーン設計** — 保守性・拡張性重視 |
| C | **実用バランス** — 速度と品質のバランス（省略可） |

各案について以下を提示する:
- 変更ファイル一覧
- トレードオフ（メリット / デメリット）
- エージェント分割案（並列可能な作業グループ）
- ブラウザ確認で検証する操作フロー

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

### 実装完了後の検証

**エージェントの完了報告は信用しない**。以下を自分で実行する:

```bash
cd <worktreeパス> && pnpm run test-once && pnpm run tsc && pnpm run fix
```

全パスするまでPhase 3に進まない。

## Phase 3: ブラウザ動作確認（1回目）
03572
`/browser-check` スキルの手順に従う。ただしポートはworktree環境のものを使う。

### worktree環境の開発サーバー起動

worktree環境ではメイン環境とポートが分離されているため、自分で起動する:

```bash
cd <worktreeパス>/apps/backend && pnpm dev &
cd <worktreeパス>/apps/frontend && pnpm dev &
```

### 確認内容

1. **フロントエンド**: Viteポートにアクセスして表示確認
2. **操作検証**: Phase 0で定義した検証フローを実施
3. **モバイルビューポート**: UI変更時は375px × 812pxで確認
4. **React Native Web**（mobileかつRNの範囲で動作確認できるもの）:
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
- 修正後は `test-once` → `tsc` → `fix` を必ず通す

## Phase 5: ブラウザ動作確認（2回目）

Phase 4の修正でリグレッションが入っていないことを確認する。

- Phase 3と同じ手順でブラウザ確認
- 特にレビュー修正で変更した箇所に注目
- 問題があればPhase 4に戻る（修正 → レビュー → 確認のループ）

## Phase 6: 完了報告

ユーザーに以下を報告する:
- 実装内容のサマリー
- 変更ファイル一覧
- テスト結果
- ブラウザ確認結果
- worktree情報（パス、ブランチ名）

---

## `--auto` 指定時の追加Phase

### Phase 7: 日記

`/write-diary` スキルを実行する。

### Phase 8: コミット＆プッシュ＆PR作成

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

### Phase 9: クリーンアップ

1. worktree内の開発サーバープロセスをkill

```bash
# worktreeで起動したdev serverのプロセスを探してkill
lsof -ti:<APIポート> | xargs kill -9 2>/dev/null
lsof -ti:<Viteポート> | xargs kill -9 2>/dev/null
```

2. `/worktree-cleanup <name>` を実行

## 注意事項

- **各Phaseの完了をユーザーに報告してから次に進む**（ただし `--auto` のPhase 7-9は連続実行）
- **Phase間でコンテキストを引き継ぐ**: worktreeパス、ポート番号、Explore結果、検証フロー定義
- **開発サーバーはworktree環境でのみ起動する**（メイン環境は触らない）
- **ブラウザ確認はサブエージェントに委譲できない**（Chrome MCPアクセス権がメインエージェントのみ）

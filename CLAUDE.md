# CLAUDE.md

Claude Code (claude.ai/code)向けのガイダンス

## 🚫 最重要制限事項

### 使用言語
日本語を利用すること。

### 開発サーバーの起動
- **開発サーバーは絶対に起動しないでください**
- ユーザー側で既に起動しているため、Claude Code側での起動は不要です
- `npm run dev`、`npm run client-dev` などのサーバー起動コマンドは実行しないでください
- **重要: 開発サーバーのポートは5173です（3000ではありません）**
- **重要: バックエンドAPIサーバーのポートは3456です（4000ではありません）**

### ブラウザ動作確認
- **「ブラウザで動作確認して」と言われた場合は、Playwright MCPを使用する**
- 手動確認を求めるのではなく、必ずPlaywrightで自動的に動作確認を実施すること
- `mcp__playwright__browser_navigate`でアクセス、`mcp__playwright__browser_snapshot`で状態確認

## 🔨 新しいルールの追加プロセス

ユーザーから常に対応が必要だと思われる指示を受けた場合：
1. 「これを標準のルールにしますか？」と質問する
2. YESの回答を得た場合、CLAUDE.mdに追加ルールとして記載する
3. 以降は標準ルールとして常に適用する

## プロジェクト概要

**Actiko** - どのアプリよりも最速で活動量を記録することを目指し、極限までシンプルに研ぎ澄ませたUXを実現する個人向け活動記録アプリケーション。

### 最重要原則
- **パフォーマンス**: 「最速で活動量を記録する」ことが最優先目標
- **UX**: 極限までシンプルに研ぎ澄ませたUX、操作回数を最小限に
- **検証**: タスクが実際に完了していない場合は絶対に完了としない

## 📚 詳細ドキュメント

詳細は `/docs/knowledges/` を参照：
- `structure.md` - プロジェクト構造
- `auth_flow.md` - 認証フロー
- `backend.md` - バックエンドアーキテクチャ
- `frontend.md` - フロントエンドアーキテクチャ
- `mobile.md` - モバイルアプリ
- `database.md` - データベース設計

## 必須コマンド

### テストと品質管理
```bash
# テストを一度だけ実行（CIモード） - 常にこれを使用
npm run test-once

# TypeScriptコンパイルチェック
npm run tsc

# コードフォーマット（biome+eslint）
npm run fix

# 全てのCIチェックを実行
npm run ci-check
```

### データベース
```bash
# マイグレーション生成
npm run db-generate

# マイグレーション適用
npm run db-migrate
```

## 重要な開発規約

### リポジトリメソッド名規則
**重要**: Repositoryのメソッド名には必ずドメイン名を含める
- 例：`createApiKey`、`findApiKeyById`（❌ `create`、`findById`）
- `withTx`でトランザクション内で複数リポジトリ使用時の名前衝突を防ぐため

### TypeScript基本ルール
- **型定義は `type` を使用**（`interface`は使わない）
- **ファクトリ関数パターン**: `newXXX`関数で依存注入
- **エラーハンドリング**: try-catchは使わず、`throw`で例外をスロー

### テスト実行時の注意
- **型エラーを全て修正してテストも全て通らないとコミットできない**
- `npm run test-once` で全テスト通過を確認
- `npm run tsc` でコンパイルエラーなしを確認
- `npm run fix` でフォーマットを整える
- APIパラメータフォーマット変更に注意（例：mutationのパラメータ構造）

## 🔧 開発効率化

### Serena MCPの活用
コードベース解析・検索には **Serena MCP** を積極的に使用：
- `find_symbol` - シンボル定義を素早く検索
- `find_referencing_symbols` - 参照箇所を網羅的に発見
- `search_for_pattern` - 正規表現による高度な検索
- `get_symbols_overview` - ファイル構造を俯瞰

通常のgrep/findより優れている点：
- TypeScript/JavaScriptの構文を理解した正確な検索
- 大規模コードベースでも高速
- 依存関係やリファレンスの追跡が容易
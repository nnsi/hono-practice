# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code)向けのガイダンスを提供します。

## 🚫 重要な制限事項

### 使用言語

日本語を利用すること。

### 開発サーバーの起動
- **開発サーバーは絶対に起動しないでください**
- ユーザー側で既に起動しているため、Claude Code側での起動は不要です
- `npm run dev`、`npm run client-dev` などのサーバー起動コマンドは実行しないでください

### ブラウザ動作確認
- **「ブラウザで動作確認して」と言われた場合は、Playwright MCPを使用してブラウザ上で動作確認を行う**
- 手動確認を求めるのではなく、必ずPlaywrightで自動的に動作確認を実施すること
- `mcp__playwright__browser_navigate`でページにアクセスし、`mcp__playwright__browser_snapshot`で状態を確認する

## 🔨 最重要ルール - 新しいルールの追加プロセス

ユーザーから今回限りではなく常に対応が必要だと思われる指示を受けた場合：

1. 「これを標準のルールにしますか？」と質問する
2. YESの回答を得た場合、CLAUDE.mdに追加ルールとして記載する
3. 以降は標準ルールとして常に適用する

このプロセスにより、プロジェクトのルールを継続的に改善していきます。

## プロジェクト概要

**Actiko** - どのアプリよりも最速で活動量を記録することを目指し、極限までシンプルに研ぎ澄ませたUXを実現する個人向け活動記録アプリケーション。

## 📚 プロジェクトドキュメント

詳細なアーキテクチャ、技術仕様、実装ガイドラインについては、**`/docs/knowledges`ディレクトリ**を参照してください：

- **🏗️ `structure.md`** - プロジェクト全体の構造
- **🔐 `auth_flow.md`** - 認証フローの詳細
- **🔧 `backend.md`** - バックエンドアーキテクチャ
- **🎨 `frontend.md`** - フロントエンドアーキテクチャとテスト戦略
- **📱 `mobile.md`** - モバイルアプリの構造
- **🗜️ `database.md`** - データベース設計とスキーマ

作業を開始する前に、関連するドキュメントを確認してください。

## セットアップ

### 初回セットアップ
```bash
# 完全なセットアップ（依存関係インストール、環境変数設定、DB構築）
make setup

# 環境変数のみセットアップ（利用可能なポートを自動検出）
make setup-env
```

`make setup-env`は以下を自動的に行います：
- 使用可能なポートをスキャンして検出
- .envファイルを生成（API_PORT、VITE_PORT等を設定）
- git worktreeでの並行開発に対応

## コマンド

### 開発
```bash
# バックエンド開発サーバーの起動 (デフォルトポート3456)
npm run dev

# フロントエンド開発サーバーの起動 (デフォルトポート5173)
npm run client-dev

# モバイル開発サーバーの起動 (デフォルトポート8081)
npm run mobile-dev

# フロントエンドとバックエンドを同時に起動
npm run dev & npm run client-dev
```

### データベース
```bash
# スキーマ変更後のマイグレーション生成
npm run db-generate

# マイグレーションの適用
npm run db-migrate

# Dockerでローカルデータベースを起動
docker-compose up -d  # PostgreSQLコンテナの起動
```

### テストと品質管理

- フロントエンドのテスト戦略については `/docs/knowledges/frontend.md` を参照
- バックエンドのテスト戦略については `/docs/knowledges/backend.md` を参照

```bash
# テストを一度だけ実行（CIモード）
npm run test-once

# 注意: npm run test（ウォッチモード）は使用禁止
# 常に npm run test-once を使用すること

# 全てのCIチェックを実行（テスト＋リンティング）
npm run ci-check

# コードのリント(TypeScript)
npm run tsc

# コードのリント(biome+eslint)
npm run fix
```

### ビルドとデプロイ
```bash
# ステージング用フロントエンドのビルド
npm run build-client-stg

# 本番用フロントエンドのビルド
npm run build-client

# ステージングへのデプロイ（Cloudflare認証情報が必要）
npm run deploy:stg

# 本番へのデプロイ（Cloudflare認証情報が必要）
npm run deploy:prod
```

## アーキテクチャ概要

詳細なアーキテクチャについては以下のドキュメントを参照：
- **バックエンド**: `/docs/knowledges/backend.md`
- **フロントエンド**: `/docs/knowledges/frontend.md`
- **モバイル**: `/docs/knowledges/mobile.md`

### 重要なパターン
1. **パスエイリアス**: `@backend/*`、`@frontend/*`、`@dtos/*`インポートを使用
2. **モノレポ**: npm workspacesでapps/とpackages/構造

## コーディング規約

### TypeScriptのスタイルガイド
- **型定義は `type` を使用** - `interface`は使わず、全て`type`で統一
- **ファクトリ関数パターン** - `newXXX`関数で依存注入を行い、オブジェクトを返す
- **関数の分割** - オブジェクトメソッドは個別の関数として定義し、ファクトリ関数内で組み立てる
- **エラーハンドリング** - try-catchは使わず、`throw`で例外をスロー。エラーハンドリングはRoute層またはグローバルミドルウェアで行う

### インポート順序（ESLintで強制）
1. React、Hono等のビルトインモジュール
2. 外部ライブラリ
3. 内部モジュール（`@backend/*`、`@frontend/*`、`@dtos/*`等）
4. 相対パス
- グループ間は空行で区切る
- 各グループ内はアルファベット順

### Biome/ESLint設定
- インデント：スペース2つ
- クォート：ダブルクォート
- 自動生成ファイル（`*.gen.ts`）は無視
- `no-explicit-any`、`no-non-null-assertion`等は無効化

### フロントエンドアーキテクチャ方針
- **コンポーネント**: 純粋なプレゼンテーション層として実装（ビジネスロジックは含まない）
- **カスタムフック**: すべてのロジックを集約（状態管理、API通信、ビジネスロジック、イベントハンドラー）
- **テスト**: フックのユニットテストでビジネスロジックを100%カバー

詳細は `/docs/knowledges/frontend.md` を参照

## セキュリティ

認証フローの詳細については `/docs/knowledges/auth_flow.md` を参照

## 環境変数の管理

### 必須環境変数（`config.ts`で定義）
- `APP_URL` - アプリケーションのURL
- `JWT_SECRET` - JWT署名用の秘密鍵（32文字以上）
- `NODE_ENV` - 環境（development/stg/production/test）
- `DATABASE_URL` - PostgreSQL接続文字列
- `API_PORT` - APIサーバーのポート（オプション）
- `GOOGLE_OAUTH_CLIENT_ID` - Google OAuth認証用（デフォルト：dummy-string）

### 環境変数の利用
- バックエンド：`c.env`からアクセス（Honoのコンテキスト経由）
- フロントエンド：`import.meta.env`を使用
- ローカル開発：`.env`ファイルを使用（gitignore対象）

### git worktreeでの並行開発
並行開発時は環境変数でポートを変更可能：

**バックエンド:**
- `API_PORT` - APIサーバーのポート（デフォルト: 3456）

**フロントエンド:**
- `VITE_PORT` - 開発サーバーのポート（デフォルト: 5173）
- `VITE_API_URL` - API接続先URL（完全なURLを指定）
- `VITE_API_PORT` - API接続先ポート（VITE_API_URLが未設定時に使用）

**モバイル:**
- `EXPO_PUBLIC_API_URL` - API接続先URL（完全なURLを指定）
- `EXPO_PUBLIC_API_PORT` - API接続先ポート（デフォルト: 3456）

例：worktree1で開発する場合
```bash
# .env
API_PORT=3457
VITE_PORT=5174
VITE_API_PORT=3457
EXPO_PUBLIC_API_PORT=3457
```

## デプロイメント

### デプロイ先
- **フロントエンド**: Cloudflare Pages
- **バックエンド**: Cloudflare Workers
- **データベース**: Neon PostgreSQL

### デプロイコマンド
```bash
# ステージング環境へのデプロイ
npm run deploy:stg

# 本番環境へのデプロイ
npm run deploy:prod
```

### Wrangler設定
- `wrangler.toml`で環境ごとの設定を管理
- 環境変数は`[env.stg.vars]`、`[env.production.vars]`で設定

## Git規約

### コミットメッセージ
- 日本語での簡潔なメッセージを使用
- 絵文字の使用も可（例：🚨、🔨）
- 長いメッセージは避け、1行で完結させる

### ブランチ戦略
- メインブランチ：`master`
- リリースブランチ：`release`
- 機能ブランチ：必要に応じて作成

### Git Hooks（lefthook）
- **pre-commit**: Biomeでのリント + Vitestでのテスト実行
- コミット前に自動でコード品質をチェック


## データベース

データベース設計とスキーマの詳細については `/docs/knowledges/database.md` を参照

### マイグレーションコマンド
```bash
# スキーマ変更後のマイグレーション生成
npm run db-generate

# マイグレーションの適用
npm run db-migrate
```

### リポジトリメソッド名規則
- **重要**: Repositoryのメソッド名には必ずドメイン名を含める（例：`createApiKey`、`findApiKeyById`）
- これは`withTx`でトランザクション内で複数のリポジトリを使用する際の名前衝突を防ぐため
- 例：`create`ではなく`createApiKey`、`findById`ではなく`findApiKeyById`とする

## エラーハンドリング

### エラー処理の原則
- ビジネスロジック層では例外をスロー
- Route層でキャッチしてHTTPレスポンスに変換
- クライアントには適切なエラーメッセージを返す

### カスタムエラークラス
- `AppError` - 基底エラークラス（HTTPステータスコード付き）
- `UnauthorizedError` - 認証エラー（401）
- `ResourceNotFoundError` - リソース不在（404）
- `DomainValidateError` - ドメイン検証エラー
- `SqlExecutionError` - DB実行エラー

## 重要な注意事項

### パフォーマンス
- 「どのアプリよりも最速で活動量を記録する」ことが最優先目標
- UIの応答性を重視し、不要な処理は排除する
- ローディング状態は最小限に抑える

### UX原則
- 「極限までシンプルに研ぎ澄ませたUX」を常に意識
- 操作回数を最小限に抑える
- 直感的なインターフェースを優先
- 余分な機能は追加しない

### 開発時の注意
- 新機能追加時は既存のUXを損なわないか確認
- 全ての変更はテストを通してから commit
- デプロイ前に必ずステージング環境での動作確認を行う
- **タスクが実際に完了していない場合は絶対に完了としない**
- **検証・確認ができていないタスクは未完了のままにする**

## 🔧 開発効率化ツール

### Serena MCP の活用
コードベースの解析・検索には **Serena MCP** を積極的に使用すること。特に以下のケースで効果的：

- **シンボル検索** - 関数、クラス、メソッドなどの定義を素早く探す
  - `find_symbol` で名前パスからシンボルを特定
  - `find_referencing_symbols` で参照箇所を網羅的に発見
  
- **パターン検索** - 特定のコードパターンやエラー箇所の特定
  - `search_for_pattern` で正規表現による高度な検索
  - コンテキスト行数を指定して周辺コードも確認可能

- **ファイル構造の把握**
  - `get_symbols_overview` でファイル内のシンボル構造を俯瞰
  - `list_dir` より詳細なコード構造の理解が可能

Serena MCPは通常のgrep/findコマンドより以下の点で優れている：
- TypeScript/JavaScriptの構文を理解した正確なシンボル検索
- 大規模コードベースでも高速な検索性能
- 依存関係やリファレンスの追跡が容易
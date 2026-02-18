.PHONY: setup setup-db setup-env install migrate seed dev reset-db clean-db help

# デフォルトターゲット
.DEFAULT_GOAL := help

# ヘルプ
help:
	@echo "利用可能なコマンド:"
	@echo "  make setup      - 初期セットアップ（全て実行）"
	@echo "  make setup-db   - データベースのセットアップ（マイグレーション＋シード）"
	@echo "  make setup-env  - 環境変数ファイルのセットアップ"
	@echo "  make install    - 依存関係のインストール"
	@echo "  make migrate    - データベースマイグレーション"
	@echo "  make seed       - テストデータの投入"
	@echo "  make dev        - 開発サーバーの起動"
	@echo "  make reset-db   - データベースをリセット（全データ削除＋再構築）"
	@echo "  make clean-db   - データベースの全データを削除"

# 完全な初期セットアップ
setup: install setup-env setup-db
	@echo "✅ セットアップが完了しました！"
	@echo ""
	@echo "開発サーバーを起動するには以下を実行してください:"
	@echo "  make dev"

# 依存関係のインストール
install:
	@echo "📦 依存関係をインストール中..."
	npm install

# 環境変数ファイルのセットアップ
setup-env:
	@echo "🔧 環境変数ファイルをセットアップ中..."
	@echo "🔍 利用可能なポートを検索して設定します..."
	@node scripts/setup-ports.js

# データベースのセットアップ
setup-db: migrate seed
	@echo "✅ データベースのセットアップが完了しました"

# データベースマイグレーション
migrate:
	@echo "🗄️  データベースマイグレーションを実行中..."
	npm run db-generate
	npm run db-migrate

# テストデータの投入
seed:
	@echo "🌱 テストデータを投入中..."
	npm run db-seed

# 開発サーバーの起動
dev:
	@echo "🚀 開発サーバーを起動中..."
	@echo "  Backend: http://localhost:3456"
	@echo "  Frontend: http://localhost:1357"
	@echo ""
	npm run dev & npm run client-dev

# データベースをリセット（全データ削除＋再構築）
reset-db: clean-db setup-db
	@echo "✅ データベースがリセットされました"

# データベースの全データを削除
clean-db:
	@echo "🗑️  データベースの全データを削除中..."
	@echo "⚠️  この操作により全てのデータが削除されます！"
	@read -p "続行しますか？ (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "全テーブルのデータを削除しています..."; \
		npm run db-clean; \
	else \
		echo "操作がキャンセルされました"; \
		exit 1; \
	fi
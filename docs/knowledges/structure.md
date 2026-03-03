# プロジェクト概要

Actikoは、「どのアプリよりも最速で活動量を記録する」ことを目指す個人向け活動記録アプリケーション。
モノレポ構造（pnpm workspaces）でWeb・モバイル・バックエンドを統合管理している。

## モノレポ構造

```txt
hono-practice/
├── apps/
│   ├── backend/       # バックエンドAPI (Hono + Cloudflare Workers)
│   ├── frontend-v2/   # Webフロントエンド (React + Vite + Dexie.js)
│   ├── mobile-v2/     # モバイルアプリ (React Native + Expo)
│   └── tail-worker/   # Cloudflare Tail Worker (ログ収集)
├── packages/
│   ├── domain/        # 共有ドメインロジック（純粋TS、フレームワーク非依存）
│   ├── types/         # 共有型定義（API DTO、Zodスキーマ）
│   ├── frontend-shared/ # フロント共通フック・ユーティリティ
│   ├── sync-engine/   # オフライン同期エンジン
│   └── platform/      # プラットフォーム固有アダプター
├── infra/
│   └── drizzle/       # データベーススキーマ・マイグレーション
├── e2e/               # E2Eテスト (Playwright)
├── scripts/           # スキャフォールドスクリプト等
├── docs/
│   ├── knowledges/    # 設計ドキュメント
│   └── todo/          # タスク管理
└── package.json       # ワークスペース設定
```

## プロジェクト構造（バックエンド）

```txt
apps/backend/
├── feature/           # v1 APIエンドポイント群
│   ├── activity/      # 活動記録機能
│   ├── activityLog/   # 活動ログ機能
│   ├── activitygoal/  # 活動目標機能
│   ├── apiKey/        # APIキー管理機能
│   ├── auth/          # 認証機能
│   ├── goal/          # 目標設定機能
│   ├── r2proxy/       # R2画像プロキシ
│   ├── subscription/  # サブスクリプション管理機能
│   ├── task/          # タスク管理機能
│   └── user/          # ユーザー管理機能
│
├── feature-v2/        # v2 同期対応エンドポイント群
│   ├── activity/      # 活動記録（同期対応）
│   ├── activity-log/  # 活動ログ（同期対応）
│   ├── goal/          # 目標（同期対応）
│   └── task/          # タスク（同期対応）
│
├── api/               # レガシーAPI v1ルート
├── query/             # クエリサービス（読み取り専用、CQRS）
├── context/           # Honoコンテキスト型定義
├── error/             # カスタムエラー定義
├── middleware/         # ミドルウェア群
├── infra/             # インフラ層（DB接続）
├── lib/               # レイヤー外の関数群
├── utils/             # ユーティリティ
├── config.ts          # アプリケーション設定（Zodバリデーション）
├── app.ts             # アプリケーションエントリ（ルート登録）
├── server.cf.ts       # Cloudflare Workers用サーバー設定
├── server.node.ts     # Node.js用サーバー設定（ローカル開発）
├── test.setup.ts      # テストセットアップ
└── package.json       # 依存関係管理
```

## プロジェクト構造（フロントエンド: frontend-v2）

```txt
apps/frontend-v2/
├── src/
│   ├── components/        # UIコンポーネント（機能別）
│   │   ├── actiko/       # 活動記録メイン画面
│   │   ├── common/       # 共通UI（ModalOverlay, DatePicker等）
│   │   ├── csv/          # CSVインポート/エクスポート
│   │   ├── daily/        # 日次記録画面
│   │   ├── goal/         # 目標管理画面
│   │   ├── root/         # ルートレベル（認証フォーム等）
│   │   ├── setting/      # 設定画面
│   │   ├── stats/        # 統計画面
│   │   └── tasks/        # タスク管理画面
│   ├── db/               # Dexie.jsスキーマ・リポジトリ
│   ├── hooks/            # カスタムフック（ビジネスロジック）
│   ├── routes/           # TanStack Routerルート定義
│   ├── sync/             # 同期エンジン（バックグラウンド同期）
│   ├── api/              # API関連
│   ├── types/            # 型定義
│   ├── utils/            # ユーティリティ（apiClient等）
│   ├── main.tsx          # エントリーポイント
│   └── routeTree.gen.ts  # 自動生成ルート定義
├── package.json
├── vite.config.ts
└── index.html
```

## プロジェクト構造（モバイル: mobile-v2）

```txt
apps/mobile-v2/
├── app/                   # Expo Routerルーティング
│   ├── (auth)/           # 認証画面群
│   ├── (tabs)/           # タブナビゲーション画面群
│   └── _layout.tsx       # ルートレイアウト
├── src/
│   ├── components/       # UIコンポーネント（frontend-v2と同構成）
│   ├── db/               # expo-sqlite + Web用sql.jsシム
│   ├── hooks/            # カスタムフック
│   ├── repositories/     # データアクセス層
│   ├── sync/             # 同期エンジン
│   └── utils/            # ユーティリティ（apiClient等）
├── metro.config.js       # Metro設定（expo-sqliteリダイレクト）
├── app.json              # Expo設定
└── package.json
```

## 共有パッケージ

### packages/domain
フレームワーク非依存のドメインロジック。バックエンド・フロントエンド両方から参照。

```txt
packages/domain/
├── activity/         # Activity型、スキーマ、ソート、リポジトリIF
├── activityLog/      # ActivityLog型、バリデーション、リポジトリIF
├── goal/             # Goal型、残高計算、統計、述語関数
├── task/             # Task型、グルーピング、ソート、述語関数
├── auth/             # 認証関連スキーマ
├── apiKey/           # APIキースキーマ
├── csv/              # CSVパーサー・エクスポート
├── image/            # 画像処理型
├── subscription/     # サブスクリプションスキーマ
├── sync/             # 同期可能レコード基底型（_syncStatus）
├── time/             # 時間ユーティリティ
├── user/             # ユーザースキーマ
├── errors.ts         # ドメインエラー定義
└── index.ts          # バレルエクスポート
```

### packages/sync-engine
オフライン同期のコアロジック。

```txt
packages/sync-engine/
├── core/             # チャンク同期、状態管理
├── http/             # 認証付きfetchラッパー
├── mappers/          # snake_case ↔ camelCase変換
└── index.ts
```

### packages/platform
プラットフォーム固有の抽象化レイヤー。

```txt
packages/platform/
├── auth/             # トークンストレージIF
├── adapters.ts       # プラットフォーム検出・アダプター
└── index.ts
```

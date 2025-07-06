# プロジェクト概要

Actikoは、「どのアプリよりも最速で活動量を記録する」ことを目指す個人向け活動記録アプリケーションです。
モノレポ構造でWeb、モバイル、バックエンドを統合管理しています。

## モノレポ構造

```txt
hono-practice/
├── apps/
│   ├── backend/    # バックエンドAPI (Hono + Cloudflare Workers)
│   ├── frontend/   # Webフロントエンド (React + Vite)
│   └── mobile/     # モバイルアプリ (React Native + Expo)
├── packages/
│   ├── types/      # 共有型定義（DTO、Zodスキーマ）
│   └── frontend-shared/  # フロント共通ユーティリティ
├── infra/
│   └── drizzle/    # データベーススキーマ・マイグレーション
├── docs/
│   ├── knowledges/ # ドキュメント
│   └── todo/       # タスク管理
└── package.json    # ワークスペース設定
```

## プロジェクト構造(バックエンド)

```txt
apps/backend/
├── domain/         # ドメインモデル層
│   ├── auth/       # 認証関連のドメインモデル
│   ├── sync/       # 同期関連のドメインモデル
│   └── {feature}/  # 機能単位で分割されたドメインモデル
│
├── feature/        # routing(DI)/handler/usecase/repository
│   ├── activity/   # 活動記録機能
│   ├── activityLog/# 活動ログ機能
│   ├── auth/       # 認証機能
│   ├── goal/       # 目標設定機能
│   ├── sync/       # 同期機能
│   ├── task/       # タスク管理機能
│   ├── user/       # ユーザー管理機能
│   └── {feature}/  # 機能単位で分割されたレイヤ群
│       └── test/   # Route(エンドポイント), Usecaseのテスト
│
├── infra/          # インフラ層
│   ├── db.ts       # 抽象化されたDB操作を扱うファイル
│   └── drizzle/    # ORM設定 (Drizzle)
│
├── error/          # カスタムエラー定義
├── middleware/     # ミドルウェア
├── lib/            # レイヤー外の関数群
├── context/        # Honoコンテキスト定義
├── query/          # クエリサービス
├── config.ts       # アプリケーション設定
├── .env            # 環境変数
├── .env.local      # ローカル環境変数
├── test.setup.ts   # テストセットアップ
├── server.cf.ts    # Cloudflare Workers用サーバー設定
├── server.node.ts  # Node.js用サーバー設定
├── app.ts          # アプリケーションエントリ
└── package.json    # 依存関係管理
```

## プロジェクト構造(フロントエンド)

```txt
apps/frontend/
├── src/                   # ソースコード
│   ├── components/        # 共通コンポーネント
│   │   ├── ui/            # 基本的なUIコンポーネント
│   │   └─── {feature}/    # 機能単位で分割されたコンポーネント
│   ├── hooks/             # カスタムフック
│   ├── providers/         # コンテキストプロバイダー
│   ├── routes/            # ルーティング定義
│   ├── utils/             # ユーティリティ関数
│   ├── main.tsx           # アプリケーションエントリ
│   └── routeTree.gen.ts   # ルーティングツリー生成ファイル
│
├── public/                # 静的ファイル
├── package.json           # 依存関係管理
├── vite.config.ts         # Vite設定
├── tsr.config.json        # Tanstack Router設定
├── tailwind.config.cjs    # Tailwind CSS設定
├── postcss.config.cjs     # PostCSS設定
├── components.json        # Tailwind設定
├── main.css               # メインCSS
├── output.css             # ビルド済みCSS
├── index.html             # エントリHTML
├── vite-env.d.ts          # Viteの型定義ファイル
├── .env.production        # 本番環境用環境変数
├── .env.stg               # ステージング環境用環境変数
└── stats.html             # ビルド統計情報
```

## プロジェクト構造(モバイル)

```txt
apps/mobile/
├── app/                    # ルーティング定義（Expo Router）
│   ├── (auth)/            # 認証必須画面
│   │   ├── _layout.tsx    # 認証レイアウト
│   │   ├── activity/      # 活動関連画面
│   │   │   ├── [id].tsx   # 活動詳細
│   │   │   └── new.tsx    # 新規活動作成
│   │   ├── goals/         # 目標設定画面
│   │   │   └── [year].[month].tsx  # 月次目標
│   │   ├── settings.tsx   # 設定画面
│   │   ├── tasks.tsx      # タスク一覧画面
│   │   └── today.tsx      # 今日の活動記録画面
│   ├── _layout.tsx        # ルートレイアウト
│   ├── index.tsx          # エントリーポイント
│   ├── login.tsx          # ログイン画面
│   └── register.tsx       # ユーザー登録画面
│
├── components/            # UIコンポーネント
│   ├── activity/         # 活動記録関連コンポーネント
│   ├── common/           # 共通コンポーネント
│   ├── goal/             # 目標設定関連コンポーネント
│   └── task/             # タスク管理関連コンポーネント
│
├── hooks/                # カスタムフック
│   ├── useActivities.ts  # 活動データ管理
│   ├── useAuth.ts        # 認証管理
│   └── useTasks.ts       # タスク管理
│
├── services/             # APIクライアント・サービス
│   ├── api/             # API通信
│   └── storage/         # ローカルストレージ管理
│
├── utils/                # ユーティリティ関数
├── constants/            # 定数定義
├── types/                # 型定義
├── app.json             # Expoアプリ設定
├── expo-env.d.ts        # Expo型定義
├── babel.config.js      # Babel設定
├── metro.config.js      # Metro設定
├── tsconfig.json        # TypeScript設定
├── .env                 # 環境変数
└── package.json         # 依存関係管理
```

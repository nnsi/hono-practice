# Actiko プロジェクト概要

Actikoは「どのアプリよりも最速で活動量を記録する」ことを目指す個人向け活動記録アプリケーションです。

## 技術スタック

### バックエンド
- **Hono** + Cloudflare Workers
- **PostgreSQL** (Neon) + Drizzle ORM
- **TypeScript**
- JWT認証 + Google OAuth

### フロントエンド
- **React 19** + TypeScript
- **Vite** (ビルドツール)
- **Tanstack Router** (ルーティング)
- **Tanstack Query** (状態管理)
- **Tailwind CSS** + shadcn/ui

### モバイル
- **React Native** + Expo
- **Expo Router** (ファイルベースルーティング)
- **NativeWind** (スタイリング)

## モノレポ構造

```
hono-practice/
├── apps/
│   ├── backend/    # バックエンドAPI
│   ├── frontend/   # Webフロントエンド
│   └── mobile/     # モバイルアプリ
├── packages/
│   ├── types/      # 共有型定義
│   └── frontend-shared/  # フロント共通コード
└── infra/          # DB設定・マイグレーション
```

## パスエイリアス
- `@backend/*`: apps/backend/*
- `@frontend/*`: apps/frontend/src/*
- `@dtos/*`: packages/types/*
- `@infra/*`: infra/*
- `@domain/*`: apps/backend/domain/*
---
description: フロントエンドのオフラインファースト設計原則・ファイル構成・認証フロー・共有パッケージ
globs:
  - "apps/frontend/**"
---

## 設計原則（オフラインファースト）

- 全データはDexie.jsに保存 → `useLiveQuery` でリアクティブ読み取り → syncEngineがバックグラウンド同期
- Dexieテーブルには `_syncStatus` フィールドで同期状態を管理
- DB操作は必ずDexie repository経由（直接API fetch禁止）
- **表示にサーバー同期値を直接使わない**: `goal.totalTarget` 等のサーバー計算値は同期タイミングで古くなる。ローカルのactivityLogsから `calculateGoalBalance()` 等の共有関数で算出する

## ファイル構成
- エントリ: `src/main.tsx`
- ルート: `src/routes/` (TanStack Router)
- コンポーネント: `src/components/`
- DB: `src/db/` (Dexie repositories)
- 同期: `src/sync/` (syncEngine, initialSync)
- フック: `src/hooks/`

## 認証フロー (`__root.tsx`)
- `useAuth`フックでDexieのauthState確認
- 未認証 → LoginForm表示 / 認証済み → Outlet (ルーティング)
- トークン管理: `apiClient.ts` で自動リフレッシュ

## 共有パッケージ
- `packages/frontend-shared/hooks`: createUseApiKeys, createUseSubscription等のファクトリ
- `packages/types-v2`: APIリクエスト/レスポンス型定義
- Viteパス解決: `tsconfigPaths({ root: "../.." })` でmonorepoルート指定

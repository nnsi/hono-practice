# 管理画面(admin-frontend)アーキテクチャ

## ステータス: Accepted

## コンテキスト

Actikoにユーザー管理・問い合わせ確認・ダッシュボード機能を持つ管理画面が必要になった。
既存のfrontendと技術スタックを揃えつつ、管理画面固有の要件に合わせた設計判断が必要。

## 決定事項

### 1. 技術スタック（frontendと共通）

- React 19 + Vite + TypeScript
- TanStack Router（ファイルベースルーティング）
- Tailwind CSS（warm grayテーマ）
- Lucide React（アイコン）
- Hono client（型安全なAPI通信）

### 2. frontendとの違い

| 項目 | frontend | admin-frontend |
|------|----------|----------------|
| オフラインファースト | Dexie.js + syncEngine | なし（常時オンライン前提） |
| データ取得 | Dexie useLiveQuery | TanStack Query |
| PWA | あり | なし |
| i18n | あり | なし（日本語のみ） |
| 認証 | ユーザーJWT | 管理者Google OAuth |

### 3. オフラインファーストを採用しない理由

- 管理画面は常にサーバーの最新データを表示すべき（ローカルキャッシュで古いデータを見せるリスク）
- 管理者は安定したネットワーク環境で使用する前提
- Dexie + syncEngine の統合コストに見合わない

### 4. TanStack Queryの採用

- frontendではサーバー専用データ（APIキー、サブスクリプション）にのみ使用していたが、admin-frontendでは全データ取得に使用
- キャッシュ・リフェッチ・ページネーション等の管理画面に必要な機能が揃っている

### 5. 独立したアプリケーション

- `apps/admin-frontend` として独立させる（frontendに管理画面を組み込まない）
- 理由: 認証フロー・データ取得パターンが根本的に異なる。バンドルサイズの分離。デプロイの独立性

## 影響

- pnpm-workspaceに `apps/*` パターンで自動認識される
- backendに `/admin/` プレフィックスのAPIルートを追加
- CORSオリジンにadmin-frontendのポートを追加

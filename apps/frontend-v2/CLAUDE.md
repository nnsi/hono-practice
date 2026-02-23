# frontend-v2 開発ルール

## 設計原則（オフラインファースト）

- 全データはDexie.jsに保存 → `useLiveQuery` でリアクティブ読み取り → syncEngineがバックグラウンド同期
- Dexieテーブルには `_syncStatus` フィールドで同期状態を管理
- DB操作は必ずDexie repository経由（直接API fetch禁止）

## UI規約

- `confirm()` / `alert()` 禁止 → インライン2段階確認UI
- モーダルは `ModalOverlay` 共通コンポーネント（`components/common/ModalOverlay.tsx`）を使う
- 閉じるボタンは Lucide `X` アイコンに統一
- アイコンは Lucide React を使用

## API通信

- TanStack Queryはサーバー専用データ（APIキー、サブスクリプション等）のみ使用
- API通信に `useEffect` は使わない（TanStack Queryを使う）
- snake_case→camelCase変換は `apiMappers.ts` の型付きマッパーを使う（`as` キャスト禁止）

## 並列エージェントへの追加指示

サブエージェントにfrontend-v2の作業を任せる場合、ルートCLAUDE.mdの共通ルールに加えて以下を伝えること:

```
- DB操作: Dexie repository経由（直接API fetch禁止）
- API通信: TanStack Queryを使う（useEffect内でfetch禁止）
- モーダル: ModalOverlay共通コンポーネント（components/common/ModalOverlay.tsx）を使う
- 確認UI: confirm()禁止 → インライン2段階確認UI
- 閉じるボタン: Lucide X アイコンに統一
- snake_case変換: apiMappers.tsの型付きマッパーを使う（asキャスト禁止）
- アイコン: Lucide Reactを使用
```

## 開発サーバー

- ポート: **2460**（v1の1357と混同しないこと）
- ブラウザ確認前に `vite.config.ts` でポートを確認する癖をつける

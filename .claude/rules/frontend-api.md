---
description: フロントエンドのAPI通信ルール
globs:
  - "apps/frontend/**"
---

## API通信

- TanStack Queryはサーバー専用データ（APIキー、サブスクリプション等）のみ使用
- API通信に `useEffect` は使わない（TanStack Queryを使う）
- snake_case→camelCase変換は `apiMappers.ts` の型付きマッパーを使う（`as` キャスト禁止）

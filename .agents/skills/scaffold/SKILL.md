---
name: scaffold
description: 既存ジェネレーターで backend の domain・CRUD feature を生成する。
---

# スキャフォールド

`apps/backend/AGENTS.md` と類似 feature を確認し、必要な生成だけ行う。

```bash
node scripts/generate-domain.js <entityName>
node scripts/generate-feature.js <entityName>
```

生成先は `packages/domain/` と `apps/backend/feature/`。既存ファイルとの衝突、`app.ts` と barrel の自動更新を確認する。Drizzle schema、DTO、TODO、認可、transaction を実際の要件に合わせ、route と usecase のテストを完成させる。

DB 変更は `pnpm run db-generate` で migration を生成し、対象が隔離したローカル DB と確認してから `pnpm run db-migrate` を実行する。型・関連テスト・lint を確認する。

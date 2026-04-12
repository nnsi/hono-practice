---
name: scaffold
description: "`scripts/generate-domain.js` と `scripts/generate-feature.js` を使って、バックエンドの新ドメインや新機能のひな形を高速生成する。新しい entity や CRUD feature を追加する時に使う。"
---

# スキャフォールド

既存パターンに沿ったひな形を生成する。

## 手順

1. ドメインモデルを生成する。

```bash
node scripts/generate-domain.js <entityName>
```

2. feature を生成する。

```bash
node scripts/generate-feature.js <entityName>
```

3. 生成後に手で埋める。
- Drizzle schema
- request / response DTO
- `apps/backend/app.ts` の route 登録
- Repository / Usecase / Schema の TODO
- 必要なら transaction 対応

4. DB 変更がある場合は migrate する。

```bash
pnpm run db-generate
pnpm run db-migrate
```

5. `pnpm run tsc`、`pnpm run test-once`、`pnpm run fix` を回す。

## 注意事項

- 生成コードはあくまでひな形で、そのまま出荷しない
- Repository 命名、`newXxx` ファクトリ、handler → usecase → repository の層構造を崩さない

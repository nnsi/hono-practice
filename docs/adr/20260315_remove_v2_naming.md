# v2命名の廃止とディレクトリ整理

## ステータス

決定

## コンテキスト

元々v1とv2のAPIを並行稼働していたため、`feature-v2`、`frontend-v2`、`mobile-v2` とv2サフィックスを付けたディレクトリ・ファイル名を使っていた。
v1 APIは削除済みで並行稼働の必要がなくなったが、命名がそのまま残っており、新規参入者やエージェントにとって紛らわしい状態になっている。

影響箇所:
- `apps/frontend-v2/` — Webフロントエンド
- `apps/mobile-v2/` — モバイルアプリ
- `apps/backend/feature-v2/` — 同期API群（activity, activity-log, goal, goal-freeze-period, task）
- `feature-v2/` 配下の全ファイル名（`activityV2Route.ts` 等、V2サフィックス付き）
- ルートpackage.jsonのスクリプト（`actiko-frontend-v2` フィルタ）
- `apps/frontend-v2/package.json` の `name: "actiko-frontend-v2"`
- CLAUDE.md、skills、docs/knowledges 等のドキュメント参照

## 決定事項

### 1. `apps/frontend-v2/` → `apps/frontend/`
- package.json name: `actiko-frontend-v2` → `actiko-frontend`
- ルートpackage.jsonのpnpmフィルタを更新

### 2. `apps/mobile-v2/` → `apps/mobile/`
- package.json nameは既に `actiko-mobile` で変更不要

### 3. `apps/backend/feature-v2/` → `apps/backend/feature-sync/`
- 同期APIのためのエンドポイント群であることを名前で明示
- `feature/` は引き続きロジックを持つAPI（auth, apiKey, subscription 等）を格納
- ファイル名からV2サフィックスを除去:
  - `activityV2Route.ts` → `activitySyncRoute.ts`
  - `activityV2Handler.ts` → `activitySyncHandler.ts`
  - `activityV2Usecase.ts` → `activitySyncUsecase.ts`
  - `activityV2Repository.ts` → `activitySyncRepository.ts`
  - テストファイルも同様
- エクスポート名も同様にV2→Sync（例: `activityV2Route` → `activitySyncRoute`）
- **APIパス `/users/v2/` は変更しない**（クライアント互換性維持。パスのv2はバージョニングの意味で残す）

### 4. ドキュメント更新
- ルート `CLAUDE.md`
- `apps/backend/CLAUDE.md`
- `apps/frontend-v2/CLAUDE.md` → `apps/frontend/CLAUDE.md`（ディレクトリ移動で自動）
- `docs/knowledges/structure.md`
- `.claude/skills/` 内の該当スキルファイル
- `C:\Users\norfa\.claude\projects\D--workspace-hono-practice\memory\MEMORY.md`

### 変更しないもの
- APIパス（`/users/v2/` はそのまま）
- `packages/types` 内のv2ディレクトリ（APIバージョニングの区別として妥当）
- `apps/backend/feature/` 内のv1 API（既存のまま維持）

## 結果

- ディレクトリ名・ファイル名から「v2」が消え、目的（sync/通常API）が名前から読み取れるようになる
- 新規参入者が「v1はどこ？」と混乱しなくなる
- 作業はリネームとimportパス修正が中心で、ロジック変更なし

## 備考

- git mvでディレクトリ移動するため、git historyは維持される
- テスト・型チェック・lintの全通過を確認してから完了とする

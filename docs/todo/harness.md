# Harness Engineering タスクリスト

**凡例**: ✅ 対応済み / 🔶 部分的 / ❌ 未対応

---

## 対応済み

### 1. PostToolUse Hook: ファイル編集時の自動lint+format
✅ 対応済み（2026-03-18）

`.claude/hooks/post-lint.js` — Write/Edit/MultiEdit後にbiome format+lintを自動実行。残エラーに修正ヒントを付加して `additionalContext` で返却。

### 2. Lefthook 有効化
✅ 対応済み（2026-03-19）

pre-commit: `biome lint`（変更ファイル）+ `tsc --noEmit`。

### 5. `noExplicitAny` の有効化
✅ 対応済み（2026-03-18）

`biome.json` で `"noExplicitAny": "error"` に設定。全ファイルの `any` を排除。React hooks DI型等の意図的な使用は `biome-ignore` で明示的に抑制。

### 7. Linterエラーメッセージの改善
✅ 対応済み（2026-03-19）

PostToolUse hookの `enhanceDiagnostics()` でlintエラーにルール別の修正ヒントを付加。ADRへの参照も含む。

### 8. ADRと実行可能ルールの連携（archgateパターン）
✅ 対応済み（2026-03-19）

biome.json の `overrides` + `noRestrictedImports` でクロスレイヤーimportを機械的に検出:
- `packages/` → `@backend/*`, `@frontend/*` のimport禁止
- `apps/frontend/` → `@backend/*` のimport禁止
- `apps/backend/` → `@frontend/*` のimport禁止
- `AppType` は `@packages/types/api.ts` 経由で再exportし、唯一の制御点とする

---

## 未対応

### 6. CLAUDE.md のスリム化
**優先度: 中** | 🔶 83行（推奨: ≤50行）

- 現在83行 → 50行以下を目標
- 詳細ルールは `.claude/rules/` やサブディレクトリの CLAUDE.md に移動
- 各行に「この行を削除するとエージェントの実行が壊れるか？」テスト

---

## 既存で対応済み

| 項目 | 備考 |
|------|------|
| CLAUDE.md がポインタ中心 | 詳細は各app/CLAUDE.mdに委譲 |
| Biome (lint + format) | Rust製、高速 |
| TypeScript strict mode | `strict: true` + `noUnused*` |
| ADR運用 | 30件、活発に更新 |
| CI/CD (GitHub Actions) | パス検出 + 条件付きデプロイ |
| テスト規律 | 「失敗は100%自分の変更が原因」 |
| E2Eテスト基盤 | PGlite + Hono + Vite + Playwright |
| PreCompact Hook | セッションログ保存 |
| `pnpm run ci-check` | vitest + lint + tsc の統合コマンド |

---

## 実施しない項目

| 項目 | 理由 |
|------|------|
| ESLint併用 | Biomeで十分 |
| Oxlint導入 | Biomeが1ツールでカバー |
| Planktonパターン | プロジェクト規模では過剰 |
| Codex併用 | Claude Code単体で運用 |
| PreToolUse安全ゲート | 設定ファイル編集も必要な場面あり。人間の目でチェック |
| Stop Hook完了時テスト | 差分がある状態での会話中に走ると不便 |

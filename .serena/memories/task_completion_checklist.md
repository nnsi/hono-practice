# タスク完了時のチェックリスト

## 必須確認事項

### 1. テストの実行
```bash
npm run test-once    # 必ずCIモードで実行（ウォッチモードは使用禁止）
```

### 2. リンティング・型チェック
```bash
npm run tsc          # TypeScript型チェック
npm run lint         # Biome + ESLintチェック
```

### 3. コード修正（エラーがある場合）
```bash
npm run fix          # 自動修正可能なエラーを修正
```

### 4. CI全体チェック
```bash
npm run ci-check     # テスト＋リンティングの一括実行
```

## 重要な注意事項

### ⚠️ 開発サーバーについて
- **開発サーバーは絶対に起動しない**（ユーザー側で既に起動済み）
- `npm run dev`, `npm run client-dev` などは実行しない

### 🌐 ブラウザ動作確認
- 「ブラウザで動作確認して」と言われた場合は **Playwright MCP** を使用
- 手動確認を求めるのではなく、自動的に動作確認を実施
- `mcp__playwright__browser_navigate` でアクセス
- `mcp__playwright__browser_snapshot` で状態確認

### ✅ タスク完了の定義
- **実際に完了していない場合は絶対に完了としない**
- 検証・確認ができていないタスクは未完了のままにする
- エラーが残っている場合は必ず解決してから完了とする

## Git Hooks (lefthook)
pre-commitフックで以下が自動実行される：
- Biomeでのリント
- Vitestでのテスト実行
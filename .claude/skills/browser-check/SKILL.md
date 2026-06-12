---
name: browser-check
description: playwright-cliでブラウザ動作確認を標準化された手順で実施する。
user_invocable: true
---

# ブラウザ動作確認

playwright-cliを使った動作確認の標準手順。「表示されている」だけでなく「操作が正しく動く」まで検証する。

> 2026-06-12にChrome MCPからplaywright-cliに統一（リモート実行環境で動作し、サブエージェントにも委譲できるため）。コマンド詳細は `/playwright-cli` スキル参照。

## 手順

### Step 1: 対象アプリのポート確認

ポートはworktreeごとに異なる。推測せず、以下から読み取る:
- **frontend**: `apps/frontend/vite.config.ts` の `server.port`
- **backend API**: `apps/backend/.env` の `API_PORT`

リモート実行環境・worktree環境では開発サーバーが起動していないため、自分で起動してから進む。

### Step 2: ブラウザを開く

```bash
playwright-cli open http://localhost:<確認したポート>
```

### Step 3: ページ表示確認

```bash
playwright-cli snapshot                  # 要素参照付きスナップショット
playwright-cli screenshot                # スクリーンショット取得
playwright-cli console error             # コンソールエラーチェック
```

### Step 3.5: モバイルビューポート確認（UI変更時は必須）

UI変更を含む場合、375px幅でのレイアウトを確認する:

```bash
playwright-cli run-code "async page => { await page.setViewportSize({ width: 375, height: 812 }); }"
playwright-cli screenshot
```

特に注意: ヘッダの中央寄せ、モーダル表示位置、フォームボタンの可視性、`autoFocus`によるキーボード占有

### Step 4: 操作検証（これが重要）

「表示されている」だけでは動作確認とは言えない。操作前に必ず `snapshot` で最新の要素参照（e1, e2...）を取得してから:

1. **作成フロー**: ボタンクリック → フォーム入力（`fill`） → 送信 → 結果を `snapshot` で確認
2. **編集フロー**: 既存データの編集 → 保存 → 反映を確認
3. **削除フロー**: 削除ボタン → 確認UI表示 → 実行 → 一覧から消えることを確認
4. **ネットワーク確認**: `playwright-cli network` でAPIコールの成否を確認

### Step 4補足: 空データだけで確認しない

- 新規ユーザー（データ0件）だけでなく、**既存データがある状態**でも確認する
- 特にグラフ・統計・プログレス表示は、データがないと正常に見えてバグを見逃す
- フォーム系は送信まで確認する（表示されている≠動く）

### Step 5: 結果報告

各ページ/フローごとに以下を報告:
- スクリーンショット（成功時）
- コンソールエラーの有無
- ネットワークリクエストの成否
- 操作検証の結果

確認が終わったら `playwright-cli close` でブラウザを閉じる。

## 注意事項

- ポートを間違えない。必ずStep 1の手順で実際の設定値を確認する
- **操作前のsnapshot必須**: 画面遷移後は要素参照が変わる
- **サブエージェントへの委譲可**: `playwright-cli -s <session名>` でセッションを分離すれば、複数画面の確認を並列化できる（例: フロントエンドとmobileを同時確認）
- ゾンビセッションが残ったら `playwright-cli list` で確認し `playwright-cli kill-all`
- ダイアログは `dialog-accept` / `dialog-dismiss` で処理できる

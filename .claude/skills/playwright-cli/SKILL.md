---
name: playwright-cli
description: playwright-cliを用いたブラウザ操作・動作確認・デバッグを実施する。
user_invocable: true
---

# Playwright CLI ブラウザ走査

playwright-cliを使ったブラウザ操作スキル。Bashツールから`playwright-cli`コマンドを実行してブラウザを制御する。

## いつ使うか

- Chrome MCP拡張が接続できない/不安定なとき
- ネットワークリクエストのモック・傍受が必要なとき
- スクリーンショットやPDF保存が必要なとき
- 動画・トレースの記録が必要なとき
- 複数タブの操作が必要なとき
- localStorageやcookieの直接操作が必要なとき

## 基本ワークフロー

### Step 1: ブラウザを開く

```bash
playwright-cli open http://localhost:2460
```

ポート番号はCLAUDE.mdに従う:
| アプリ | ポート |
|--------|--------|
| frontend (v1) | 1357 |
| frontend-v2 | 2460 |
| backend API | 3456 |

### Step 2: スナップショットで要素参照を取得

```bash
playwright-cli snapshot
```

出力例:
```
e1 [textbox "メールアドレス"]
e2 [textbox "パスワード"]
e3 [button "ログイン"]
```

**重要**: `click`, `fill`, `hover`等の操作前に必ず`snapshot`で要素参照(e1, e2...)を取得する。

### Step 3: 要素を操作

```bash
playwright-cli click e3          # クリック
playwright-cli fill e1 "test"    # テキスト入力
playwright-cli type "検索語"      # フォーカス中の要素にタイプ
playwright-cli select e5 "value" # ドロップダウン選択
playwright-cli check e7          # チェックボックスON
playwright-cli hover e4          # ホバー
playwright-cli press Enter       # キー押下
```

### Step 4: 結果を確認

```bash
playwright-cli snapshot              # 画面状態を確認
playwright-cli screenshot            # スクリーンショット保存
playwright-cli console               # コンソールログ確認
playwright-cli console error         # エラーのみ
playwright-cli network               # ネットワークリクエスト一覧
```

### Step 5: 終了

```bash
playwright-cli close
```

## よく使うパターン

### ページ遷移 → 表示確認

```bash
playwright-cli open http://localhost:2460
playwright-cli snapshot                        # 初期表示確認
playwright-cli click e3                        # ナビゲーション要素クリック
playwright-cli snapshot                        # 遷移後の状態確認
```

### フォーム入力 → 送信

```bash
playwright-cli snapshot                        # フォーム要素の参照取得
playwright-cli fill e1 "テストデータ"
playwright-cli fill e2 "100"
playwright-cli click e5                        # 送信ボタン
playwright-cli snapshot                        # 送信結果確認
playwright-cli network                         # APIリクエスト確認
```

### APIモック

```bash
# JSON応答をモック
playwright-cli route "**/api/goals" --body='[{"id":1,"name":"テスト"}]' --content-type=application/json

# 画像を404に
playwright-cli route "**/*.jpg" --status=404

# モック一覧・解除
playwright-cli route-list
playwright-cli unroute "**/api/goals"
```

### 認証状態の保存・復元

```bash
# ログイン後に状態保存
playwright-cli state-save auth.json

# 別セッションで復元（ログインスキップ）
playwright-cli state-load auth.json
playwright-cli open http://localhost:2460
```

### localStorage / Cookie操作

```bash
playwright-cli localstorage-list
playwright-cli localstorage-set "theme" "dark"
playwright-cli cookie-list
playwright-cli cookie-set "session" "abc123"
```

### デバッグ記録

```bash
# トレース記録
playwright-cli tracing-start
# ...操作...
playwright-cli tracing-stop

# 動画記録
playwright-cli video-start
# ...操作...
playwright-cli video-stop
```

### 複数タブ操作

```bash
playwright-cli tab-new http://localhost:3456/api/health
playwright-cli tab-list
playwright-cli tab-select 0    # 元のタブに戻る
playwright-cli tab-close 1     # 2番目のタブを閉じる
```

### JavaScript実行

```bash
playwright-cli eval "document.title"
playwright-cli eval "el => el.textContent" e5
playwright-cli run-code "async page => {
  const items = await page.locator('.item').count();
  return items;
}"
```

## コマンドリファレンス（抜粋）

| カテゴリ | コマンド | 説明 |
|----------|----------|------|
| **Core** | `open [url]` | ブラウザを開く |
| | `close` | ブラウザを閉じる |
| | `goto <url>` | URLに遷移 |
| | `snapshot` | 要素参照付きスナップショット取得 |
| | `click <ref>` | クリック |
| | `fill <ref> <text>` | テキスト入力 |
| | `type <text>` | タイプ入力 |
| | `select <ref> <val>` | ドロップダウン選択 |
| | `press <key>` | キー押下 |
| | `eval <func> [ref]` | JS実行 |
| **確認** | `screenshot [ref]` | スクリーンショット |
| | `pdf` | PDF保存 |
| | `console [level]` | コンソールログ |
| | `network` | ネットワークリクエスト |
| **Navigation** | `go-back` / `go-forward` / `reload` | 戻る/進む/リロード |
| **Network** | `route <pattern>` | リクエストモック |
| | `unroute [pattern]` | モック解除 |
| **Storage** | `state-save` / `state-load` | 認証状態保存/復元 |
| | `cookie-*` / `localstorage-*` / `sessionstorage-*` | ストレージ操作 |
| **Record** | `tracing-start` / `tracing-stop` | トレース記録 |
| | `video-start` / `video-stop` | 動画記録 |
| **Tabs** | `tab-list` / `tab-new` / `tab-select` / `tab-close` | タブ管理 |

## 注意事項

- **snapshot必須**: 要素操作前に必ず`snapshot`で最新の要素参照を取得する。画面遷移後は参照が変わる
- **ポート確認**: localhost のポートはCLAUDE.mdに従う。推測しない
- **セッション管理**: `playwright-cli list`で既存セッション確認。ゾンビが残ったら`playwright-cli kill-all`
- **dialog対応**: `dialog-accept` / `dialog-dismiss`でダイアログ処理可能（Chrome MCPと違いブロックしない）
- **Chrome MCPとの使い分け**: 簡単な表示確認はChrome MCP、複雑な操作・モック・記録はplaywright-cli

---
name: browser-check
description: Chrome MCPでブラウザ動作確認を標準化された手順で実施する。
user_invocable: true
---

# ブラウザ動作確認

Chrome MCPを使った動作確認の標準手順。「表示されている」だけでなく「操作が正しく動く」まで検証する。

## 手順

### Step 1: 対象アプリのポート確認

確認対象のvite.config.tsを読んでポートを特定する。推測しない。

| アプリ | ポート |
|--------|--------|
| frontend (v1) | 1357 |
| frontend-v2 | 2460 |
| backend API | 3456 |

### Step 2: Chrome MCP接続

```
1. mcp__claude-in-chrome__tabs_context_mcp で現在のタブ情報を取得
2. 接続失敗時はユーザーに「Chrome拡張の再接続をお願いします」と依頼
3. mcp__claude-in-chrome__tabs_create_mcp で新しいタブを作成
4. mcp__claude-in-chrome__navigate で対象URLにアクセス
```

### Step 3: ページ表示確認

```
1. mcp__claude-in-chrome__computer action=screenshot でスクリーンショット取得
2. mcp__claude-in-chrome__read_page で要素の存在を確認
3. mcp__claude-in-chrome__read_console_messages pattern="error|Error|ERR" でコンソールエラーチェック
```

### Step 4: 操作検証（これが重要）

「表示されている」だけでは動作確認とは言えない。以下を実施する:

1. **作成フロー**: ボタンクリック → フォーム入力 → 送信 → 結果表示を確認
2. **編集フロー**: 既存データの編集 → 保存 → 反映を確認
3. **削除フロー**: 削除ボタン → 確認UI表示 → 実行 → 一覧から消えることを確認
4. **ネットワーク確認**: `mcp__claude-in-chrome__read_network_requests` でAPIコールの成否を確認

### Step 5: 結果報告

各ページ/フローごとに以下を報告:
- スクリーンショット（成功時）
- コンソールエラーの有無
- ネットワークリクエストの成否
- 操作検証の結果

## 注意事項

- ポートを間違えない（v1: 1357, v2: 2460）。必ずStep 1で確認する
- 小さい要素はzoomで拡大して確認する
- フォーム送信ボタンのクリックが効かない場合はEnterキーで代替
- confirm()は使っていないはずだが、もし出たらセッションがブロックされるので注意
- サブエージェントにはChrome MCPのアクセス権がない。ブラウザ確認は並列化できない

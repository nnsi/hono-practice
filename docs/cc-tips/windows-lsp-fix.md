# Windows環境でTypeScript LSPが動かない問題

## 症状

Claude Codeの `typescript-lsp` プラグインでLSPツールを呼ぶと以下のエラーが出る:

```
Error performing hover: spawn typescript-language-server ENOENT
```

`.cmd` のフルパスに変更しても:

```
Error performing hover: spawn EINVAL
```

## 原因

Windows環境では、npm/pnpmでグローバルインストールされるCLIツールは以下の3形式で生成される:

- `typescript-language-server` (POSIXシェルスクリプト)
- `typescript-language-server.cmd` (Windowsバッチ)
- `typescript-language-server.ps1` (PowerShell)

Claude CodeのLSPツールは内部で `child_process.spawn()` を使ってプロセスを起動するが:

- **ENOENT**: POSIXシェルスクリプトはWindowsネイティブの `spawn` では実行できない
- **EINVAL**: `.cmd` ファイルも `spawn` では直接実行できない（`shell: true` オプションが必要）

## 修正方法

プラグイン設定ファイルの `command` を `node` に変更し、`args` でエントリポイントのJSファイルを直接指定する。

### 1. エントリポイントを特定

`.cmd` ファイルの中身を確認して、実際に実行されるJSファイルのパスを見つける:

```bash
cat "$(which typescript-language-server).cmd"
```

出力の最終行に `node_modules/typescript-language-server/lib/cli.mjs` のようなパスがある。

### 2. plugin.jsonを編集

ファイル: `~/.claude/plugins/cache/claude-plugins-official/typescript-lsp/<version>/.claude-plugin/plugin.json`

Before:
```json
{
  "command": "typescript-language-server",
  "args": ["--stdio"]
}
```

After:
```json
{
  "command": "node",
  "args": [
    "C:/Users/<username>/scoop/apps/nvm/current/nodejs/nodejs/node_modules/typescript-language-server/lib/cli.mjs",
    "--stdio"
  ]
}
```

パスは自分の環境に合わせて変更すること。`node` は `.exe` なので `spawn` で問題なく起動できる。

### 3. Claude Codeを再起動

設定変更はプロセス起動時に読み込まれるため、再起動が必要。

## 注意事項

- プラグインキャッシュの直接編集なので、プラグイン更新時に上書きされる可能性がある
- Node.jsのバージョンを変更した場合はパスの更新が必要
- 同様の問題は他のLSPプラグイン（gopls等）でも `.exe` でないコマンドを使っている場合に発生しうる

---
name: browser-check
description: "`playwright-cli` を使ってブラウザ動作確認を標準手順で実施する。UI変更、回帰確認、E2E前後の手動確認、フォーム送信や CRUD フローの検証で使う。"
---

# ブラウザ動作確認

`playwright-cli` を使い、「表示される」だけでなく「操作が通る」まで確認する。

## 手順

1. 対象アプリのポートを読む。
- frontend: `apps/frontend/vite.config.ts` の `server.port`
- backend API: `apps/backend/.env.local` の `API_PORT`
- admin frontend や Expo Web を確認する場合は、それぞれの `.env` と起動コマンドも確認する

2. 対象 URL を `playwright-cli` で開く。

```bash
playwright-cli open http://localhost:<port>
```

3. 初期状態を確認する。

```bash
playwright-cli snapshot
playwright-cli console error
playwright-cli network
```

4. 実際の操作フローを検証する。
- 作成: 入力して送信し、結果が表示されること
- 編集: 既存データを変えて保存し、反映されること
- 削除: 確認 UI を経て一覧から消えること
- 空状態だけで終わらせず、既存データがある状態でも確認すること

5. UI変更時はモバイル幅も確認する。
- `playwright-cli resize 375 812` が使える環境ならそれで切り替える
- 使えない場合は `run-code` か CLI のセッションオプションで viewport を切り替える
- ヘッダ位置、モーダル、フォーム送信ボタン、スクロール末尾を重点確認する

6. 結果を記録する。
- 成功画面のスクリーンショット
- コンソールエラーの有無
- API リクエストの成否
- 実施した操作と結果

## 注意事項

- 要素操作の前に毎回 `playwright-cli snapshot` を取り、最新の要素参照を使う
- worktree 環境ではハードコードしたポートを使わず、必ず対象 worktree の設定値を読む
- 確認ダイアログや 2 段階削除 UI も通す
- 自動化済み E2E があっても、今回の変更に直接関係するフローはブラウザで一度通す
- 複雑な操作や記録が必要な場合は `.codex/skills/playwright-cli/SKILL.md` のコマンドを使う

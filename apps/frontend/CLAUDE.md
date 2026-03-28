# frontend 開発ルール

オフラインファースト: 全データはDexie.js → syncEngineでバックグラウンド同期。詳細は `.claude/rules/frontend-*.md` 参照

## 並列エージェントへの追加指示

サブエージェントにfrontendの作業を任せる場合、ルートCLAUDE.mdの共通ルールに加えて以下を伝えること:

```
- DB操作: Dexie repository経由（直接API fetch禁止）
- API通信: TanStack Queryを使う（useEffect内でfetch禁止）
- モーダル: ModalOverlay共通コンポーネント（components/common/ModalOverlay.tsx）を使う
- 確認UI: confirm()禁止 → インライン2段階確認UI
- 閉じるボタン: Lucide X アイコンに統一
- snake_case変換: apiMappers.tsの型付きマッパーを使う（asキャスト禁止）
- アイコン: Lucide Reactを使用
```

## 開発サーバー

- ポート: **2460**
- ブラウザ確認前に `vite.config.ts` でポートを確認する癖をつける
- **モバイルファースト検証**: 375px幅でのレイアウト崩れ・`autoFocus`によるキーボード表示・hover前提のUI等に注意

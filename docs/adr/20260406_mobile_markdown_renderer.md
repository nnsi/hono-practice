# モバイルMarkdownレンダリングライブラリの選定

## ステータス

決定

## コンテキスト

Note機能の実装にあたり、モバイル（React Native）でMarkdownをレンダリングするライブラリを選定する必要がある。Web側は `react-markdown` + `rehype-sanitize` を使用するが、React Native環境では別のライブラリが必要。

主な要件:
- **OTA Update（EAS Update）で配信可能**であること（ネイティブビルド不要）
- 長文ノートでもパフォーマンスが許容範囲であること
- 活発にメンテナンスされていること

## 検討した選択肢

### 1. react-native-marked（採用）
- JS-onlyパッケージ、OTA Update可
- marked.jsベース、FlatList描画で長文に強い
- ~320 stars、活発にメンテ中（v8.0.1）
- カスタムレンダラー、テーマ対応

### 2. @ronradtke/react-native-markdown-display
- JS-only、75 KBと最軽量
- メンテナが1人で更新頻度低め
- 元ライブラリ作者がreact-native-enriched-markdownへの移行を推奨

### 3. react-native-enriched-markdown（Software Mansion）
- md4c（C）ベース、Fabric専用。ネイティブテキスト選択、LaTeX対応
- **ネイティブビルド必須でOTA Update不可**
- New Architecture（Fabric）専用、0.xでAPI変更リスクあり

### 4. react-native-render-html + markdown-it
- ~3.4k starsだが2022年以降メンテされていない
- MD→HTML→ネイティブの2段変換でオーバーヘッド大

## 決定事項

**react-native-marked** を採用する。

理由:
1. JS-onlyでOTA Update可能（ネイティブビルドなしで配信できる）
2. FlatListベースの描画で長文ノートにも対応
3. 活発なメンテナンス
4. Note機能Phase 1（プレーンテキスト + プレビュー切り替え）に十分な機能

## 結果

- モバイルのNote機能にMarkdownプレビューを追加する際、ネイティブビルドは不要
- peer dependencyの `react-native-svg` はJS-onlyなので同様にOTA配信可能
- 将来的にNew Architecture完全移行後、より高機能な `react-native-enriched-markdown` への乗り換えも選択肢として残る

## 備考

- Web側は `react-markdown` + `rehype-sanitize` を使用（プラットフォーム間でライブラリは異なるが、CommonMarkの入力仕様は共通）

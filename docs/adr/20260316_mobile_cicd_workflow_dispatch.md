# モバイル CI/CD: workflow_dispatch による手動デプロイ

## ステータス

決定

## コンテキスト

モバイルアプリ（Expo / EAS）のリリースフローとして CI/CD パイプラインを構築する。
配布には 2 種類の経路がある:

- **フルビルド (EAS Build)**: ネイティブ層の変更時に必要。`.ipa` / `.aab` を生成し、TestFlight / Google Play 内部テストトラックへ submit
- **OTA (EAS Update)**: JS/TS のみの変更時。JSバンドルをアプリ起動時に配信。ストア審査不要、数秒で反映

ストアからのフルビルド配布は自動更新されるが即時ではなく（数時間〜1日のラグ）、OTA の方がユーザー体験に優れる。
そのため本番環境でも普段は OTA を使い、フルビルドはネイティブ変更時のみとしたい。

## 検討した選択肢

### A. ブランチトリガー + 自動検知（却下）

`mobile/stg`, `mobile/release` ブランチへの push をトリガーに、`app.json` / `app.config.ts` / `package.json` の差分でフルビルド or OTA を自動判定する案。

**却下理由:**

- 差分検知の信頼性が低い
  - `HEAD~1` では squash merge や複数コミット push で漏れる
  - `package.json` の変更が全て native とは限らない（devDependencies の lint ツール追加等）
  - native ライブラリの削除も再ビルド対象だが、差分検知では見落としやすい
- 偽陰性（必要なビルドのスキップ）が危険で、精度を上げるほど CI が複雑化する
- フルビルドが必要な頻度は月 1〜2 回程度で、自動化の費用対効果が低い

### B. ブランチ分離: stg 用 / prod 用（却下）

`mobile/stg` で OTA 自動配布、`mobile/release` でフルビルド、のようにブランチで用途を分ける案。

**却下理由:**

- stg でもネイティブ変更時はフルビルドが必要なため、結局両ブランチにビルド判断が要る
- ブランチの運用ルール（master からいつ切るか、マージバック等）が増えるだけでメリットが薄い
- ソースコードの所在が分散して混乱の原因になる

### C. ブランチ push + OTA、フルビルドは手動（却下）

release ブランチへの push で OTA を自動配布し、フルビルドが必要な時だけ `workflow_dispatch` で手動実行する案。

**却下理由:**

- OTA が push で先行すると、ネイティブ互換性のないバンドルが配布されるリスクがある
- フルビルドが必要なタイミングで OTA を止める手段がなく、事故につながる

### D. 全て workflow_dispatch（採用）

全環境・全操作を `workflow_dispatch` の手動トリガーで実行する案。

## 決定事項

GitHub Actions の `workflow_dispatch` で、環境（stg / prod）と操作（build / OTA）を手動選択してデプロイする。

```
main ブランチ workflow_dispatch
  ├─ stg (build + submit)   ← ネイティブ変更時
  └─ stg (OTA)              ← 普段はこっち

release ブランチ workflow_dispatch
  ├─ prod (build + submit)  ← ネイティブ変更時
  └─ prod (OTA)             ← 普段はこっち
```

**選択理由:**

- ネイティブ変更の判断は自動化が難しく、月 1〜2 回の低頻度。人間が判断した方が早く確実
- push トリガーなしのため、意図しないビルド・配布の事故がない
- yml ファイル 2 つ（stg 用・prod 用）でシンプルに完結
- ブランチ管理は main と release のみで追加の運用負荷がない

## 結果

- CI/CD ワークフローは yml 2 ファイル構成（stg 用 / prod 用）
- デプロイは全て GitHub Actions の UI から手動トリガー
- EAS の無料枠（月 30 ビルド / 月 1,000 OTA）の範囲で十分に運用可能
- チーム規模の拡大やリリース頻度の増加時に、push トリガーや自動検知の追加を再検討する

## 備考

- EAS Update には native 互換性チェックがあり、互換性のない OTA を配布しても即座にクラッシュはしない（フォールバックされる）。ただし安全側に倒して手動判断とした
- stg の配布先: iOS は TestFlight 内部テスト、Android は Google Play 内部テストトラック。どちらも審査不要

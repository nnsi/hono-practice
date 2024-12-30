# バックエンドのクリーンアーキテクチャ導入

## ステータス

決定

## コンテキスト

- 業務でGoを書いており、そこでクリーンアーキテクチャを採用していた
- 適切なロジックの分離とモックによるテストの書きやすさが良いと感じていた
- Goではあまりフレームワークに頼らず素朴なDIで実現出来ていたのも良いと感じていた
- Hono+ORMの薄いフレームワークと相性が良さそうに感じた

## 決定事項

- クリーンアーキテクチャの導入を決定
- 機能ごとにディレクトリを切り、部分的に捨てられるようにする
  - 個人開発なのでスピード重視で機能を開発したい時には出来るように
- ドメインモデルは型で表現する
  - 関数型ドメインモデリングにも興味があり、ゆくゆくは取り入れたいと思っているため
- 厳密に適用する形ではなく、まずはレイヤーの分離から
  - テスト的にはそれだけでも恩恵があるため

## 結果

- バックエンドのコードを一通りリファクタリングすることになる
- Prisma -> Drizzleへの移行も併せて行う
- フロントエンドへの影響は一切ないように作る必要がある
  - ZodでReq/Resの型を共有しているので難易度は高くなさそう
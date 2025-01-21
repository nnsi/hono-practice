# バックエンドの一部ライブラリ差し替え

## ステータス

決定

## コンテキスト

- Cloudflare WorkersはNode.js依存のライブラリが使えない
  - node-postgres、bcrypt、dotenvが該当
- 代替ライブラリを探したらpostgres-js、bcryptjsがそれぞれあった
- dotenvは代替が見つからなかったものの、エントリポイントを分けることで対応可能そう
  - ローカルでdrizzleのneonアダプタが対応していれば良かったものの、特殊な対応をしないと使えなさそう
  - https://qiita.com/hibohiboo/items/1827c41ce162431fda3e
  - Hostsファイルを書き換えるだけではあるが、面倒といえば面倒

## 決定事項

- node-postgresをpostgres-jsに差し替える
- bcryptをbcryptjsに差し替える
- ローカルでは引き続きNode.jsを開発環境とする

## 結果

- Cloudflare Workersにデプロイ出来た！
- そこまでコードを変更することなく開発環境もそのまま維持できた

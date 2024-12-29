# PrismaからDrizzleへの移行

## ステータス

決定

## コンテキスト

- デプロイ先をCloudflare Workerにしたいと思っている
- https://zenn.dev/saneatsu/scraps/7be2fcc923be42
  - Cloudflare WorkerではPrismaは不利
  - 記事にはDrizzleが良いと書いてあった
- 他の候補はkysely, TypeORMなど
- ORM / SQLのバランスが良さそうなのがDrizzleだと感じた

## 決定事項

- Prismaの利用を止め、Drizzleへ移行する

## 結果

- DB通信部分を全て書き直す必要がある
  - 段階的な移行は可能

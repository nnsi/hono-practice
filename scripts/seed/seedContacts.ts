import { randomUUID } from "node:crypto";

import type { DrizzleInstance } from "../../apps/backend/infra/rdb/drizzle/drizzleInstance";
import { contacts } from "../../infra/drizzle/schema";

const categories = ["バグ報告", "機能要望", "使い方", "その他", null];

const bodies = [
  "アクティビティの記録が保存されないことがあります。iOS 18.2、Safari使用。再現手順: 1) アクティビティを選択 2) 数値を入力 3) 保存ボタンを押す → エラーなく画面が戻るがデータが保存されていない。",
  "ゴール機能にカレンダービューがあると嬉しいです。月単位で達成状況を俯瞰できると、モチベーション維持に役立つと思います。",
  "CSV エクスポート機能の使い方がわかりません。設定画面のどこにありますか？",
  "ダークモード対応の予定はありますか？夜間の利用時に画面が眩しいです。",
  "素晴らしいアプリをありがとうございます！毎日使っています。一つだけ要望ですが、ウィジェット対応していただけると更に便利になると思います。",
  "統計画面のグラフが正しく表示されません。データはあるのにグラフが空白になります。Chrome最新版です。",
  "複数のアクティビティをグループ化する機能があると便利です。「運動」カテゴリに「ランニング」「筋トレ」「ストレッチ」をまとめたいです。",
  "アカウント削除の方法を教えてください。",
  "APIキーの発行方法と、外部サービスとの連携方法について教えてください。ドキュメントが見つかりません。",
  "同期が遅い気がします。オフラインで記録したデータがサーバーに反映されるまでに数分かかることがあります。",
];

const emails = [
  "user1@example.com",
  "tanaka@gmail.com",
  "sato.kenji@outlook.jp",
  "wellness.app.fan@yahoo.co.jp",
  "dev.question@example.com",
  "mobile.user@icloud.com",
  "feedback@company.co.jp",
];

const ips = [
  "203.0.113.1",
  "198.51.100.42",
  "192.0.2.100",
  "203.0.113.255",
  "198.51.100.1",
];

export async function seedContacts(
  db: DrizzleInstance,
  userIds: string[],
): Promise<void> {
  console.log("  seeding contacts...");

  const contactRecords = [];
  for (let i = 0; i < 12; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(
      Math.floor(Math.random() * 14) + 8,
      Math.floor(Math.random() * 60),
    );

    contactRecords.push({
      id: randomUUID(),
      email: emails[i % emails.length],
      category: categories[i % categories.length],
      body: bodies[i % bodies.length],
      ipAddress: ips[i % ips.length],
      userId: i < userIds.length ? userIds[i] : null,
      createdAt,
    });
  }

  await db.insert(contacts).values(contactRecords);
  console.log(`  ${contactRecords.length} contacts inserted`);
}

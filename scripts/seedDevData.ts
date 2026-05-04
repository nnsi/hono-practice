import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";

import type { DrizzleInstance } from "../apps/backend/infra/rdb/drizzle/drizzleInstance";
import { userSubscriptions, users } from "../infra/drizzle/schema";
import { seedContacts } from "./seed/seedContacts";
import { seedE2EUser } from "./seed/seedE2EUser";
import { seedUserActivitiesAndTasks } from "./seed/seedUserActivitiesAndTasks";

export { E2E_ACTIVITY_ID, E2E_USER_ID } from "./seed/seedE2EUser";

export async function seedDevData(db: DrizzleInstance): Promise<void> {
  console.log("seeding dev data...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  // --- ランダムユーザー（既存のdev seed） ---
  const userRecords = await db
    .insert(users)
    .values([
      {
        id: randomUUID(),
        loginId: "taro@example.com",
        name: "山田太郎",
        password: hashedPassword,
      },
      {
        id: randomUUID(),
        loginId: "hanako@example.com",
        name: "鈴木花子",
        password: hashedPassword,
      },
      {
        id: randomUUID(),
        loginId: "demo@example.com",
        name: "デモユーザー",
        password: hashedPassword,
      },
    ])
    .returning();

  // サブスクリプションデータ
  const subscriptionData = [
    {
      userId: userRecords[0].id,
      plan: "premium" as const,
      status: "active" as const,
      paymentProvider: "stripe",
      paymentProviderId: "sub_test_123456",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      priceAmount: 1980,
      priceCurrency: "JPY",
    },
    {
      userId: userRecords[1].id,
      plan: "premium" as const,
      status: "trial" as const,
      trialStart: new Date(),
      trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      priceAmount: 1980,
      priceCurrency: "JPY",
    },
  ];

  for (const subData of subscriptionData) {
    await db.insert(userSubscriptions).values({
      id: randomUUID(),
      ...subData,
    });
  }

  // 各ユーザーにアクティビティとデータを作成
  for (const user of userRecords) {
    await seedUserActivitiesAndTasks(db, user);
  }

  // --- 問い合わせデータ ---
  await seedContacts(
    db,
    userRecords.map((u) => u.id),
  );

  // --- E2E テスト用の決定論的ユーザー ---
  await seedE2EUser(db, hashedPassword);

  console.log("seed complete");
}

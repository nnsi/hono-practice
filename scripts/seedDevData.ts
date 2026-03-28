import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";

import type { DrizzleInstance } from "../apps/backend/infra/rdb/drizzle/drizzleInstance";
import {
  activities,
  activityGoals,
  activityKinds,
  activityLogs,
  tasks,
  userSubscriptions,
  users,
} from "../infra/drizzle/schema";
import { seedContacts } from "./seed/seedContacts";

// E2E テスト用の決定論的ID
export const E2E_USER_ID = "e2e00000-0000-4000-8000-000000000000";
export const E2E_ACTIVITY_ID = "e2e00000-0000-4000-8000-000000000001";

const getRandomDateWithinDays = (daysBack: number, daysForward = 0) => {
  const now = new Date();
  const startOffset = -daysBack * 24 * 60 * 60 * 1000;
  const endOffset = daysForward * 24 * 60 * 60 * 1000;
  const randomOffset = Math.random() * (endOffset - startOffset) + startOffset;
  return new Date(now.getTime() + randomOffset);
};

const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomFloat = (min: number, max: number, decimals = 2) => {
  const value = Math.random() * (max - min) + min;
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
};

const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};

const formatTime = (date: Date) => {
  return date.toTimeString().split(" ")[0];
};

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

async function seedE2EUser(db: DrizzleInstance, hashedPassword: string) {
  await db.insert(users).values({
    id: E2E_USER_ID,
    loginId: "e2e@example.com",
    name: "E2Eテストユーザー",
    password: hashedPassword,
  });

  // 既知のアクティビティ1つ
  await db.insert(activities).values({
    id: E2E_ACTIVITY_ID,
    userId: E2E_USER_ID,
    name: "E2Eランニング",
    label: "走った距離",
    emoji: "🏃",
    quantityUnit: "km",
    orderIndex: "a",
    iconType: "emoji",
  });

  // アクティビティログ1件
  await db.insert(activityLogs).values({
    id: "e2e00000-0000-4000-8000-000000000002",
    userId: E2E_USER_ID,
    activityId: E2E_ACTIVITY_ID,
    date: formatDate(new Date()),
    quantity: 5,
  });

  // プレミアムサブスクリプション（APIキー管理のテスト用）
  await db.insert(userSubscriptions).values({
    id: "e2e00000-0000-4000-8000-000000000003",
    userId: E2E_USER_ID,
    plan: "premium",
    status: "active",
    paymentProvider: "stripe",
    paymentProviderId: "sub_e2e_test",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    priceAmount: 1980,
    priceCurrency: "JPY",
  });
}

async function seedUserActivitiesAndTasks(
  db: DrizzleInstance,
  user: { id: string },
) {
  const activitiesData = [
    {
      name: "ランニング",
      label: "走った距離",
      emoji: "🏃",
      description: "毎日のランニング記録",
      quantityUnit: "km",
      orderIndex: "a",
      kinds: ["朝ラン", "夜ラン", "ジムトレッドミル"],
    },
    {
      name: "読書",
      label: "読んだページ数",
      emoji: "📚",
      description: "読書の進捗管理",
      quantityUnit: "ページ",
      orderIndex: "b",
      kinds: ["技術書", "ビジネス書", "小説"],
    },
    {
      name: "プログラミング",
      label: "コーディング時間",
      emoji: "💻",
      description: "プログラミングの学習時間",
      quantityUnit: "時間",
      orderIndex: "c",
      kinds: ["Frontend", "Backend", "インフラ"],
    },
    {
      name: "筋トレ",
      label: "トレーニング回数",
      emoji: "💪",
      description: "筋力トレーニングの記録",
      quantityUnit: "セット",
      orderIndex: "d",
      kinds: ["腕立て伏せ", "腹筋", "スクワット"],
    },
    {
      name: "水分補給",
      label: "飲んだ量",
      emoji: "💧",
      description: "1日の水分摂取量",
      quantityUnit: "ml",
      orderIndex: "e",
      kinds: [],
    },
  ];

  const selectedActivities = activitiesData
    .sort(() => Math.random() - 0.5)
    .slice(0, getRandomInt(3, 4));

  for (const activityData of selectedActivities) {
    const [activity] = await db
      .insert(activities)
      .values({
        id: randomUUID(),
        userId: user.id,
        name: activityData.name,
        label: activityData.label,
        emoji: activityData.emoji,
        description: activityData.description,
        quantityUnit: activityData.quantityUnit,
        orderIndex: activityData.orderIndex,
        showCombinedStats: true,
      })
      .returning();

    const kindIds: string[] = [];
    for (let i = 0; i < activityData.kinds.length; i++) {
      const [kind] = await db
        .insert(activityKinds)
        .values({
          id: randomUUID(),
          activityId: activity.id,
          name: activityData.kinds[i],
          orderIndex: String.fromCharCode(97 + i),
        })
        .returning();
      kindIds.push(kind.id);
    }

    const logsToInsert = [];
    for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
      const logsPerDay = Math.random() < 0.3 ? 0 : getRandomInt(1, 3);
      for (let i = 0; i < logsPerDay; i++) {
        const logDate = new Date();
        logDate.setDate(logDate.getDate() - daysAgo);
        logDate.setHours(getRandomInt(6, 22), getRandomInt(0, 59), 0, 0);

        let quantity: number | null = null;
        let memo = "";
        switch (activity.name) {
          case "ランニング":
            quantity = getRandomFloat(3, 15, 1);
            memo = ["快調なペース", "少し疲れた", "絶好調！", ""][
              getRandomInt(0, 3)
            ];
            break;
          case "読書":
            quantity = getRandomInt(10, 100);
            memo = ["面白い章だった", "難しい内容", "一気に読めた", ""][
              getRandomInt(0, 3)
            ];
            break;
          case "プログラミング":
            quantity = getRandomFloat(0.5, 4, 1);
            memo = [
              "新しい概念を学んだ",
              "バグ修正に時間がかかった",
              "スムーズに進んだ",
              "",
            ][getRandomInt(0, 3)];
            break;
          case "筋トレ":
            quantity = getRandomInt(3, 10);
            memo = ["いい感じの負荷", "少し筋肉痛", "新記録！", ""][
              getRandomInt(0, 3)
            ];
            break;
          case "水分補給":
            quantity = getRandomInt(200, 500) * getRandomInt(1, 4);
            memo = "";
            break;
        }

        logsToInsert.push({
          id: randomUUID(),
          userId: user.id,
          activityId: activity.id,
          activityKindId:
            kindIds.length > 0
              ? kindIds[getRandomInt(0, kindIds.length - 1)]
              : null,
          quantity,
          memo,
          date: formatDate(logDate),
          time: formatTime(logDate),
        });
      }
    }

    if (logsToInsert.length > 0) {
      await db.insert(activityLogs).values(logsToInsert);
    }

    if (Math.random() < 0.8) {
      let dailyTarget = 0;
      switch (activity.name) {
        case "ランニング":
          dailyTarget = getRandomInt(5, 10);
          break;
        case "読書":
          dailyTarget = getRandomInt(30, 50);
          break;
        case "プログラミング":
          dailyTarget = getRandomInt(2, 4);
          break;
        case "筋トレ":
          dailyTarget = getRandomInt(5, 10);
          break;
        case "水分補給":
          dailyTarget = 2000;
          break;
      }

      await db.insert(activityGoals).values({
        id: randomUUID(),
        userId: user.id,
        activityId: activity.id,
        dailyTargetQuantity: dailyTarget,
        startDate: formatDate(getRandomDateWithinDays(7)),
        endDate:
          Math.random() < 0.5
            ? formatDate(getRandomDateWithinDays(-30, 30))
            : null,
        isActive: true,
        description: `毎日${dailyTarget}${activity.quantityUnit}を目標に頑張る`,
      });
    }
  }

  // タスク
  const tasksData = [
    {
      title: "週次レポートを作成する",
      memo: "今週の進捗をまとめる",
      daysFromNow: getRandomInt(-3, 7),
      done: Math.random() < 0.3,
    },
    {
      title: "歯医者の予約",
      memo: "定期検診の予約を取る",
      daysFromNow: getRandomInt(1, 14),
      done: false,
    },
    {
      title: "プロジェクトの企画書を書く",
      memo: "新規プロジェクトの提案資料",
      daysFromNow: getRandomInt(3, 10),
      done: false,
    },
    {
      title: "誕生日プレゼントを買う",
      memo: "",
      daysFromNow: getRandomInt(5, 20),
      done: Math.random() < 0.2,
    },
    {
      title: "オンライン勉強会に参加",
      memo: "TypeScriptの新機能について",
      daysFromNow: getRandomInt(-7, -1),
      done: true,
    },
    {
      title: "家の掃除",
      memo: "週末の大掃除",
      daysFromNow: getRandomInt(0, 3),
      done: Math.random() < 0.4,
    },
  ];

  const selectedTasks = tasksData
    .sort(() => Math.random() - 0.5)
    .slice(0, getRandomInt(3, 5));

  for (const taskData of selectedTasks) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + taskData.daysFromNow);

    await db.insert(tasks).values({
      id: randomUUID(),
      userId: user.id,
      title: taskData.title,
      memo: taskData.memo,
      dueDate: formatDate(dueDate),
      startDate: taskData.daysFromNow > 0 ? formatDate(new Date()) : null,
      doneDate: taskData.done
        ? formatDate(getRandomDateWithinDays(Math.abs(taskData.daysFromNow), 0))
        : null,
    });
  }
}

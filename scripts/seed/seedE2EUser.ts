import type { DrizzleInstance } from "../../apps/backend/infra/rdb/drizzle/drizzleInstance";
import {
  activities,
  activityKinds,
  activityLogs,
  tasks,
  userSubscriptions,
  users,
} from "../../infra/drizzle/schema";

// E2E テスト用の決定論的ID
export const E2E_USER_ID = "e2e00000-0000-4000-8000-000000000000";
export const E2E_ACTIVITY_ID = "e2e00000-0000-4000-8000-000000000001";

const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};

export async function seedE2EUser(db: DrizzleInstance, hashedPassword: string) {
  await db.insert(users).values({
    id: E2E_USER_ID,
    loginId: "e2e@example.com",
    name: "E2Eテストユーザー",
    password: hashedPassword,
  });

  // 既知のアクティビティ1つ（manual モード）
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

  // 追加の5アクティビティ（各記録モード検証用）
  await db.insert(activities).values([
    {
      id: "e2e00000-0000-4000-8000-000000000010",
      userId: E2E_USER_ID,
      name: "E2Eカウンター",
      label: "カウント",
      emoji: "🔢",
      quantityUnit: "回",
      orderIndex: "b",
      iconType: "emoji",
      recordingMode: "counter",
      recordingModeConfig: JSON.stringify({ steps: [1, 5] }),
    },
    {
      id: "e2e00000-0000-4000-8000-000000000011",
      userId: E2E_USER_ID,
      name: "E2Eタイマー",
      label: "時間",
      emoji: "⏱",
      quantityUnit: "分",
      orderIndex: "c",
      iconType: "emoji",
      recordingMode: "timer",
    },
    {
      id: "e2e00000-0000-4000-8000-000000000012",
      userId: E2E_USER_ID,
      name: "E2Eバイナリ",
      label: "結果",
      emoji: "🆚",
      quantityUnit: "回",
      orderIndex: "d",
      iconType: "emoji",
      recordingMode: "binary",
    },
    {
      id: "e2e00000-0000-4000-8000-000000000013",
      userId: E2E_USER_ID,
      name: "E2Eテンキー",
      label: "スコア",
      emoji: "🔟",
      quantityUnit: "点",
      orderIndex: "e",
      iconType: "emoji",
      recordingMode: "numpad",
    },
    {
      id: "e2e00000-0000-4000-8000-000000000014",
      userId: E2E_USER_ID,
      name: "E2Eチェック",
      label: "完了",
      emoji: "✅",
      quantityUnit: "回",
      orderIndex: "f",
      iconType: "emoji",
      recordingMode: "check",
    },
  ]);

  // activityKinds (Binary は必須、他は Kind 選択 E2E 用に追加)
  await db.insert(activityKinds).values([
    // E2Eバイナリ
    {
      id: "e2e00000-0000-4000-8000-000000000020",
      activityId: "e2e00000-0000-4000-8000-000000000012",
      name: "勝ち",
      orderIndex: "a",
    },
    {
      id: "e2e00000-0000-4000-8000-000000000021",
      activityId: "e2e00000-0000-4000-8000-000000000012",
      name: "負け",
      orderIndex: "b",
    },
    // E2Eランニング (Manual + Kind)
    {
      id: "e2e00000-0000-4000-8000-000000000022",
      activityId: E2E_ACTIVITY_ID,
      name: "kind-A",
      orderIndex: "a",
    },
    {
      id: "e2e00000-0000-4000-8000-000000000023",
      activityId: E2E_ACTIVITY_ID,
      name: "kind-B",
      orderIndex: "b",
    },
    // E2Eカウンター (Counter + Kind)
    {
      id: "e2e00000-0000-4000-8000-000000000024",
      activityId: "e2e00000-0000-4000-8000-000000000010",
      name: "kind-C",
      orderIndex: "a",
    },
    {
      id: "e2e00000-0000-4000-8000-000000000025",
      activityId: "e2e00000-0000-4000-8000-000000000010",
      name: "kind-D",
      orderIndex: "b",
    },
    // E2Eテンキー (Numpad + Kind)
    {
      id: "e2e00000-0000-4000-8000-000000000026",
      activityId: "e2e00000-0000-4000-8000-000000000013",
      name: "kind-E",
      orderIndex: "a",
    },
    {
      id: "e2e00000-0000-4000-8000-000000000027",
      activityId: "e2e00000-0000-4000-8000-000000000013",
      name: "kind-F",
      orderIndex: "b",
    },
    // E2Eチェック (Check + Kind)
    {
      id: "e2e00000-0000-4000-8000-000000000028",
      activityId: "e2e00000-0000-4000-8000-000000000014",
      name: "kind-G",
      orderIndex: "a",
    },
    {
      id: "e2e00000-0000-4000-8000-000000000029",
      activityId: "e2e00000-0000-4000-8000-000000000014",
      name: "kind-H",
      orderIndex: "b",
    },
  ]);

  // アクティビティログ1件
  await db.insert(activityLogs).values({
    id: "e2e00000-0000-4000-8000-000000000002",
    userId: E2E_USER_ID,
    activityId: E2E_ACTIVITY_ID,
    date: formatDate(new Date()),
    quantity: 5,
  });

  // タスク（グルーピング表示テスト用）
  const today = new Date();
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return formatDate(d);
  };
  await db.insert(tasks).values([
    {
      id: "e2e00000-0000-4000-8000-000000000030",
      userId: E2E_USER_ID,
      title: "task-overdue",
      dueDate: addDays(-2),
    },
    {
      id: "e2e00000-0000-4000-8000-000000000031",
      userId: E2E_USER_ID,
      title: "task-dueToday",
      dueDate: addDays(0),
    },
    {
      id: "e2e00000-0000-4000-8000-000000000032",
      userId: E2E_USER_ID,
      title: "task-startingToday",
      startDate: addDays(0),
      dueDate: addDays(5),
    },
    {
      id: "e2e00000-0000-4000-8000-000000000033",
      userId: E2E_USER_ID,
      title: "task-inProgress",
      startDate: addDays(-3),
      dueDate: addDays(10),
    },
    {
      id: "e2e00000-0000-4000-8000-000000000034",
      userId: E2E_USER_ID,
      title: "task-dueThisWeek",
      dueDate: addDays(3),
    },
    {
      id: "e2e00000-0000-4000-8000-000000000035",
      userId: E2E_USER_ID,
      title: "task-notStarted",
      startDate: addDays(14),
    },
    {
      id: "e2e00000-0000-4000-8000-000000000036",
      userId: E2E_USER_ID,
      title: "task-completed",
      dueDate: addDays(-1),
      doneDate: addDays(-1),
    },
  ]);

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

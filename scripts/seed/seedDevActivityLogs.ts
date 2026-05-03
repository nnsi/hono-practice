import { randomUUID } from "node:crypto";

import type { DrizzleInstance } from "../../apps/backend/infra/rdb/drizzle/drizzleInstance";
import { activityGoals, activityLogs } from "../../infra/drizzle/schema";
import {
  formatDate,
  formatTime,
  getRandomDateWithinDays,
  getRandomFloat,
  getRandomInt,
} from "./seedRandomUtils";

type ActivityRow = { id: string; name: string; quantityUnit: string | null };

export async function seedActivityLogs(
  db: DrizzleInstance,
  userId: string,
  activity: ActivityRow,
  kindIds: string[],
) {
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
        userId,
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
}

export async function seedActivityGoal(
  db: DrizzleInstance,
  userId: string,
  activity: ActivityRow,
) {
  if (Math.random() >= 0.8) return;

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
    userId,
    activityId: activity.id,
    dailyTargetQuantity: dailyTarget,
    startDate: formatDate(getRandomDateWithinDays(7)),
    endDate:
      Math.random() < 0.5 ? formatDate(getRandomDateWithinDays(-30, 30)) : null,
    isActive: true,
    description: `毎日${dailyTarget}${activity.quantityUnit}を目標に頑張る`,
  });
}

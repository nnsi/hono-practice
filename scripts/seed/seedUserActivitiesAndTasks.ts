import { randomUUID } from "node:crypto";

import type { DrizzleInstance } from "../../apps/backend/infra/rdb/drizzle/drizzleInstance";
import { activities, activityKinds, tasks } from "../../infra/drizzle/schema";
import { seedActivityGoal, seedActivityLogs } from "./seedDevActivityLogs";
import {
  DEV_ACTIVITIES_DATA,
  DEV_TASKS_DATA,
  formatDate,
  getRandomDateWithinDays,
  getRandomInt,
} from "./seedRandomUtils";

export async function seedUserActivitiesAndTasks(
  db: DrizzleInstance,
  user: { id: string },
) {
  const selectedActivities = [...DEV_ACTIVITIES_DATA]
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

    await seedActivityLogs(db, user.id, activity, kindIds);
    await seedActivityGoal(db, user.id, activity);
  }

  const selectedTasks = [...DEV_TASKS_DATA]
    .sort(() => Math.random() - 0.5)
    .slice(0, getRandomInt(3, 5));

  for (const taskData of selectedTasks) {
    const daysFromNow = taskData.daysFromNow();
    const done = taskData.done();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);

    await db.insert(tasks).values({
      id: randomUUID(),
      userId: user.id,
      title: taskData.title,
      memo: taskData.memo,
      dueDate: formatDate(dueDate),
      startDate: daysFromNow > 0 ? formatDate(new Date()) : null,
      doneDate: done
        ? formatDate(getRandomDateWithinDays(Math.abs(daysFromNow), 0))
        : null,
    });
  }
}

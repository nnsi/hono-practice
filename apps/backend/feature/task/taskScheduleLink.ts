import { AppError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import type { UserId } from "@packages/domain/user/userSchema";

import type { TaskRepository } from "./taskRepository";

export async function assertTaskScheduleLink(
  repo: TaskRepository,
  tracer: Tracer,
  userId: UserId,
  scheduleId: string | null | undefined,
) {
  if (scheduleId == null) return;
  const ids = await tracer.span("db.getOwnedTaskScheduleIds", () =>
    repo.getOwnedTaskScheduleIds(userId, [scheduleId]),
  );
  if (!ids.includes(scheduleId))
    throw new AppError("scheduleId does not belong to user", 400);
}

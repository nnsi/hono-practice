import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import {
  SyncActivitiesEnvelopeSchema,
  UpsertActivityKindRequestSchema,
  UpsertActivityRequestSchema,
} from "@packages/types";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { newActivitySyncHandler } from "./activitySyncHandler";
import { newActivitySyncRepository } from "./activitySyncRepository";
import { newActivitySyncUsecase } from "./activitySyncUsecase";

export function createActivitySyncRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newActivitySyncHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newActivitySyncRepository(db);
    const uc = newActivitySyncUsecase(repo, tracer);
    const h = newActivitySyncHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/activities", async (c) => {
      const userId = c.get("userId");
      const res = await c.var.h.getActivities(userId);
      return c.json(res);
    })
    .post(
      "/activities/sync",
      zValidator("json", SyncActivitiesEnvelopeSchema),
      async (c) => {
        const userId = c.get("userId");
        const { activities, activityKinds } = c.req.valid("json");
        const activityBatch = parseRecords(
          activities,
          UpsertActivityRequestSchema,
          "activity",
        );
        const kindBatch = parseRecords(
          activityKinds,
          UpsertActivityKindRequestSchema,
          "activityKind",
        );
        const res = await c.var.h.syncActivities(
          userId,
          activityBatch.valid,
          kindBatch.valid,
        );
        return c.json({
          activities: {
            ...res.activities,
            failures: [...res.activities.failures, ...activityBatch.failures],
          },
          activityKinds: {
            ...res.activityKinds,
            failures: [...res.activityKinds.failures, ...kindBatch.failures],
          },
        });
      },
    );
}

function parseRecords<T>(
  records: unknown[],
  schema: {
    safeParse(
      value: unknown,
    ):
      | { success: true; data: T }
      | { success: false; error: { issues: { message: string }[] } };
  },
  recordType: string,
): {
  valid: T[];
  failures: {
    id: string;
    code: string;
    message: string;
    retryable: false;
  }[];
} {
  const valid: T[] = [];
  const failures: {
    id: string;
    code: string;
    message: string;
    retryable: false;
  }[] = [];
  records.forEach((record, index) => {
    const parsed = schema.safeParse(record);
    if (parsed.success) {
      valid.push(parsed.data);
      return;
    }
    const id =
      record &&
      typeof record === "object" &&
      "id" in record &&
      typeof record.id === "string"
        ? record.id
        : `${recordType}:${index}`;
    failures.push({
      id,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues.map((issue) => issue.message).join("; "),
      retryable: false,
    });
  });
  return { valid, failures };
}

export const activitySyncRoute = createActivitySyncRoute();

import type { MiddlewareHandler } from "hono";

import type { AppContext } from "@backend/context";
import type { SyncRepository } from "@backend/feature/sync/syncRepository";

type SyncConfig = {
  entityType: "activity" | "task" | "goal" | "activityLog";
  getEntityId?: (ctx: any) => string | undefined;
  getPayload?: (ctx: any) => any;
};

const routeConfigs: Record<string, SyncConfig> = {
  // Activities
  "POST /users/activities": { entityType: "activity" },
  "PUT /users/activities/:id": {
    entityType: "activity",
    getEntityId: (ctx) => ctx.req.param("id"),
  },
  "DELETE /users/activities/:id": {
    entityType: "activity",
    getEntityId: (ctx) => ctx.req.param("id"),
  },
  "PUT /users/activities/:id/order": {
    entityType: "activity",
    getEntityId: (ctx) => ctx.req.param("id"),
  },

  // Tasks
  "POST /users/tasks": { entityType: "task" },
  "PUT /users/tasks/:id": {
    entityType: "task",
    getEntityId: (ctx) => ctx.req.param("id"),
  },
  "DELETE /users/tasks/:id": {
    entityType: "task",
    getEntityId: (ctx) => ctx.req.param("id"),
  },

  // Goals
  "POST /users/goals": { entityType: "goal" },
  "PUT /users/goals/:id": {
    entityType: "goal",
    getEntityId: (ctx) => ctx.req.param("id"),
  },
  "DELETE /users/goals/:id": {
    entityType: "goal",
    getEntityId: (ctx) => ctx.req.param("id"),
  },

  // Activity Logs
  "POST /users/activity-logs": { entityType: "activityLog" },
  "PUT /users/activity-logs/:id": {
    entityType: "activityLog",
    getEntityId: (ctx) => ctx.req.param("id"),
  },
  "DELETE /users/activity-logs/:id": {
    entityType: "activityLog",
    getEntityId: (ctx) => ctx.req.param("id"),
  },
};

export const syncMiddleware = <T extends AppContext = AppContext>(
  syncRepo: SyncRepository,
): MiddlewareHandler<T> => {
  return async (c, next) => {
    // テスト環境では同期しない
    if (c.env.NODE_ENV === "test") {
      await next();
      return;
    }

    const method = c.req.method;
    const path = c.req.path;
    const userId = c.get("userId");

    // ルートパターンをマッチング
    let matchedConfig: SyncConfig | undefined;

    for (const [pattern, config] of Object.entries(routeConfigs)) {
      const [routeMethod, routePath] = pattern.split(" ");
      if (method === routeMethod && matchesPath(path, routePath)) {
        matchedConfig = config;
        break;
      }
    }

    // 同期対象でない場合はスキップ
    if (!matchedConfig || !userId) {
      await next();
      return;
    }

    // リクエストボディを保存（POSTとPUTの場合）
    let requestBody: any;
    if (method === "POST" || method === "PUT") {
      try {
        requestBody = await c.req.json();
      } catch {}
    }

    // ハンドラーを実行
    await next();

    // レスポンスが成功（2xx）の場合のみ同期
    if (c.res.status >= 200 && c.res.status < 300) {
      try {
        // レスポンスボディを取得
        const responseBody = await c.res
          .clone()
          .json()
          .catch(() => null);

        // エンティティIDを決定
        let entityId = matchedConfig.getEntityId?.(c);
        if (!entityId && responseBody?.id) {
          entityId = responseBody.id;
        }

        // 操作タイプを決定
        const operationType =
          method === "POST"
            ? ("create" as const)
            : method === "PUT"
              ? ("update" as const)
              : method === "DELETE"
                ? ("delete" as const)
                : undefined;

        if (entityId && operationType) {
          // ペイロードを決定
          const payload =
            operationType === "delete" ? {} : responseBody || requestBody || {};

          // 同期キューに追加（非同期で実行）
          const syncJob = syncRepo.enqueueSync([
            {
              userId,
              entityType: matchedConfig.entityType,
              entityId,
              operation: operationType,
              payload,
              timestamp: new Date(),
              sequenceNumber: Date.now(),
            },
          ]);

          // エラーハンドリング
          syncJob.catch((error) => {
            console.error("Failed to enqueue sync:", error);
          });

          // Cloudflare Workersの場合はwaitUntilで実行を保証
          if (c.executionCtx?.waitUntil) {
            c.executionCtx.waitUntil(syncJob);
          }
        }
      } catch (error) {
        // 同期エラーはログに記録するが、リクエストは失敗させない
        console.error("Sync middleware error:", error);
      }
    }
  };
};

// パスマッチング関数
function matchesPath(actualPath: string, pattern: string): boolean {
  // パターンを正規表現に変換
  const regexPattern = pattern
    .replace(/:[^/]+/g, "[^/]+") // :idを任意の文字列にマッチ
    .replace(/\//g, "\\/"); // /をエスケープ

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(actualPath);
}

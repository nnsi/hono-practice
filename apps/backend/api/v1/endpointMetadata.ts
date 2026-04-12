import {
  CreateAIActivityLogRequestSchema,
  CreateActivityLogBatchRequestSchema,
  CreateActivityLogRequestSchema,
  UpdateActivityLogRequestSchema,
  createTaskRequestSchema,
  getActivityLogStatsRequestSchema,
  getActivityLogsRequestSchema,
  getTasksRequestSchema,
  updateTaskRequestSchema,
} from "@packages/types/request";
import type { z } from "zod";

export type EndpointMeta = {
  description: string;
  requestSchema?: z.ZodTypeAny;
  queryParamsSchema?: z.ZodTypeAny;
};

export type EndpointGroupMeta = {
  id: string;
  title: string;
  description: string;
  pathPrefix: string;
};

// エンドポイントの順序は ENDPOINT_GROUPS の順 + 定義順
export const ENDPOINT_GROUP_METADATA: EndpointGroupMeta[] = [
  {
    id: "activity-logs",
    title: "Activity Logs",
    pathPrefix: "/activity-logs",
    description: "活動ログの取得・作成・更新・削除",
  },
  {
    id: "tasks",
    title: "Tasks",
    pathPrefix: "/tasks",
    description: "タスクの取得・作成・更新・削除・アーカイブ",
  },
  {
    id: "ai",
    title: "AI (Voice Input)",
    pathPrefix: "/ai",
    description:
      "音声テキストからAIが活動ログを自動作成。iOS/Androidアプリでは、Premiumユーザーのログイン時にvoiceスコープのAPIキーが自動発行され、ウィジェットからの音声入力に使用されます。",
  },
];

// key format: "METHOD path" (path は api/v1 basePath 直下の値で Hono の app.routes と一致する)
export const ENDPOINT_METADATA: Record<string, EndpointMeta> = {
  // Activity Logs
  "GET /activity-logs": {
    description:
      "活動ログ一覧を取得する。日付またはyyyy-mm形式で月単位取得も可能。",
    queryParamsSchema: getActivityLogsRequestSchema,
  },
  "GET /activity-logs/stats": {
    description: "指定期間のアクティビティ別集計統計を取得する。",
    queryParamsSchema: getActivityLogStatsRequestSchema,
  },
  "GET /activity-logs/:id": {
    description: "活動ログを1件取得する。",
  },
  "POST /activity-logs": {
    description: "活動ログを1件作成する。",
    requestSchema: CreateActivityLogRequestSchema,
  },
  "POST /activity-logs/batch": {
    description: "活動ログを一括作成する（最大500件）。",
    requestSchema: CreateActivityLogBatchRequestSchema,
  },
  "PUT /activity-logs/:id": {
    description: "活動ログを更新する。",
    requestSchema: UpdateActivityLogRequestSchema,
  },
  "DELETE /activity-logs/:id": {
    description: "活動ログを削除する。",
  },
  // Tasks
  "GET /tasks": {
    description: "指定日のタスク一覧を取得する。",
    queryParamsSchema: getTasksRequestSchema,
  },
  "GET /tasks/archived": {
    description: "アーカイブ済みタスク一覧を取得する。",
  },
  "GET /tasks/:id": {
    description: "タスクを1件取得する。",
  },
  "POST /tasks": {
    description: "タスクを作成する。",
    requestSchema: createTaskRequestSchema,
  },
  "PUT /tasks/:id": {
    description: "タスクを更新する。",
    requestSchema: updateTaskRequestSchema,
  },
  "DELETE /tasks/:id": {
    description: "タスクを削除する。",
  },
  "POST /tasks/:id/archive": {
    description: "タスクをアーカイブする。",
  },
  // AI
  "POST /ai/activity-logs/from-speech": {
    description:
      "音声入力テキストをAIが解析し、対応するアクティビティを特定して活動ログを自動作成する。",
    requestSchema: CreateAIActivityLogRequestSchema,
  },
};

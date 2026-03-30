export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type Param = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type Endpoint = {
  method: HttpMethod;
  path: string;
  description: string;
  scope: string;
  queryParams?: Param[];
  requestBody?: Param[];
};

export type EndpointGroup = {
  id: string;
  title: string;
  description: string;
  endpoints: Endpoint[];
};

export const API_SCOPES = [
  { scope: "all", description: "全リソースへのフルアクセス" },
  { scope: "activity-logs:read", description: "活動ログの取得" },
  { scope: "activity-logs:write", description: "活動ログの作成・更新・削除" },
  { scope: "tasks:read", description: "タスクの取得" },
  { scope: "tasks:write", description: "タスクの作成・更新・削除" },
  { scope: "voice", description: "音声入力による活動ログ作成" },
] as const;

export const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    id: "activity-logs",
    title: "Activity Logs",
    description: "活動ログの取得・作成・更新・削除",
    endpoints: [
      {
        method: "GET",
        path: "/activity-logs",
        description:
          "活動ログ一覧を取得する。日付またはyyyy-mm形式で月単位取得も可能。",
        scope: "activity-logs:read",
        queryParams: [
          {
            name: "date",
            type: "string",
            required: false,
            description: "YYYY-MM-DD（日）または YYYY-MM（月）。省略時は今日",
          },
        ],
      },
      {
        method: "GET",
        path: "/activity-logs/stats",
        description: "指定期間のアクティビティ別集計統計を取得する。",
        scope: "activity-logs:read",
        queryParams: [
          {
            name: "date",
            type: "string",
            required: true,
            description: "YYYY-MM-DD（日）または YYYY-MM（月）",
          },
        ],
      },
      {
        method: "GET",
        path: "/activity-logs/:id",
        description: "活動ログを1件取得する。",
        scope: "activity-logs:read",
      },
      {
        method: "POST",
        path: "/activity-logs",
        description: "活動ログを1件作成する。",
        scope: "activity-logs:write",
        requestBody: [
          {
            name: "activityId",
            type: "string",
            required: false,
            description: "アクティビティID",
          },
          {
            name: "activityKindId",
            type: "string",
            required: false,
            description: "アクティビティ種別ID",
          },
          {
            name: "quantity",
            type: "number",
            required: true,
            description: "数量（0〜999999）",
          },
          {
            name: "date",
            type: "string",
            required: true,
            description: "日付 YYYY-MM-DD",
          },
          {
            name: "memo",
            type: "string",
            required: false,
            description: "メモ（最大1000文字）",
          },
          {
            name: "id",
            type: "string",
            required: false,
            description: "クライアント側ID（最大100文字）",
          },
        ],
      },
      {
        method: "POST",
        path: "/activity-logs/batch",
        description: "活動ログを一括作成する（最大500件）。",
        scope: "activity-logs:write",
        requestBody: [
          {
            name: "activityLogs",
            type: "ActivityLog[]",
            required: true,
            description:
              "作成する活動ログの配列（1〜500件）。各要素はPOST /activity-logsと同じ形式",
          },
        ],
      },
      {
        method: "PUT",
        path: "/activity-logs/:id",
        description: "活動ログを更新する。",
        scope: "activity-logs:write",
        requestBody: [
          {
            name: "quantity",
            type: "number",
            required: false,
            description: "数量（0〜999999）",
          },
          {
            name: "memo",
            type: "string",
            required: false,
            description: "メモ（最大1000文字）",
          },
          {
            name: "activityKindId",
            type: "string",
            required: false,
            description: "アクティビティ種別ID",
          },
        ],
      },
      {
        method: "DELETE",
        path: "/activity-logs/:id",
        description: "活動ログを削除する。",
        scope: "activity-logs:write",
      },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "タスクの取得・作成・更新・削除・アーカイブ",
    endpoints: [
      {
        method: "GET",
        path: "/tasks",
        description: "指定日のタスク一覧を取得する。",
        scope: "tasks:read",
        queryParams: [
          {
            name: "date",
            type: "string",
            required: false,
            description: "YYYY-MM-DD。省略時は全タスク",
          },
        ],
      },
      {
        method: "GET",
        path: "/tasks/archived",
        description: "アーカイブ済みタスク一覧を取得する。",
        scope: "tasks:read",
      },
      {
        method: "GET",
        path: "/tasks/:id",
        description: "タスクを1件取得する。",
        scope: "tasks:read",
      },
      {
        method: "POST",
        path: "/tasks",
        description: "タスクを作成する。",
        scope: "tasks:write",
        requestBody: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "タイトル（1〜20文字）",
          },
          {
            name: "startDate",
            type: "string",
            required: true,
            description: "開始日 YYYY-MM-DD",
          },
          {
            name: "dueDate",
            type: "string",
            required: false,
            description: "期限日 YYYY-MM-DD",
          },
          {
            name: "activityId",
            type: "string (UUID)",
            required: false,
            description: "紐付けるアクティビティID",
          },
          {
            name: "activityKindId",
            type: "string (UUID)",
            required: false,
            description: "アクティビティ種別ID",
          },
          {
            name: "quantity",
            type: "number",
            required: false,
            description: "目標数量（0〜999999）",
          },
          {
            name: "memo",
            type: "string",
            required: false,
            description: "メモ（最大1000文字）",
          },
        ],
      },
      {
        method: "PUT",
        path: "/tasks/:id",
        description: "タスクを更新する。",
        scope: "tasks:write",
        requestBody: [
          {
            name: "title",
            type: "string",
            required: false,
            description: "タイトル（1〜20文字）",
          },
          {
            name: "startDate",
            type: "string",
            required: false,
            description: "開始日",
          },
          {
            name: "dueDate",
            type: "string | null",
            required: false,
            description: "期限日（nullで解除）",
          },
          {
            name: "doneDate",
            type: "string | null",
            required: false,
            description: "完了日（nullで未完了に戻す）",
          },
          {
            name: "activityId",
            type: "string | null",
            required: false,
            description: "アクティビティID",
          },
          {
            name: "quantity",
            type: "number | null",
            required: false,
            description: "目標数量",
          },
          {
            name: "memo",
            type: "string",
            required: false,
            description: "メモ",
          },
        ],
      },
      {
        method: "DELETE",
        path: "/tasks/:id",
        description: "タスクを削除する。",
        scope: "tasks:write",
      },
      {
        method: "POST",
        path: "/tasks/:id/archive",
        description: "タスクをアーカイブする。",
        scope: "tasks:write",
      },
    ],
  },
  {
    id: "ai",
    title: "AI (Voice Input)",
    description:
      "音声テキストからAIが活動ログを自動作成。iOS/Androidアプリでは、Premiumユーザーのログイン時にvoiceスコープのAPIキーが自動発行され、ウィジェットからの音声入力に使用されます。",
    endpoints: [
      {
        method: "POST",
        path: "/ai/activity-logs/from-speech",
        description:
          "音声入力テキストをAIが解析し、対応するアクティビティを特定して活動ログを自動作成する。",
        scope: "voice",
        requestBody: [
          {
            name: "speechText",
            type: "string",
            required: true,
            description: "音声入力テキスト（1〜1000文字）",
          },
        ],
      },
    ],
  },
];

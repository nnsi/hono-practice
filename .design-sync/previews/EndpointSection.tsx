import { EndpointSection } from "actiko-frontend";

// API リファレンスの1グループ分のセクション。グループ見出し + 説明の下に、
// 各エンドポイントのカード（メソッドバッジ・パス・スコープ・説明 + パラメータ表）を並べる。
// 型は generated ファイル由来だが構造的に一致すればよいのでローカルに定義する。
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type Param = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

type Endpoint = {
  method: HttpMethod;
  path: string;
  description: string;
  scope: string;
  queryParams?: Param[];
  requestBody?: Param[];
};

type EndpointGroup = {
  id: string;
  title: string;
  description: string;
  endpoints: Endpoint[];
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 760 }}>
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        {children}
      </div>
    </div>
  );
}

const activityLogsGroup: EndpointGroup = {
  id: "activity-logs",
  title: "Activity Logs",
  description: "活動ログの取得・作成・更新・削除",
  endpoints: [
    {
      method: "GET",
      path: "/activity-logs",
      description:
        "活動ログ一覧を取得する。日付または yyyy-mm 形式で月単位取得も可能。",
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
      method: "POST",
      path: "/activity-logs",
      description: "活動ログを1件作成する。",
      scope: "activity-logs:write",
      requestBody: [
        {
          name: "activityId",
          type: "string",
          required: true,
          description: "対象の活動ID",
        },
        {
          name: "quantity",
          type: "number",
          required: true,
          description: "記録する数量",
        },
        {
          name: "date",
          type: "string",
          required: false,
          description: "YYYY-MM-DD。省略時は今日",
        },
      ],
    },
    {
      method: "DELETE",
      path: "/activity-logs/:id",
      description: "活動ログを1件削除する。",
      scope: "activity-logs:write",
    },
  ],
};

export function ActivityLogs() {
  return (
    <Frame>
      <EndpointSection group={activityLogsGroup} />
    </Frame>
  );
}

const tasksGroup: EndpointGroup = {
  id: "tasks",
  title: "Tasks",
  description: "タスクの取得・作成・更新・削除",
  endpoints: [
    {
      method: "GET",
      path: "/tasks",
      description: "タスク一覧を取得する。",
      scope: "tasks:read",
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
          description: "タスク名",
        },
        {
          name: "done",
          type: "boolean",
          required: false,
          description: "完了状態",
        },
      ],
    },
  ],
};

export function Tasks() {
  return (
    <Frame>
      <EndpointSection group={tasksGroup} />
    </Frame>
  );
}

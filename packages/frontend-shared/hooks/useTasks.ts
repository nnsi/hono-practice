import type { AppType } from "@backend/app";
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  type CreateTaskRequest,
  type UpdateTaskRequest,
  createTaskRequestSchema,
  updateTaskRequestSchema,
} from "../../types/request";
import {
  type GetTaskResponse,
  GetTaskResponseSchema,
  type GetTasksResponse,
  GetTasksResponseSchema,
} from "../../types/response";

export type UseTasksOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
  date?: string;
  includeArchived?: boolean;
};

export type UseArchivedTasksOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
  enabled?: boolean;
};

export type UseTaskOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
  id: string;
};

export type MutationOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

/**
 * タスク一覧を取得する共通フック
 */
export function createUseTasks(
  options: UseTasksOptions,
): UseQueryResult<GetTasksResponse> {
  const { apiClient, date, includeArchived = false } = options;
  const queryKey = ["tasks", { date, includeArchived }];

  return useQuery<GetTasksResponse>({
    queryKey,
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (date) query.date = date;

      const res = await apiClient.users.tasks.$get({ query });

      if (!res.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const json = await res.json();
      const parsed = GetTasksResponseSchema.safeParse(json);

      if (!parsed.success) {
        throw new Error("Failed to parse tasks");
      }

      // includeArchivedがfalseの場合は、アーカイブされていないタスクのみを返す
      if (!includeArchived) {
        return parsed.data.filter((task) => !task.archivedAt);
      }

      return parsed.data;
    },
  });
}

/**
 * アーカイブ済みタスク一覧を取得する共通フック
 */
export function createUseArchivedTasks(
  options: UseArchivedTasksOptions,
): UseQueryResult<GetTasksResponse> {
  const { apiClient, enabled = true } = options;

  return useQuery<GetTasksResponse>({
    queryKey: ["tasks", "archived"],
    queryFn: async () => {
      const res = await apiClient.users.tasks.archived.$get();

      if (!res.ok) {
        throw new Error("Failed to fetch archived tasks");
      }

      const json = await res.json();
      const parsed = GetTasksResponseSchema.safeParse(json);

      if (!parsed.success) {
        throw new Error("Failed to parse archived tasks");
      }

      return parsed.data;
    },
    enabled,
  });
}

/**
 * 単一のタスクを取得する共通フック
 */
export function createUseTask(
  options: UseTaskOptions,
): UseQueryResult<GetTaskResponse | null> {
  const { apiClient, id } = options;

  return useQuery<GetTaskResponse | null>({
    queryKey: ["task", id],
    queryFn: async () => {
      const res = await apiClient.users.tasks[":id"].$get({
        param: { id },
      });

      if (!res.ok) {
        if (res.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch task");
      }

      const json = await res.json();
      // Parse single task response
      const parsed = GetTaskResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Failed to parse task");
      }
      return parsed.data;
    },
    enabled: !!id,
  });
}

/**
 * タスク作成用の共通フック
 */
export function createUseCreateTask(
  options: MutationOptions,
): UseMutationResult<any, Error, CreateTaskRequest> {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskRequest) => {
      const validated = createTaskRequestSchema.parse(data);
      const res = await apiClient.users.tasks.$post({
        json: validated,
      });

      if (!res.ok) {
        throw new Error("Failed to create task");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/**
 * タスク更新用の共通フック
 */
export function createUseUpdateTask(
  options: MutationOptions,
): UseMutationResult<any, Error, { id: string; data: UpdateTaskRequest }> {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; data: UpdateTaskRequest }) => {
      const { id, data } = params;
      const validated = updateTaskRequestSchema.parse(data);
      const res = await apiClient.users.tasks[":id"].$put({
        param: { id },
        json: validated,
      });

      if (!res.ok) {
        throw new Error("Failed to update task");
      }

      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", variables.id] });
    },
  });
}

/**
 * タスク削除用の共通フック
 */
export function createUseDeleteTask(
  options: MutationOptions,
): UseMutationResult<any, Error, string> {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.users.tasks[":id"].$delete({
        param: { id },
      });

      if (!res.ok) {
        throw new Error("Failed to delete task");
      }

      return res.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", id] });
    },
  });
}

/**
 * タスクアーカイブ用の共通フック
 */
export function createUseArchiveTask(
  options: MutationOptions,
): UseMutationResult<any, Error, { id: string; date?: string }> {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; date?: string }) => {
      const { id } = params;
      const res = await apiClient.users.tasks[":id"].archive.$post({
        param: { id },
      });

      if (!res.ok) {
        throw new Error("Failed to archive task");
      }

      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "archived"] });
      queryClient.invalidateQueries({ queryKey: ["task", variables.id] });
    },
  });
}

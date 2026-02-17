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
import { buildOptimisticTask } from "../utils/optimisticData";

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
    mutationKey: ["create-task"],
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
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks: Map<string, unknown> = new Map();
      // すべてのtasksクエリキャッシュを退避
      queryClient
        .getQueriesData<GetTasksResponse>({ queryKey: ["tasks"] })
        .forEach(([key, data]) => {
          previousTasks.set(JSON.stringify(key), data);
        });
      const optimistic = buildOptimisticTask(newTask);
      // すべてのtasksクエリキャッシュに楽観的データを追加
      queryClient
        .getQueriesData<GetTasksResponse>({ queryKey: ["tasks"] })
        .forEach(([key]) => {
          queryClient.setQueryData<GetTasksResponse>(key, (old) => [
            ...(old ?? []),
            optimistic,
          ]);
        });
      return { previousTasks };
    },
    onError: (_err, _newTask, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach((data, keyStr) => {
          queryClient.setQueryData(JSON.parse(keyStr), data);
        });
      }
    },
    onSettled: () => {
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
    mutationKey: ["update-task"],
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
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      await queryClient.cancelQueries({
        queryKey: ["task", variables.id],
      });
      const previousTasks: Map<string, unknown> = new Map();
      queryClient
        .getQueriesData<GetTasksResponse>({ queryKey: ["tasks"] })
        .forEach(([key, data]) => {
          previousTasks.set(JSON.stringify(key), data);
        });
      const previousTask = queryClient.getQueryData<GetTaskResponse | null>([
        "task",
        variables.id,
      ]);
      // tasksリストキャッシュを更新
      queryClient
        .getQueriesData<GetTasksResponse>({ queryKey: ["tasks"] })
        .forEach(([key]) => {
          queryClient.setQueryData<GetTasksResponse>(key, (old) =>
            (old ?? []).map((t) =>
              t.id === variables.id
                ? { ...t, ...variables.data, updatedAt: new Date() }
                : t,
            ),
          );
        });
      // 個別タスクキャッシュを更新
      if (previousTask) {
        queryClient.setQueryData<GetTaskResponse>(
          ["task", variables.id],
          (old) =>
            old ? { ...old, ...variables.data, updatedAt: new Date() } : old,
        );
      }
      return { previousTasks, previousTask };
    },
    onError: (_err, variables, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach((data, keyStr) => {
          queryClient.setQueryData(JSON.parse(keyStr), data);
        });
      }
      if (context?.previousTask !== undefined) {
        queryClient.setQueryData(["task", variables.id], context.previousTask);
      }
    },
    onSettled: (_data, _error, variables) => {
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
    mutationKey: ["delete-task"],
    mutationFn: async (id: string) => {
      const res = await apiClient.users.tasks[":id"].$delete({
        param: { id },
      });

      if (!res.ok) {
        throw new Error("Failed to delete task");
      }

      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      await queryClient.cancelQueries({ queryKey: ["task", id] });
      const previousTasks: Map<string, unknown> = new Map();
      queryClient
        .getQueriesData<GetTasksResponse>({ queryKey: ["tasks"] })
        .forEach(([key, data]) => {
          previousTasks.set(JSON.stringify(key), data);
        });
      queryClient
        .getQueriesData<GetTasksResponse>({ queryKey: ["tasks"] })
        .forEach(([key]) => {
          queryClient.setQueryData<GetTasksResponse>(key, (old) =>
            (old ?? []).filter((t) => t.id !== id),
          );
        });
      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach((data, keyStr) => {
          queryClient.setQueryData(JSON.parse(keyStr), data);
        });
      }
    },
    onSettled: (_data, _error, id) => {
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
    mutationKey: ["archive-task"],
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
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks: Map<string, unknown> = new Map();
      queryClient
        .getQueriesData<GetTasksResponse>({ queryKey: ["tasks"] })
        .forEach(([key, data]) => {
          previousTasks.set(JSON.stringify(key), data);
        });
      // アーカイブされたタスクをリストから除去
      queryClient
        .getQueriesData<GetTasksResponse>({ queryKey: ["tasks"] })
        .forEach(([key]) => {
          queryClient.setQueryData<GetTasksResponse>(key, (old) =>
            (old ?? []).map((t) =>
              t.id === params.id ? { ...t, archivedAt: new Date() } : t,
            ),
          );
        });
      return { previousTasks };
    },
    onError: (_err, _params, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach((data, keyStr) => {
          queryClient.setQueryData(JSON.parse(keyStr), data);
        });
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "archived"] });
      queryClient.invalidateQueries({ queryKey: ["task", variables.id] });
    },
  });
}

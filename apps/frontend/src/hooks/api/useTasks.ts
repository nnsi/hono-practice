import { apiClient } from "@frontend/utils";
import {
  createUseArchiveTask,
  createUseArchivedTasks,
  createUseCreateTask,
  createUseDeleteTask,
  createUseTask,
  createUseTasks,
  createUseUpdateTask,
} from "@packages/frontend-shared/hooks";

/**
 * タスク一覧を取得するフック
 */
export function useTasks(options?: {
  date?: string;
  includeArchived?: boolean;
}) {
  return createUseTasks({
    apiClient,
    date: options?.date,
    includeArchived: options?.includeArchived,
  });
}

/**
 * アーカイブ済みタスク一覧を取得するフック
 */
export function useArchivedTasks(enabled = true) {
  return createUseArchivedTasks({ apiClient, enabled });
}

/**
 * 単一のタスクを取得するフック
 */
export function useTask(id: string) {
  return createUseTask({ apiClient, id });
}

/**
 * タスク作成用のフック
 */
export function useCreateTask() {
  return createUseCreateTask({ apiClient });
}

/**
 * タスク更新用のフック
 */
export function useUpdateTask() {
  return createUseUpdateTask({ apiClient });
}

/**
 * タスク削除用のフック
 */
export function useDeleteTask() {
  return createUseDeleteTask({ apiClient });
}

/**
 * タスクアーカイブ用のフック
 */
export function useArchiveTask() {
  return createUseArchiveTask({ apiClient });
}

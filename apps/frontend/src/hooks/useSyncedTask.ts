import { apiClient } from "@frontend/utils/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";

import { useNetworkStatusContext } from "../providers/NetworkStatusProvider";

import { useSyncedMutation } from "./useSyncedMutation";

type CreateTaskVariables = {
  title: string;
  startDate: string;
};

type UpdateTaskVariables = {
  id: string;
  doneDate?: string | null;
  title?: string;
  memo?: string;
  // 楽観的更新用
  date?: string;
};

type DeleteTaskVariables = {
  id: string;
  date?: string;
};

type MutationContext = {
  previousTasksData?: any;
  previousAllTasksData?: any;
};

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatusContext();

  return useSyncedMutation({
    entityType: "task",
    operation: "create",
    getEntityId: () => uuidv4(),
    onMutate: async (variables: CreateTaskVariables) => {
      // 楽観的更新: 即座にUIを更新
      const optimisticTask = {
        id: `optimistic-${uuidv4()}`,
        userId: "offline",
        title: variables.title,
        memo: null,
        doneDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 各キーのキャッシュを更新
      const tasksKey = ["tasks", variables.startDate];
      const allTasksKey = ["tasks"];

      // 既存のキャッシュを保存（ロールバック用）
      const previousTasksData = queryClient.getQueryData(tasksKey);
      const previousAllTasksData = queryClient.getQueryData(allTasksKey);

      // 楽観的にキャッシュを更新
      queryClient.setQueryData(tasksKey, (prev: any) => {
        if (!prev) return [optimisticTask];
        return [...prev, optimisticTask];
      });

      // キャンセル可能なクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: tasksKey });
      await queryClient.cancelQueries({ queryKey: allTasksKey });

      // ロールバック用のデータを返す
      return { previousTasksData, previousAllTasksData };
    },
    onlineAction: async (variables: CreateTaskVariables) => {
      const response = await apiClient.users.tasks.$post({
        json: {
          title: variables.title,
          startDate: variables.startDate,
        },
      });

      if (!response.ok) {
        throw new Error("タスクの作成に失敗しました");
      }

      return await response.json();
    },
    offlineAction: (variables: CreateTaskVariables) => {
      console.log("[useSyncedTask] オフラインでタスクを作成");
      const taskId = uuidv4();

      const newTask = {
        id: taskId,
        userId: "offline",
        title: variables.title,
        memo: null,
        doneDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // ローカルストレージに保存
      const storageKey = `offline-tasks-${variables.startDate}`;
      const existingTasks = JSON.parse(
        localStorage.getItem(storageKey) || "[]",
      );
      existingTasks.push(newTask);
      localStorage.setItem(storageKey, JSON.stringify(existingTasks));

      // カスタムイベントを発火
      window.dispatchEvent(new Event("offline-data-updated"));

      return newTask;
    },
    onSuccess: (data, variables) => {
      console.log("[useSyncedTask] タスクを作成しました:", data);

      // オンラインで成功した場合のみ、ローカルストレージのオフラインデータをクリア
      if (isOnline) {
        const storageKey = `offline-tasks-${variables.startDate}`;
        const existingTasks = JSON.parse(
          localStorage.getItem(storageKey) || "[]",
        );
        const filteredTasks = existingTasks.filter(
          (task: any) => task.id !== data.id,
        );
        if (filteredTasks.length === 0) {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, JSON.stringify(filteredTasks));
        }
      }

      // カスタムイベントを発火
      window.dispatchEvent(new Event("offline-data-updated"));

      // 楽観的更新されたデータを実際のデータで置き換え
      const tasksKey = ["tasks", variables.startDate];
      queryClient.setQueryData(tasksKey, (prev: any) => {
        if (!prev) return [data];
        // optimistic-で始まるIDを実際のデータで置き換え
        return prev.map((task: any) =>
          task.id.startsWith("optimistic-") ? data : task,
        );
      });

      // クエリを無効化してリフェッチを促す
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error, variables, context) => {
      console.error("[useSyncedTask] エラー:", error);
      // エラー時は楽観的更新をロールバック
      const ctx = context as MutationContext | undefined;
      if (ctx) {
        const tasksKey = ["tasks", variables.startDate];
        queryClient.setQueryData(tasksKey, ctx.previousTasksData);
        queryClient.setQueryData(["tasks"], ctx.previousAllTasksData);
      }
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useSyncedMutation({
    entityType: "task",
    operation: "update",
    getEntityId: (variables: UpdateTaskVariables) => variables.id,
    onMutate: async (variables: UpdateTaskVariables) => {
      if (!variables.date) return;

      // 楽観的更新のために現在のキャッシュを取得
      const tasksKey = ["tasks", variables.date];
      const allTasksKey = ["tasks"];

      // 既存のキャッシュを保存
      const previousTasksData = queryClient.getQueryData(tasksKey);
      const previousAllTasksData = queryClient.getQueryData(allTasksKey);

      // 楽観的にキャッシュを更新
      const updateTask = (task: any) => {
        if (task.id !== variables.id) return task;
        return {
          ...task,
          doneDate:
            variables.doneDate !== undefined
              ? variables.doneDate
              : task.doneDate,
          title: variables.title !== undefined ? variables.title : task.title,
          memo: variables.memo !== undefined ? variables.memo : task.memo,
          updatedAt: new Date().toISOString(),
        };
      };

      queryClient.setQueryData(tasksKey, (prev: any) => {
        if (!prev) return prev;
        return prev.map(updateTask);
      });

      return { previousTasksData, previousAllTasksData };
    },
    onlineAction: async (variables: UpdateTaskVariables) => {
      const response = await apiClient.users.tasks[":id"].$put({
        param: { id: variables.id },
        json: {
          doneDate: variables.doneDate,
          title: variables.title,
          memo: variables.memo,
        },
      });

      if (!response.ok) {
        throw new Error("タスクの更新に失敗しました");
      }

      return await response.json();
    },
    offlineAction: (variables: UpdateTaskVariables) => {
      // オフライン時は完全な応答オブジェクトを返す必要がある
      return {
        id: variables.id,
        userId: "offline",
        title: "", // 実際の値はUIで楽観的更新される
        memo: null,
        doneDate: variables.doneDate !== undefined ? variables.doneDate : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: (_data, variables) => {
      console.log("[useSyncedTask] タスクを更新しました");

      // クエリを無効化してリフェッチ
      if (variables.date) {
        const tasksKey = ["tasks", variables.date];
        queryClient.invalidateQueries({ queryKey: tasksKey });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error, variables, context) => {
      console.error("[useSyncedTask] 更新エラー:", error);
      // エラー時は楽観的更新をロールバック
      const ctx = context as MutationContext | undefined;
      if (ctx && variables.date) {
        const tasksKey = ["tasks", variables.date];
        queryClient.setQueryData(tasksKey, ctx.previousTasksData);
        queryClient.setQueryData(["tasks"], ctx.previousAllTasksData);
      }
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatusContext();

  return useSyncedMutation({
    entityType: "task",
    operation: "delete",
    getEntityId: (variables: DeleteTaskVariables) => variables.id,
    onMutate: async (variables: DeleteTaskVariables) => {
      if (!variables.date) return;

      // 楽観的更新のために現在のキャッシュを取得
      const tasksKey = ["tasks", variables.date];
      const allTasksKey = ["tasks"];

      // 既存のキャッシュを保存
      const previousTasksData = queryClient.getQueryData(tasksKey);
      const previousAllTasksData = queryClient.getQueryData(allTasksKey);

      // 楽観的にキャッシュから削除
      const filterOutDeleted = (tasks: any[]) => {
        if (!tasks) return tasks;
        return tasks.filter((task: any) => task.id !== variables.id);
      };

      queryClient.setQueryData(tasksKey, filterOutDeleted);

      // キャンセル可能なクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: tasksKey });
      await queryClient.cancelQueries({ queryKey: allTasksKey });

      return { previousTasksData, previousAllTasksData };
    },
    onlineAction: async (variables: DeleteTaskVariables) => {
      const response = await apiClient.users.tasks[":id"].$delete({
        param: { id: variables.id },
      });

      if (!response.ok) {
        throw new Error("タスクの削除に失敗しました");
      }

      return true;
    },
    offlineAction: (variables: DeleteTaskVariables) => {
      // オフライン時はローカルストレージから削除
      if (variables.date) {
        const storageKey = `offline-tasks-${variables.date}`;
        const existingTasks = JSON.parse(
          localStorage.getItem(storageKey) || "[]",
        );
        const filteredTasks = existingTasks.filter(
          (task: any) => task.id !== variables.id,
        );

        if (filteredTasks.length === 0) {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, JSON.stringify(filteredTasks));
        }

        // 削除されたIDを記録
        const deletedKey = `deleted-tasks-${variables.date}`;
        const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || "[]");
        if (!deletedIds.includes(variables.id)) {
          deletedIds.push(variables.id);
          localStorage.setItem(deletedKey, JSON.stringify(deletedIds));
        }

        // カスタムイベントを発火
        window.dispatchEvent(new Event("offline-data-updated"));
      }

      return true;
    },
    onSuccess: (_data, variables) => {
      console.log("[useSyncedTask] タスクを削除しました");

      // オンライン時のみ、削除が成功したら削除IDリストからIDを削除
      if (isOnline && variables.date) {
        const deletedKey = `deleted-tasks-${variables.date}`;
        const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || "[]");
        const filteredDeletedIds = deletedIds.filter(
          (id: string) => id !== variables.id,
        );

        if (filteredDeletedIds.length === 0) {
          localStorage.removeItem(deletedKey);
        } else {
          localStorage.setItem(deletedKey, JSON.stringify(filteredDeletedIds));
        }
      }

      // React Queryのキャッシュを無効化
      if (variables.date) {
        const tasksKey = ["tasks", variables.date];
        queryClient.invalidateQueries({ queryKey: tasksKey });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error, variables, context) => {
      console.error("[useSyncedTask] 削除エラー:", error);
      // エラー時は楽観的更新をロールバック
      const ctx = context as MutationContext | undefined;
      if (ctx && variables.date) {
        const tasksKey = ["tasks", variables.date];
        queryClient.setQueryData(tasksKey, ctx.previousTasksData);
        queryClient.setQueryData(["tasks"], ctx.previousAllTasksData);
      }
    },
  });
}

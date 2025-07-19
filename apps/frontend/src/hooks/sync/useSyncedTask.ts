import { apiClient } from "@frontend/utils/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";

import { useNetworkStatusContext } from "../../providers/NetworkStatusProvider";

import { useSyncedMutation } from "./useSyncedMutation";

type CreateTaskVariables = {
  title: string;
  startDate: string;
  dueDate?: string;
  memo?: string;
};

type UpdateTaskVariables = {
  id: string;
  doneDate?: string | null;
  title?: string;
  memo?: string;
  startDate?: string;
  dueDate?: string | null;
  // 楽観的更新用
  date?: string;
};

type DeleteTaskVariables = {
  id: string;
  date?: string;
};

type ArchiveTaskVariables = {
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

  // タスクIDを事前に生成して保持
  let taskId: string;

  return useSyncedMutation({
    entityType: "task",
    operation: "create",
    getEntityId: () => {
      // 既に生成されたtaskIdを返すか、新しく生成
      if (!taskId) {
        taskId = uuidv4();
      }
      return taskId;
    },
    onMutate: async (variables: CreateTaskVariables) => {
      // taskIdを初期化
      taskId = uuidv4();

      // 楽観的更新: 即座にUIを更新
      const optimisticTask = {
        id: taskId,
        userId: "offline",
        title: variables.title,
        startDate: variables.startDate,
        dueDate: variables.dueDate || null,
        memo: variables.memo || null,
        doneDate: null,
        archivedAt: null,
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
          dueDate: variables.dueDate,
          memo: variables.memo,
        },
      });

      if (!response.ok) {
        throw new Error("タスクの作成に失敗しました");
      }

      return await response.json();
    },
    offlineAction: (variables: CreateTaskVariables) => {
      // 既に生成されたtaskIdを使用
      const newTask = {
        id: taskId,
        userId: "offline",
        title: variables.title,
        startDate: variables.startDate,
        dueDate: variables.dueDate || null,
        memo: variables.memo || null,
        doneDate: null,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 同期用にvariablesにidを追加
      (variables as any).id = taskId;
      // memoフィールドがundefinedの場合はnullに設定
      if (variables.memo === undefined) {
        (variables as any).memo = null;
      }

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
        // taskIdで一致するタスクを実際のデータで置き換え
        return prev.map((task: any) => (task.id === taskId ? data : task));
      });

      // クエリを無効化してリフェッチを促す
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (_error, variables, context) => {
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
      // 全タスクのキャッシュを更新（["tasks", "all"]を使用）
      const allTasksKey = ["tasks", "all"];

      // 既存のキャッシュを保存
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
          startDate:
            variables.startDate !== undefined
              ? variables.startDate
              : task.startDate,
          dueDate:
            variables.dueDate !== undefined ? variables.dueDate : task.dueDate,
          updatedAt: new Date().toISOString(),
        };
      };

      queryClient.setQueryData(allTasksKey, (prev: any) => {
        if (!prev) return prev;
        return prev.map(updateTask);
      });

      // キャンセル可能なクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: allTasksKey });

      return { previousAllTasksData };
    },
    onlineAction: async (variables: UpdateTaskVariables) => {
      const response = await apiClient.users.tasks[":id"].$put({
        param: { id: variables.id },
        json: {
          doneDate: variables.doneDate,
          title: variables.title,
          memo: variables.memo,
          startDate: variables.startDate,
          dueDate: variables.dueDate,
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
        startDate: null,
        dueDate: null,
        memo: null,
        doneDate: variables.doneDate !== undefined ? variables.doneDate : null,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: (_data, _variables) => {
      // クエリを無効化してリフェッチ
      queryClient.invalidateQueries({ queryKey: ["tasks", "all"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (_error, _variables, context) => {
      // エラー時は楽観的更新をロールバック
      const ctx = context as MutationContext | undefined;
      if (ctx) {
        queryClient.setQueryData(["tasks", "all"], ctx.previousAllTasksData);
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
    onError: (_error, variables, context) => {
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

export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useSyncedMutation({
    entityType: "task",
    operation: "update",
    getEntityId: (variables: ArchiveTaskVariables) => variables.id,
    onMutate: async (variables: ArchiveTaskVariables) => {
      if (!variables.date) return;

      // 楽観的更新のために現在のキャッシュを取得
      const tasksKey = ["tasks", variables.date];
      const allTasksKey = ["tasks"];

      // 既存のキャッシュを保存
      const previousTasksData = queryClient.getQueryData(tasksKey);
      const previousAllTasksData = queryClient.getQueryData(allTasksKey);

      // 楽観的にキャッシュから削除（アーカイブされたタスクは非表示）
      const filterOutArchived = (tasks: any[]) => {
        if (!tasks) return tasks;
        return tasks.filter((task: any) => task.id !== variables.id);
      };

      queryClient.setQueryData(tasksKey, filterOutArchived);

      // キャンセル可能なクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: tasksKey });
      await queryClient.cancelQueries({ queryKey: allTasksKey });

      return { previousTasksData, previousAllTasksData };
    },
    onlineAction: async (variables: ArchiveTaskVariables) => {
      const response = await apiClient.users.tasks[":id"].archive.$post({
        param: { id: variables.id },
      });

      if (!response.ok) {
        throw new Error("タスクのアーカイブに失敗しました");
      }

      return await response.json();
    },
    offlineAction: (variables: ArchiveTaskVariables) => {
      // オフライン時はアーカイブ済みIDを記録
      const archivedKey = "archived-tasks";
      const archivedIds = JSON.parse(localStorage.getItem(archivedKey) || "[]");
      if (!archivedIds.includes(variables.id)) {
        archivedIds.push(variables.id);
        localStorage.setItem(archivedKey, JSON.stringify(archivedIds));
      }

      // カスタムイベントを発火
      window.dispatchEvent(new Event("offline-data-updated"));

      return {
        id: variables.id,
        userId: "offline",
        title: "",
        startDate: null,
        dueDate: null,
        memo: null,
        doneDate: null,
        archivedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: (_data, variables) => {
      // React Queryのキャッシュを無効化
      if (variables.date) {
        const tasksKey = ["tasks", variables.date];
        queryClient.invalidateQueries({ queryKey: tasksKey });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (_error, variables, context) => {
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

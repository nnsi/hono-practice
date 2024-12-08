import { CreateTaskRequest, UpdateTaskRequest } from "@/types/request";
import { GetTaskResponse, GetTasksResponse } from "@/types/response";

export type TaskUsecase = {
  getTasks: (userId: string) => Promise<GetTasksResponse>;
  getTask: (userId: string, taskId: string) => Promise<GetTaskResponse | null>;
  createTask: (
    userId: string,
    params: CreateTaskRequest
  ) => Promise<GetTaskResponse>;
  updateTask: (
    userId: string,
    taskId: string,
    params: UpdateTaskRequest
  ) => Promise<GetTaskResponse>;
  deleteTask: (userId: string, taskId: string) => Promise<void>;
  bulkDeleteDoneTask: (userId: string) => Promise<void>;
};

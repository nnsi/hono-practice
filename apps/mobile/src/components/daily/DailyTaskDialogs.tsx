import { DeleteConfirmDialog } from "../tasks/DeleteConfirmDialog";
import { TaskCreateDialog } from "../tasks/TaskCreateDialog";
import { TaskEditDialog } from "../tasks/TaskEditDialog";
import type { TaskItem } from "../tasks/types";
import type { Task } from "./TaskList";

type Props = {
  date: string;
  createOpen: boolean;
  onCloseCreate: () => void;
  editingTask: TaskItem | null | undefined;
  onCloseEdit: () => void;
  onDeleteFromEdit: (id: string) => void;
  deletingTask: Task | null;
  onConfirmDelete: (task: Task) => void;
  onCancelDelete: () => void;
};

/** デイリー画面のタスク系ダイアログ（作成 / 編集 / 削除確認）をまとめたもの */
export function DailyTaskDialogs({
  date,
  createOpen,
  onCloseCreate,
  editingTask,
  onCloseEdit,
  onDeleteFromEdit,
  deletingTask,
  onConfirmDelete,
  onCancelDelete,
}: Props) {
  return (
    <>
      {createOpen && (
        <TaskCreateDialog
          defaultDate={date}
          onClose={onCloseCreate}
          onSuccess={onCloseCreate}
        />
      )}

      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          onClose={onCloseEdit}
          onSuccess={onCloseEdit}
          onDelete={onDeleteFromEdit}
        />
      )}

      {deletingTask && (
        <DeleteConfirmDialog
          taskTitle={deletingTask.title}
          variant={deletingTask.isVirtual ? "skipToday" : "task"}
          onConfirm={() => onConfirmDelete(deletingTask)}
          onCancel={onCancelDelete}
        />
      )}
    </>
  );
}

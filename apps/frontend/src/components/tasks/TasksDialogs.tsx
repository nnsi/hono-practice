import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { TaskCreateDialog } from "./TaskCreateDialog";
import { TaskEditDialog } from "./TaskEditDialog";
import type { TaskItem } from "./types";

type Props = {
  createDialogOpen: boolean;
  onCloseCreate: () => void;
  onCreateSuccess: () => void;
  editingTask: TaskItem | null;
  onCloseEdit: () => void;
  onEditSuccess: () => void;
  onDeleteFromEdit: (id: string) => void;
  deleteConfirmId: string | null;
  deleteTaskTitle: string;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
};

export function TasksDialogs({
  createDialogOpen,
  onCloseCreate,
  onCreateSuccess,
  editingTask,
  onCloseEdit,
  onEditSuccess,
  onDeleteFromEdit,
  deleteConfirmId,
  deleteTaskTitle,
  onConfirmDelete,
  onCancelDelete,
}: Props) {
  return (
    <>
      {createDialogOpen && (
        <TaskCreateDialog onClose={onCloseCreate} onSuccess={onCreateSuccess} />
      )}

      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          onClose={onCloseEdit}
          onSuccess={onEditSuccess}
          onDelete={onDeleteFromEdit}
        />
      )}

      {deleteConfirmId && (
        <DeleteConfirmDialog
          taskTitle={deleteTaskTitle}
          onConfirm={() => onConfirmDelete(deleteConfirmId)}
          onCancel={onCancelDelete}
        />
      )}
    </>
  );
}

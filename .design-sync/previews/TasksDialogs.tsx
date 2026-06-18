import { TasksDialogs } from "actiko-frontend";

// タスク画面のダイアログ束ね。props のフラグに応じて作成/編集/削除確認の
// いずれかのモーダルを描画する（同時に1つ）。各分岐を別ストーリーで網羅する。
const noop = () => {};

const editingTask = {
  id: "task-1",
  userId: "user-1",
  activityId: null,
  activityKindId: null,
  quantity: null,
  title: "10km走る",
  startDate: "2024-05-15",
  dueDate: "2024-05-20",
  doneDate: null,
  memo: "週末のロング走",
  archivedAt: null,
  createdAt: "2024-05-15T00:00:00.000Z",
  updatedAt: "2024-05-15T00:00:00.000Z",
};

const baseProps = {
  createDialogOpen: false,
  onCloseCreate: noop,
  onCreateSuccess: noop,
  editingTask: null,
  onCloseEdit: noop,
  onEditSuccess: noop,
  onDeleteFromEdit: noop,
  deleteConfirmId: null,
  deleteTaskTitle: "",
  onConfirmDelete: noop,
  onCancelDelete: noop,
};

export function Create() {
  return <TasksDialogs {...baseProps} createDialogOpen={true} />;
}

export function Edit() {
  return <TasksDialogs {...baseProps} editingTask={editingTask} />;
}

export function DeleteConfirm() {
  return (
    <TasksDialogs
      {...baseProps}
      deleteConfirmId="task-1"
      deleteTaskTitle="10km走る"
    />
  );
}

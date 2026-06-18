import { TaskEditDialog } from "actiko-frontend";

// タスク編集ダイアログ（ModalOverlay 付きモーダル）。渡した task から初期値（タイトル
// 「10km走る」期限など）を内部フックが導出。タイトル/日付/メモ欄と削除/キャンセル/保存ボタン。
const noop = () => {};

const task = {
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

export function Default() {
  return (
    <TaskEditDialog
      task={task}
      onClose={noop}
      onSuccess={noop}
      onDelete={noop}
    />
  );
}

export function Archived() {
  return (
    <TaskEditDialog
      task={{
        ...task,
        id: "task-2",
        title: "確定申告を済ませる",
        memo: "",
        archivedAt: "2024-05-18T00:00:00.000Z",
      }}
      onClose={noop}
      onSuccess={noop}
      onDelete={noop}
    />
  );
}

import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export type Task = {
  id: string;
  title: string;
  doneDate: string | null;
  memo: string;
  startDate: string | null;
  dueDate: string | null;
};

export function TaskList({
  tasks,
  isLoading,
  onToggle,
}: {
  tasks: Task[];
  isLoading: boolean;
  onToggle: (task: Task) => void;
}) {
  if (isLoading) {
    return (
      <div className="text-center text-gray-400 py-8">
        <Loader2 size={20} className="animate-spin inline-block" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">タスクはありません</div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white"
        >
          <button
            type="button"
            onClick={() => onToggle(task)}
            className="shrink-0 p-0.5"
          >
            {task.doneDate ? (
              <CheckCircle2 size={24} className="text-green-500" />
            ) : (
              <Circle size={24} className="text-gray-300" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div
              className={`text-base font-medium ${
                task.doneDate ? "line-through text-gray-400" : "text-gray-800"
              }`}
            >
              {task.title}
            </div>
            {task.memo && (
              <div className="text-xs text-gray-400 mt-0.5 truncate">
                {task.memo}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

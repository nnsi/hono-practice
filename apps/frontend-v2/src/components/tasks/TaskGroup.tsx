import { TaskCard } from "./TaskCard";
import type { TaskItem } from "./types";

export function TaskGroup({
  title,
  tasks,
  titleColor = "text-gray-700",
  highlight = false,
  completed = false,
  archived = false,
  onToggleDone,
  onEdit,
  onDelete,
  onArchive,
}: {
  title: string;
  tasks: TaskItem[];
  titleColor?: string;
  highlight?: boolean;
  completed?: boolean;
  archived?: boolean;
  onToggleDone: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
  onArchive: (task: TaskItem) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div>
      <h2 className={`text-sm font-semibold ${titleColor} mb-2`}>
        {title}{" "}
        <span className="text-xs text-gray-400 font-normal">
          ({tasks.length})
        </span>
      </h2>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            highlight={highlight}
            completed={completed}
            archived={archived}
            onToggleDone={() => onToggleDone(task)}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task.id)}
            onArchive={() => onArchive(task)}
          />
        ))}
      </div>
    </div>
  );
}

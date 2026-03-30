import { useTranslation } from "@packages/i18n";
import {
  Archive,
  CalendarCheck,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { TaskCardBody } from "./TaskCardBody";
import { SwipeCompleteAction, SwipeDeleteAction } from "./TaskSwipeActions";
import type { TaskItem } from "./types";
import { useTaskCard } from "./useTaskCard";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export function TaskCard({
  task,
  highlight = false,
  completed = false,
  archived = false,
  onToggleDone,
  onEdit,
  onDelete,
  onArchive,
  onMoveToToday,
}: {
  task: TaskItem;
  highlight?: boolean;
  completed?: boolean;
  archived?: boolean;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onMoveToToday?: () => void;
}) {
  const { t } = useTranslation("task");
  const { linkedActivity, linkedKind, iconBlobMap, showMoveToToday } =
    useTaskCard(task, archived, onMoveToToday);

  return (
    <Swipeable
      renderLeftActions={
        !archived
          ? () => (
              <SwipeCompleteAction
                onToggleDone={onToggleDone}
                isDone={!!task.doneDate}
              />
            )
          : undefined
      }
      renderRightActions={
        !archived ? () => <SwipeDeleteAction onDelete={onDelete} /> : undefined
      }
    >
      <View
        className={`flex-row items-center gap-3 p-3.5 rounded-2xl ${
          highlight
            ? "border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
            : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800"
        } ${completed ? "opacity-70" : ""}`}
        style={
          !highlight
            ? {
                shadowColor: "#1c1917",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 3,
                elevation: 2,
              }
            : undefined
        }
      >
        {!archived && (
          <TouchableOpacity
            onPress={onToggleDone}
            className="p-0.5"
            hitSlop={HIT_SLOP}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!task.doneDate }}
            accessibilityLabel={task.title}
          >
            {task.doneDate ? (
              <CheckCircle2 size={22} color="#22c55e" />
            ) : (
              <Circle size={22} color="#9ca3af" />
            )}
          </TouchableOpacity>
        )}

        <TaskCardBody
          title={task.title}
          completed={completed}
          doneDate={task.doneDate}
          startDate={task.startDate}
          dueDate={task.dueDate}
          memo={task.memo}
          quantity={task.quantity}
          activityId={task.activityId}
          linkedActivity={linkedActivity}
          linkedKind={linkedKind}
          iconBlobMap={iconBlobMap}
          onEdit={onEdit}
        />

        <View className="flex-row items-center gap-0.5">
          {showMoveToToday && (
            <TouchableOpacity
              onPress={onMoveToToday}
              className="p-1.5"
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={t("card.moveToToday")}
            >
              <CalendarCheck size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
          {task.doneDate && !archived && (
            <TouchableOpacity
              onPress={onArchive}
              className="p-1.5"
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={t("card.archive")}
            >
              <Archive size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onEdit}
            className="p-1.5"
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t("card.edit")}
          >
            <Pencil size={16} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            className="p-1.5"
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t("card.delete")}
          >
            <Trash2 size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>
    </Swipeable>
  );
}

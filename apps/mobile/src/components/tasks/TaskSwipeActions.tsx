import { CheckCircle2, Trash2 } from "lucide-react-native";
import { TouchableOpacity } from "react-native";

export function SwipeCompleteAction({
  onToggleDone,
  isDone,
}: {
  onToggleDone: () => void;
  isDone: boolean;
}) {
  return (
    <TouchableOpacity
      style={{
        width: 80,
        backgroundColor: "#22c55e",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        marginRight: 8,
      }}
      onPress={onToggleDone}
      accessibilityRole="button"
      accessibilityLabel={isDone ? "未完了に戻す" : "完了にする"}
    >
      <CheckCircle2 size={20} color="#ffffff" />
    </TouchableOpacity>
  );
}

export function SwipeDeleteAction({ onDelete }: { onDelete: () => void }) {
  return (
    <TouchableOpacity
      style={{
        width: 80,
        backgroundColor: "#ef4444",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        marginLeft: 8,
      }}
      onPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel="タスクを削除"
    >
      <Trash2 size={20} color="#ffffff" />
    </TouchableOpacity>
  );
}

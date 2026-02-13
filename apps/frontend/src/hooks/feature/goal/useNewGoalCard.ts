import type { GoalResponse } from "@dtos/response";
import { apiClient } from "@frontend/utils/apiClient";
import { createWebStorageAdapter } from "@packages/frontend-shared/adapters/web";
import { createUseNewGoalCard } from "@packages/frontend-shared/hooks/feature";

// Webアダプターのインスタンスを作成
const storage = createWebStorageAdapter();

export const useNewGoalCard = (
  goal: GoalResponse,
  onEditEnd: () => void,
  isPast = false,
) => {
  // 共通フックをインスタンス化（各呼び出しで新しいインスタンスを作成）
  const useNewGoalCardBase = createUseNewGoalCard({
    apiClient,
    storage,
    onEditEnd,
    // Web固有のconfirm実装
    onConfirm: async (message: string) => window.confirm(message),
  });

  const { stateProps, actions, form } = useNewGoalCardBase(goal, isPast);

  // 後方互換性を維持しながら新しいAPIも公開
  return {
    ...stateProps,
    // 旧API互換のセッター
    setShowDetailModal: actions.onDetailModalOpenChange,
    setShowLogCreateDialog: actions.onLogCreateDialogOpenChange,
    // アクションを旧名でエクスポート
    handleUpdate: actions.onUpdate,
    handleDelete: actions.onDelete,
    handleLogCreateSuccess: actions.onLogCreateSuccess,
    handleTargetQuantityChange: actions.onTargetQuantityChange,
    handleDeleteClick: actions.onDeleteClick,
    handleCardClick: actions.onCardClick,
    handleCardKeyDown: actions.onCardKeyDown,
    handleLogCreateClick: actions.onLogCreateClick,
    handleEditClick: actions.onEditClick,
    handlePastGoalDeleteClick: actions.onPastGoalDeleteClick,
    // 後方互換性のためのupdateGoal/deleteGoalシミュレート
    updateGoal: { isPending: stateProps.isUpdating },
    deleteGoal: { isPending: stateProps.isDeleting },
    // フォーム
    form,
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};

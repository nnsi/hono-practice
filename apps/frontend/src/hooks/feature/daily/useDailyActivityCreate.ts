import { apiClient } from "@frontend/utils/apiClient";
import { createUseDailyActivityCreate } from "@packages/frontend-shared/hooks/feature";

// 共通フックをインスタンス化
const useDailyActivityCreateBase = createUseDailyActivityCreate({ apiClient });

export const useDailyActivityCreate = (
  onOpenChange: (open: boolean) => void,
  onSuccess?: () => void,
) => {
  // 共通のロジックを使用し、Web固有のコールバックを渡す
  const { stateProps, actions } = useDailyActivityCreateBase();

  // onOpenChangeとonSuccessをオーバーライド
  const handleSuccess = () => {
    actions.onSuccess();
    onOpenChange(false);
    onSuccess?.();
  };

  // 後方互換性を維持
  return {
    ...stateProps,
    // 旧API互換のアクション
    handleActivitySelect: actions.onActivitySelect,
    handleActivityDialogClose: actions.onActivityDialogClose,
    handleSuccess,
    // 新しいグループ化されたAPI
    stateProps,
    actions: {
      ...actions,
      onSuccess: handleSuccess,
    },
  };
};

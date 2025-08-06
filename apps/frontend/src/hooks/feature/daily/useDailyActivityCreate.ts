import { apiClient } from "@frontend/utils/apiClient";
import { createUseDailyActivityCreate } from "@packages/frontend-shared/hooks/feature";

// 共通フックをインスタンス化
const useDailyActivityCreateBase = createUseDailyActivityCreate({ apiClient });

export const useDailyActivityCreate = (
  onOpenChange: (open: boolean) => void,
  onSuccess?: () => void,
) => {
  // 共通のロジックを使用し、Web固有のコールバックを渡す
  const base = useDailyActivityCreateBase();

  // onOpenChangeとonSuccessをオーバーライド
  const handleSuccess = () => {
    base.handleSuccess();
    onOpenChange(false);
    onSuccess?.();
  };

  return {
    ...base,
    handleSuccess,
  };
};

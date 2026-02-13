import { useToast } from "@components/ui";
import type { GetActivityResponse } from "@dtos/response";
import { apiClient } from "@frontend/utils/apiClient";
import { createUseNewGoalDialog } from "@packages/frontend-shared/hooks/feature";

export const useNewGoalDialog = (
  onOpenChange: (open: boolean) => void,
  activities: GetActivityResponse[],
  onSuccess?: () => void,
) => {
  const { toast } = useToast();

  // 共通フックをインスタンス化
  const useNewGoalDialogBase = createUseNewGoalDialog({
    apiClient,
    onOpenChange,
    onSuccess,
    onSuccessMessage: (title, description) => {
      toast({
        title,
        description,
      });
    },
    onErrorMessage: (title, description) => {
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const { form, stateProps, actions, validationSchema } =
    useNewGoalDialogBase(activities);

  // 後方互換性を維持
  return {
    form,
    ...stateProps,
    // 旧API互換のアクション
    handleSubmit: actions.onSubmit,
    // コンポーネント互換性のためにcreateGoalをシミュレート
    createGoal: { isPending: stateProps.isPending },
    // 検証スキーマ
    validationSchema,
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};

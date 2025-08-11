import { useToast } from "@frontend/components/ui/use-toast";
import { apiClient } from "@frontend/utils";
import { createUseActivityBatchData } from "@packages/frontend-shared/hooks";

type UseActivityBatchDataOptions = {
  date: Date;
};

export function useActivityBatchData({ date }: UseActivityBatchDataOptions) {
  const { toast } = useToast();

  // エラー時のトースト通知を直接createUseActivityBatchDataに渡す
  const result = createUseActivityBatchData({
    apiClient,
    date,
    onError: () => {
      toast({
        title: "エラー",
        description: "データの取得に失敗しました",
        variant: "destructive",
      });
    },
  });

  return result;
}

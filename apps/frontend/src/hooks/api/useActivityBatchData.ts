import { useEffect } from "react";

import { useToast } from "@frontend/components/ui/use-toast";
import { apiClient } from "@frontend/utils";
import { createUseActivityBatchData } from "@packages/frontend-shared/hooks";

type UseActivityBatchDataOptions = {
  date: Date;
};

export function useActivityBatchData({ date }: UseActivityBatchDataOptions) {
  const { toast } = useToast();
  const result = createUseActivityBatchData({ apiClient, date });

  // エラーハンドリング
  useEffect(() => {
    if (result.error) {
      toast({
        title: "エラー",
        description: "データの取得に失敗しました",
        variant: "destructive",
      });
    }
  }, [result.error, toast]);

  return result;
}

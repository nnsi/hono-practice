import { apiClient } from "@frontend/utils";
import { useQuery } from "@tanstack/react-query";

import type { GetActivitiesResponse } from "@dtos/response";
import { GetActivitiesResponseSchema } from "@dtos/response";

/**
 * 全アクティビティ一覧を取得するフック
 *
 * 他のコンポーネントで重複していた取得処理を共通化するために作成。
 */
export function useActivities() {
  return useQuery<GetActivitiesResponse>({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await apiClient.users.activities.$get();
      const json = await res.json();
      const parsed = GetActivitiesResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Failed to parse activities");
      }
      return parsed.data;
    },
  });
}

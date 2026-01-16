import type {
  GetActivityLogResponse,
  GetActivityResponse,
} from "@dtos/response";
import { createReactNativeNotificationAdapter } from "@packages/frontend-shared/adapters";
import { createUseActivityLogEdit } from "@packages/frontend-shared/hooks/feature";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { apiClient } from "../../../utils/apiClient";

export const useActivityLogEdit = (
  open: boolean,
  onOpenChange: (open: boolean) => void,
  log: GetActivityLogResponse | null,
  activities: GetActivityResponse[],
) => {
  const queryClient = useQueryClient();
  const dateStr = log ? dayjs(log.date).format("YYYY-MM-DD") : "";

  const notification = createReactNativeNotificationAdapter();

  const dependencies = {
    activities,
    updateActivityLog: {
      mutateAsync: async (params: {
        id: string;
        data: { memo?: string; quantity?: number; activityKindId?: string };
        date: string;
      }) => {
        await apiClient.users["activity-logs"][":id"].$put({
          param: { id: params.id },
          json: {
            quantity: params.data.quantity,
            memo: params.data.memo,
            activityKindId: params.data.activityKindId,
          },
        });
        queryClient.invalidateQueries({
          queryKey: ["activity-logs", params.date],
        });
      },
      isPending: false,
    },
    deleteActivityLog: {
      mutateAsync: async (params: { id: string; date: string }) => {
        await apiClient.users["activity-logs"][":id"].$delete({
          param: { id: params.id },
        });
        queryClient.invalidateQueries({
          queryKey: ["activity-logs", params.date],
        });
      },
      isPending: false,
    },
    notification,
  };

  return createUseActivityLogEdit(dependencies, open, onOpenChange, log);
};

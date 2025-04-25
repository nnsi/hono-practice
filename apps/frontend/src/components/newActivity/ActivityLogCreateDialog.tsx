import { ActivityLogCreateFormBody } from "@frontend/components/activity/ActivityLogCreateForm";
import { Dialog, DialogContent } from "@frontend/components/ui";
import { apiClient } from "@frontend/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";

import {
  type CreateActivityLogRequest,
  CreateActivityLogRequestSchema,
} from "@dtos/request/CreateActivityLogRequest";
import type { GetActivityResponse } from "@dtos/response";
import {
  GetActivityLogResponseSchema,
  type GetActivityLogsResponse,
} from "@dtos/response/GetActivityLogsResponse";

import { useToast } from "@components/ui";

export function ActivityLogCreateDialog({
  open,
  onOpenChange,
  activity,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: GetActivityResponse;
  date: Date;
}) {
  const form = useForm<CreateActivityLogRequest>({
    resolver: zodResolver(CreateActivityLogRequestSchema),
    defaultValues: {
      date: dayjs(date).format("YYYY-MM-DD"),
      quantity: 0,
      activityKindId: undefined,
    },
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  form.setValue("date", dayjs(date).format("YYYY-MM-DD"));

  const onSubmit = async (data: CreateActivityLogRequest) => {
    CreateActivityLogRequestSchema.parse(data);
    if (!date) {
      toast({
        title: "Error",
        description: "Failed to create activity log",
        variant: "destructive",
      });
      return;
    }
    const res = await apiClient.users["activity-logs"].$post({
      json: {
        ...data,
        activityId: activity.id,
      },
    });
    if (res.status !== 200) {
      return;
    }
    const json = await res.json();
    const parsedJson = GetActivityLogResponseSchema.safeParse(json);
    if (!parsedJson.success) {
      toast({
        title: "Error",
        description: "Failed to create activity log",
        variant: "destructive",
      });
      return;
    }
    form.reset();
    queryClient.setQueryData(
      ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      (prev: GetActivityLogsResponse) => {
        return [...(prev ?? []), parsedJson.data];
      },
    );
    queryClient.setQueryData(
      ["activity-logs-monthly", dayjs(date).format("YYYY-MM")],
      (prev: GetActivityLogsResponse) => {
        return [...(prev ?? []), parsedJson.data];
      },
    );
    toast({
      title: "登録完了",
      description: "アクティビティを記録しました",
      variant: "default",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80 mt-[-0.5rem]">
        <ActivityLogCreateFormBody
          form={form}
          activity={activity}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

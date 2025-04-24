import { useContext, useState } from "react";

import { ActivityLogCreateFormBody } from "@frontend/components/activity/ActivityLogCreateForm";
import {
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
} from "@frontend/components/ui";
import { DateContext } from "@frontend/providers/DateProvider";
import { apiClient, qp } from "@frontend/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";

import {
  CreateActivityLogRequestSchema,
  type CreateActivityLogRequest,
} from "@dtos/request/CreateActivityLogRequest";
import {
  GetActivitiesResponseSchema,
  type GetActivityResponse,
} from "@dtos/response";
import {
  GetActivityLogResponseSchema,
  type GetActivityLogsResponse,
} from "@dtos/response/GetActivityLogsResponse";

import { useToast } from "@components/ui";

export const ActivityRegistPage: React.FC = () => {
  const { date, setDate } = useContext(DateContext);
  const [open, setOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<GetActivityResponse | null>(null);

  const { data: activities, error: _activitiesError } = useQuery({
    ...qp({
      queryKey: ["tasks"],
      queryFn: () => apiClient.users.activities.$get(),
      schema: GetActivitiesResponseSchema,
    }),
  });

  /* activity-logsを取得したい時があるかも
  useQuery({
    ...qp({
      queryKey: ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      queryFn: () =>
        apiClient.users["activity-logs"].$get({
          query: {
            date: dayjs(date).format("YYYY-MM-DD"),
          },
        }),
      schema: GetActivityLogsResponseSchema,
    }),
  });
  */

  const handleActivityClick = (activity: GetActivityResponse) => {
    setSelectedActivity(activity);
    setOpen(true);
  };

  const handleNewActivityClick = () => {
    setOpen(true);
  };

  return (
    <>
      <p className="flex items-center justify-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setDate(new Date(date.setDate(date.getDate() - 1)))}
        >
          <ChevronLeftIcon />
        </button>
        {date.toLocaleDateString()}
        <button
          type="button"
          onClick={() => setDate(new Date(date.setDate(date.getDate() + 1)))}
        >
          <ChevronRightIcon />
        </button>
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 items-center justify-center">
        {activities?.map((activity) => (
          <ActivityCard
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
          >
            <div className="text-5xl mb-2">{activity.emoji}</div>
            <div className="text-sm text-gray-800 font-medium">
              {activity.name}
            </div>
          </ActivityCard>
        ))}
        <ActivityCard onClick={handleNewActivityClick}>
          <div className="text-5xl mb-2">
            <PlusIcon className="w-16 h-16" />
          </div>
        </ActivityCard>
      </div>
      <NewActivityDialog
        open={open && !selectedActivity}
        onOpenChange={setOpen}
      />
      {selectedActivity && (
        <ActivityLogCreateDialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setSelectedActivity(null);
          }}
          activity={selectedActivity}
          date={date}
        />
      )}
    </>
  );
};

function ActivityCard({
  children,
  onClick,
}: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Card
      className="flex items-center justify-center py-6 shadow-md rounded-3xl cursor-pointer hover:bg-gray-100 select-none"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center py-0">
        {children}
      </CardContent>
    </Card>
  );
}

function NewActivityDialog({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Activity</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function ActivityLogCreateDialog({
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

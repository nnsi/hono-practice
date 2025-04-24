import { useContext } from "react";

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
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";

import {
  GetActivitiesResponseSchema,
  type GetActivityResponse,
} from "@dtos/response";

export const ActivityRegistPage: React.FC = () => {
  const { date, setDate } = useContext(DateContext);

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
    console.log(activity);
  };

  const handleNewActivityClick = () => {
    console.log("new activity");
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

function NewActivityDialog() {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Activity</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

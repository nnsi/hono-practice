import { useQueryClient } from "@tanstack/react-query";

import type { GetActivitiesResponse } from "@dtos/response";

import { ActivityLogCreateForm } from ".";

type ActivityListProps = {
  date?: Date;
};

export const ActivityList: React.FC<ActivityListProps> = ({ date }) => {
  const queryClient = useQueryClient();

  const activities = queryClient.getQueryData<GetActivitiesResponse>([
    "activity",
  ]);

  return (
    <div className="flex flex-wrap gap-2">
      {activities?.map((activity) => (
        <ActivityLogCreateForm
          key={activity.id}
          activity={activity}
          date={date}
        />
      ))}
    </div>
  );
};

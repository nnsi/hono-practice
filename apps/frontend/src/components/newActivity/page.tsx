import { Card } from "@frontend/components/ui";
import { apiClient, qp } from "@frontend/utils";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";

import { GetActivitiesResponseSchema } from "@dtos/response";

export const ActivityRegistPage: React.FC = () => {
  const { data, error: _error } = useQuery({
    ...qp({
      queryKey: ["tasks"],
      queryFn: () => apiClient.users.activities.$get(),
      schema: GetActivitiesResponseSchema,
    }),
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5 items-center justify-center">
      {data?.map((activity) => (
        <ActivityCard key={activity.id} onClick={() => {}}>
          <div className="text-5xl mb-2">{activity.emoji}</div>
          <div className="text-sm text-gray-800 font-medium">
            {activity.name}
          </div>
        </ActivityCard>
      ))}
      <ActivityCard key="new" onClick={() => {}}>
        <div className="text-5xl mb-2">
          <PlusIcon className="w-16 h-16" />
        </div>
      </ActivityCard>
    </div>
  );
};

function ActivityCard({
  key,
  children,
  onClick,
}: { key: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Card
      key={key}
      className="flex flex-col items-center justify-center py-6 shadow-md rounded-3xl"
      onClick={onClick}
    >
      {children}
    </Card>
  );
}

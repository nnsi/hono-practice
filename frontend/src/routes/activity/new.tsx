import {
  createFileRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Sheet, SheetContent } from "@ui/.";
import { ActivitySettings } from "../../components";
import { useQueryClient } from "@tanstack/react-query";
import { GetActivitiesResponse } from "@/types/response";
import { useState } from "react";

type NewActivityPageProps = {};

const NewActivityPage: React.FC<NewActivityPageProps> = () => {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const queryClient = useQueryClient();
  const [activities, setActivities] = useState<
    GetActivitiesResponse | undefined
  >(queryClient.getQueryData<GetActivitiesResponse>(["activity"]));

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate({ to: "/activity" });
    }
  };

  if (activities === undefined) {
    // queryClient.getQueryDataに値が入るまで500msずつ5回リトライする
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count > 5) {
        clearInterval(interval);
      }
      if (activities !== undefined) {
        clearInterval(interval);
      }
      setActivities(
        queryClient.getQueryData<GetActivitiesResponse>(["activity"])
      );
    }, 500);
  }
  return (
    <Sheet
      open={routerState.location.pathname === "/activity/new"}
      onOpenChange={handleOpenChange}
    >
      <SheetContent>
        <ActivitySettings activities={activities} />
      </SheetContent>
    </Sheet>
  );
};

export const Route = createFileRoute("/activity/new")({
  component: NewActivityPage,
});

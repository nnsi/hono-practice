import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";

import { GetActivitiesResponse } from "@/types/response";

import { Sheet, SheetContent } from "@components/ui";

import { ActivitySettings } from "@components/activity";

const NewActivityPage: React.FC = () => {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const activities = useQuery<GetActivitiesResponse>({
    queryKey: ["activity"],
    enabled: false,
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate({ to: "/activity" });
    }
  };

  return (
    <Sheet
      open={routerState.location.pathname === "/activity/setting"}
      onOpenChange={handleOpenChange}
    >
      <SheetContent>
        <ActivitySettings activities={activities?.data} />
      </SheetContent>
    </Sheet>
  );
};

export const Route = createFileRoute("/activity/setting")({
  component: NewActivityPage,
});

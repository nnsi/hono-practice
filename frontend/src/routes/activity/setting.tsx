import {
  createFileRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Sheet, SheetContent } from "@ui/.";
import { ActivitySettings } from "../../components";
import { useQuery } from "@tanstack/react-query";
import { GetActivitiesResponse } from "@/types/response";

type NewActivityPageProps = {};

const NewActivityPage: React.FC<NewActivityPageProps> = () => {
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

import {
  createFileRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";

import { Sheet, SheetContent } from "@components/ui";

import { ActivitySettings } from "@components/activity";

const NewActivityPage: React.FC = () => {
  const navigate = useNavigate();
  const routerState = useRouterState();

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
      <SheetContent className="overflow-auto">
        <ActivitySettings />
      </SheetContent>
    </Sheet>
  );
};

export const Route = createFileRoute("/activity/setting")({
  component: NewActivityPage,
});

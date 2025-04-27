import { createFileRoute } from "@tanstack/react-router";

import { ActivityDailyPage } from "@components/newActivity";

export const Route = createFileRoute("/activity/daily")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ActivityDailyPage />;
}

import { createFileRoute } from "@tanstack/react-router";

import { ActivityDailyPage } from "@components/daily";

export const Route = createFileRoute("/daily")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ActivityDailyPage />;
}

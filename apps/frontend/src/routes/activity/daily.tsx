import { createFileRoute } from "@tanstack/react-router";

import { DailyPage } from "@components/newActivity";

export const Route = createFileRoute("/activity/daily")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DailyPage />;
}

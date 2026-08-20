import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/daily")({
  component: lazyRouteComponent(
    () => import("../components/daily"),
    "DailyPage",
  ),
});

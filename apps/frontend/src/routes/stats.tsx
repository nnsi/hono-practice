import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/stats")({
  component: lazyRouteComponent(
    () => import("../components/stats"),
    "StatsPage",
  ),
});

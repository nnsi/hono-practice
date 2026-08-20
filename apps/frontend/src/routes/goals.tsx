import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/goals")({
  component: lazyRouteComponent(
    () => import("../components/goal"),
    "GoalsPage",
  ),
});

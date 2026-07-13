import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/actiko")({
  component: lazyRouteComponent(
    () => import("../components/actiko"),
    "ActikoPage",
  ),
});

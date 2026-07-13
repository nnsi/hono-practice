import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/api-reference")({
  component: lazyRouteComponent(
    () => import("../components/api-reference/ApiReferencePage"),
    "ApiReferencePage",
  ),
});

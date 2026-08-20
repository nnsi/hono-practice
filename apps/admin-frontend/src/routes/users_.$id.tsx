import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/users_/$id")({
  component: lazyRouteComponent(
    () => import("../components/users/UserDetailPage"),
    "UserDetailPage",
  ),
});

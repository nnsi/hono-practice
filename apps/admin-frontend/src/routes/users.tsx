import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/users")({
  component: lazyRouteComponent(
    () => import("../components/users/UsersPage"),
    "UsersPage",
  ),
});

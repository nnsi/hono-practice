import { createFileRoute } from "@tanstack/react-router";

import { UserDetailPage } from "../components/users/UserDetailPage";

export const Route = createFileRoute("/users_/$id")({
  component: UserDetailPage,
});

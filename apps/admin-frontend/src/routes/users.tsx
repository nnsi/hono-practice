import { createFileRoute } from "@tanstack/react-router";

import { UsersPage } from "../components/users/UsersPage";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

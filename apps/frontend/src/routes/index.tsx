import { createFileRoute } from "@tanstack/react-router";

import { ActivityRegistPage } from "@components/newActivity";

export const Route = createFileRoute("/")({
  component: ActivityRegistPage,
});

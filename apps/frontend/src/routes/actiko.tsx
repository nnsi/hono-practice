import { createFileRoute } from "@tanstack/react-router";

import { ActivityRegistPage } from "@components/activity";

export const Route = createFileRoute("/actiko")({
  component: ActivityRegistPage,
});

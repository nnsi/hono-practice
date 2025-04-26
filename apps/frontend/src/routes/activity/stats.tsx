import { createFileRoute } from "@tanstack/react-router";

import { StatsPage } from "@components/stats";

export const Route = createFileRoute("/activity/stats")({
  component: StatsPage,
});

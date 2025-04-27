import { ActivityStatsPage } from "@frontend/components";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/activity/stats")({
  component: ActivityStatsPage,
});

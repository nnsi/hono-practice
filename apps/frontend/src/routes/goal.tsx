import { GoalPage } from "@frontend/components";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/goal")({
  component: GoalPage,
});
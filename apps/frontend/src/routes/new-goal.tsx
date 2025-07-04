import { NewGoalPage } from "@frontend/components";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/new-goal")({
  component: NewGoalPage,
});

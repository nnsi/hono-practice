import { createFileRoute } from "@tanstack/react-router";
import { GoalsPage } from "../components/GoalsPage";

export const Route = createFileRoute("/goals")({
  component: GoalsPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { GoalsPage } from "../components/goal";

export const Route = createFileRoute("/goals")({
  component: GoalsPage,
});

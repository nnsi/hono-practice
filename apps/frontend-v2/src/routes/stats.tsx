import { createFileRoute } from "@tanstack/react-router";
import { StatsPage } from "../components/stats";

export const Route = createFileRoute("/stats")({
  component: StatsPage,
});

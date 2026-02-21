import { createFileRoute } from "@tanstack/react-router";
import { DailyPage } from "../components/daily";

export const Route = createFileRoute("/daily")({
  component: DailyPage,
});

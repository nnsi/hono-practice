import { createFileRoute } from "@tanstack/react-router";
import { DailyPage } from "../components/DailyPage";

export const Route = createFileRoute("/daily")({
  component: DailyPage,
});

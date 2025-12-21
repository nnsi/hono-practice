import { ActivityRegistPage } from "@components/activity";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/actiko")({
  component: ActivityRegistPage,
});

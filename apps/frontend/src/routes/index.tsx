import { ActivityRegistPage } from "@frontend/components/newActivity";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: ActivityRegistPage,
});

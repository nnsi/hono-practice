import { Setting } from "@frontend/components";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/setting")({
  component: Setting,
});

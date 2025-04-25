import { NewActivityRegistPage } from "@frontend/components/newActivity";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: NewActivityRegistPage,
});

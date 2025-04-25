import { NewActivityRegistPage } from "@frontend/components/newActivity/NewActivityRegistPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: NewActivityRegistPage,
});

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/notes")({
  component: lazyRouteComponent(
    () => import("../components/notes"),
    "NotesPage",
  ),
});

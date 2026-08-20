import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/notes_/$noteId")({
  component: lazyRouteComponent(
    () => import("../components/notes"),
    "NoteDetailPage",
  ),
});

import { createFileRoute } from "@tanstack/react-router";

import { NotesPage } from "../components/notes";

export const Route = createFileRoute("/notes")({
  component: NotesPage,
});

import { createFileRoute } from "@tanstack/react-router";

import { NoteDetailPage } from "../components/notes";

export const Route = createFileRoute("/notes_/$noteId")({
  component: NoteDetailPage,
});

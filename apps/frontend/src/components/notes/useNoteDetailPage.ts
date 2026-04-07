import { useEffect, useState } from "react";

import { useNavigate, useParams } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";

import { noteRepository } from "../../db/noteRepository";
import { useActivities } from "../../hooks/useActivities";
import { syncEngine } from "../../sync/syncEngine";

type Mode = "view" | "edit" | "preview";

export function useNoteDetailPage() {
  const { noteId } = useParams({ strict: false }) as { noteId: string };
  const navigate = useNavigate();
  const isNew = noteId === "new";

  const note = useLiveQuery(
    () => (!isNew ? noteRepository.getNoteById(noteId) : undefined),
    [noteId, isNew],
  );

  const { activities } = useActivities();

  const [mode, setMode] = useState<Mode>(isNew ? "edit" : "view");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isNew && note && !initialized) {
      setTitle(note.title);
      setContent(note.content);
      setActivityId(note.activityId);
      setInitialized(true);
    }
  }, [note, isNew, initialized]);

  const isLoading = !isNew && note === undefined && !initialized;
  const canSave = title.trim() !== "" && !isSubmitting;

  const enterEditMode = () => setMode("edit");

  const togglePreview = () =>
    setMode((prev) => (prev === "edit" ? "preview" : "edit"));

  const toggleSettings = () => setSettingsOpen((prev) => !prev);

  const handleSave = async () => {
    if (!canSave) return;
    setIsSubmitting(true);
    try {
      if (isNew) {
        await noteRepository.createNote({
          title: title.trim(),
          content,
          activityId,
        });
        syncEngine.syncNotes();
        navigate({ to: "/notes" });
      } else {
        await noteRepository.updateNote(noteId, {
          title: title.trim(),
          content,
          activityId,
        });
        syncEngine.syncNotes();
        setSettingsOpen(false);
        setMode("view");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => navigate({ to: "/notes" });

  return {
    noteId,
    isNew,
    isLoading,
    note,
    mode,
    settingsOpen,
    title,
    setTitle,
    content,
    setContent,
    activityId,
    setActivityId,
    isSubmitting,
    canSave,
    activities,
    enterEditMode,
    togglePreview,
    toggleSettings,
    handleSave,
    handleBack,
  };
}

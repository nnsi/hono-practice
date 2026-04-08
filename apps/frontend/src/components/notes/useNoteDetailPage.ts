import { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";

import { noteRepository } from "../../db/noteRepository";
import { useActivities } from "../../hooks/useActivities";
import { syncEngine } from "../../sync/syncEngine";

type Mode = "view" | "edit" | "preview";

export function useNoteDetailPage() {
  const { noteId } = useParams({ from: "/notes_/$noteId" });
  const navigate = useNavigate();
  const isNew = noteId === "new";

  // null sentinel: undefined=loading, null=not found, object=found
  const noteQueryResult = useLiveQuery(
    () =>
      !isNew
        ? noteRepository.getNoteById(noteId).then((n) => n ?? null)
        : undefined,
    [noteId, isNew],
  );

  const note = noteQueryResult ?? undefined;
  const isLoading = !isNew && noteQueryResult === undefined;
  const notFound = !isNew && noteQueryResult === null;

  const { activities } = useActivities();

  const [mode, setMode] = useState<Mode>(isNew ? "edit" : "view");
  const [settingsOpen, setSettingsOpen] = useState(isNew);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    if (!isNew && note && !initialized) {
      setTitle(note.title);
      setContent(note.content);
      setActivityId(note.activityId);
      setInitialized(true);
    }
  }, [note, isNew, initialized]);

  const canSave = title.trim() !== "" && !isSubmitting;

  const isDirty = useMemo(() => {
    if (mode === "view") return false;
    if (isNew)
      return (
        title.trim() !== "" || content.trim() !== "" || activityId !== null
      );
    if (!note) return false;
    return (
      title !== note.title ||
      content !== note.content ||
      activityId !== note.activityId
    );
  }, [mode, isNew, note, title, content, activityId]);

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

  const handleBack = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    navigate({ to: "/notes" });
  };

  const confirmDiscard = () => {
    setShowDiscardConfirm(false);
    navigate({ to: "/notes" });
  };

  const cancelDiscard = () => {
    setShowDiscardConfirm(false);
  };

  return {
    noteId,
    isNew,
    isLoading,
    notFound,
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
    isDirty,
    showDiscardConfirm,
    activities,
    enterEditMode,
    togglePreview,
    toggleSettings,
    handleSave,
    handleBack,
    confirmDiscard,
    cancelDiscard,
  };
}

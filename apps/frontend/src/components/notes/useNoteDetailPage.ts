import { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";

import { noteRepository } from "../../db/noteRepository";
import { useActivities } from "../../hooks/useActivities";
import { syncEngine } from "../../sync/syncEngine";

export function useNoteDetailPage() {
  const { noteId } = useParams({ from: "/notes_/$noteId" });
  const navigate = useNavigate();
  const isNew = noteId === "new";

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
  }, [initialized, isNew, note]);

  const isDirty = useMemo(() => {
    if (isNew) {
      return (
        title.trim() !== "" || content.trim() !== "" || activityId !== null
      );
    }
    if (!note) return false;
    return (
      title !== note.title ||
      content !== note.content ||
      activityId !== note.activityId
    );
  }, [activityId, content, isNew, note, title]);

  const canSave = title.trim() !== "" && isDirty && !isSubmitting;

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
    toggleSettings,
    handleSave,
    handleBack,
    confirmDiscard,
    cancelDiscard,
  };
}

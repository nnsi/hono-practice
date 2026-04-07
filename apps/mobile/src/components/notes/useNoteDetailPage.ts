import { useCallback, useEffect, useState } from "react";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useLiveQuery } from "../../db/useLiveQuery";
import { useActivities } from "../../hooks/useActivities";
import { noteRepository } from "../../repositories/noteRepository";
import { syncEngine } from "../../sync/syncEngine";

export type NoteDetailMode = "view" | "edit" | "preview";

export function useNoteDetailPage() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const router = useRouter();
  const { activities } = useActivities();

  const isNew = noteId === "new";

  const note = useLiveQuery(
    "notes",
    () =>
      !isNew && noteId
        ? noteRepository.getNoteById(noteId)
        : Promise.resolve(undefined),
    [noteId, isNew],
  );

  const [mode, setMode] = useState<NoteDetailMode>(isNew ? "edit" : "view");
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
  }, [isNew, note, initialized]);

  const isLoading = !isNew && note === undefined && !initialized;
  const canSave = title.trim() !== "" && !isSubmitting;

  const enterEditMode = useCallback(() => {
    setMode("edit");
  }, []);

  const togglePreview = useCallback(() => {
    setMode((prev) => (prev === "edit" ? "preview" : "edit"));
  }, []);

  const toggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev);
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setIsSubmitting(true);
    try {
      if (isNew) {
        await noteRepository.createNote({
          title: title.trim(),
          content,
          activityId,
        });
        syncEngine.syncAll();
        router.back();
      } else if (noteId) {
        await noteRepository.updateNote(noteId, {
          title: title.trim(),
          content,
          activityId,
        });
        syncEngine.syncAll();
        setSettingsOpen(false);
        setMode("view");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [canSave, isNew, noteId, title, content, activityId, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    isNew,
    isLoading,
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
    note,
    enterEditMode,
    togglePreview,
    toggleSettings,
    handleSave,
    handleBack,
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";

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

  // null sentinel: undefined=loading, null=not found, object=found
  const noteQueryResult = useLiveQuery(
    "notes",
    () =>
      !isNew && noteId
        ? noteRepository.getNoteById(noteId).then((n) => n ?? null)
        : Promise.resolve(undefined),
    [noteId, isNew],
  );

  const note = noteQueryResult ?? undefined;
  const isLoading = !isNew && noteQueryResult === undefined;
  const notFound = !isNew && noteQueryResult === null;

  const [mode, setMode] = useState<NoteDetailMode>(isNew ? "edit" : "view");
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
  }, [isNew, note, initialized]);

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
        router.navigate("/(tabs)/notes");
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
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    router.navigate("/(tabs)/notes");
  }, [isDirty, router]);

  const confirmDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    router.navigate("/(tabs)/notes");
  }, [router]);

  const cancelDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
  }, []);

  return {
    isNew,
    isLoading,
    notFound,
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
    note,
    enterEditMode,
    togglePreview,
    toggleSettings,
    handleSave,
    handleBack,
    confirmDiscard,
    cancelDiscard,
  };
}

import { useState } from "react";

import type { NoteRecord } from "@packages/domain/note/noteRecord";
import type { Syncable } from "@packages/domain/sync/syncableRecord";

import { noteRepository } from "../../db/noteRepository";
import { useActivities } from "../../hooks/useActivities";
import { syncEngine } from "../../sync/syncEngine";

export function useNoteEditDialog(
  note: Syncable<NoteRecord>,
  onSuccess: () => void,
) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [activityId, setActivityId] = useState<string | null>(note.activityId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activities } = useActivities();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await noteRepository.updateNote(note.id, {
        title: title.trim(),
        content,
        activityId,
      });
      onSuccess();
      syncEngine.syncNotes();
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    title,
    setTitle,
    content,
    setContent,
    activityId,
    setActivityId,
    activities,
    isSubmitting,
    handleSubmit,
  };
}

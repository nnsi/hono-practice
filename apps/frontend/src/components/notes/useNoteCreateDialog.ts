import { useState } from "react";

import { noteRepository } from "../../db/noteRepository";
import { useActivities } from "../../hooks/useActivities";
import { syncEngine } from "../../sync/syncEngine";

export function useNoteCreateDialog(onSuccess: () => void) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activities } = useActivities();

  const resetForm = () => {
    setTitle("");
    setContent("");
    setActivityId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await noteRepository.createNote({
        title: title.trim(),
        content,
        activityId,
      });
      resetForm();
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

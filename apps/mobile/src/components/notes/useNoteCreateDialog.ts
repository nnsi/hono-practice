import { useState } from "react";

import { noteRepository } from "../../repositories/noteRepository";
import { syncEngine } from "../../sync/syncEngine";

export function useNoteCreateDialog(onSuccess: () => void) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await noteRepository.createNote({
        title: title.trim(),
        content,
        activityId,
      });
      onSuccess();
      syncEngine.syncAll();
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
    isSubmitting,
    handleCreate,
  };
}

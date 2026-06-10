import { useCallback, useEffect, useRef, useState } from "react";

import { deriveNoteTitleFromContent } from "@packages/frontend-shared/utils/noteMarkdownBlocks";
import { useTranslation } from "@packages/i18n";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useLiveQuery } from "../../db/useLiveQuery";
import { useActivities } from "../../hooks/useActivities";
import { noteRepository } from "../../repositories/noteRepository";
import { syncEngine } from "../../sync/syncEngine";

const AUTOSAVE_DEBOUNCE_MS = 800;

type SaveState = "idle" | "saving" | "saved";

type PersistedSnapshot = {
  id: string | null;
  title: string;
  content: string;
  activityId: string | null;
};

export function useNoteDetailPage() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const router = useRouter();
  const { activities } = useActivities();
  const { t } = useTranslation("note");

  const isNew = noteId === "new";

  const noteQueryResult = useLiveQuery(
    "notes",
    () =>
      !isNew && noteId
        ? noteRepository.getNoteById(noteId).then((n) => n ?? null)
        : Promise.resolve(undefined),
    [noteId, isNew],
  );

  const note = noteQueryResult ?? undefined;
  const notFound = !isNew && noteQueryResult === null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">(isNew ? "edit" : "view");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [initialized, setInitialized] = useState(isNew);

  const persistedRef = useRef<PersistedSnapshot>({
    id: null,
    title: "",
    content: "",
    activityId: null,
  });
  const latestRef = useRef({ title, content, activityId });
  latestRef.current = { title, content, activityId };
  const untitledLabel = t("detail.untitled");

  useEffect(() => {
    if (!isNew && note && !initialized) {
      setTitle(note.title);
      setContent(note.content);
      setActivityId(note.activityId);
      persistedRef.current = {
        id: note.id,
        title: note.title,
        content: note.content,
        activityId: note.activityId,
      };
      setInitialized(true);
    }
  }, [initialized, isNew, note]);

  const isLoading = !notFound && !initialized;

  const flush = useCallback(async () => {
    const { title, content, activityId } = latestRef.current;
    const persisted = persistedRef.current;
    const trimmedTitle = title.trim();

    if (!persisted.id) {
      if (!trimmedTitle && !content.trim() && activityId === null) return;
      const effectiveTitle =
        trimmedTitle || deriveNoteTitleFromContent(content) || untitledLabel;
      setSaveState("saving");
      const created = await noteRepository.createNote({
        title: effectiveTitle,
        content,
        activityId,
      });
      persistedRef.current = {
        id: created.id,
        title: effectiveTitle,
        content,
        activityId,
      };
      setSaveState("saved");
      syncEngine.syncAll();
      return;
    }

    const effectiveTitle =
      trimmedTitle ||
      deriveNoteTitleFromContent(content) ||
      persisted.title ||
      untitledLabel;
    if (
      effectiveTitle === persisted.title &&
      content === persisted.content &&
      activityId === persisted.activityId
    ) {
      return;
    }
    setSaveState("saving");
    await noteRepository.updateNote(persisted.id, {
      title: effectiveTitle,
      content,
      activityId,
    });
    persistedRef.current = {
      id: persisted.id,
      title: effectiveTitle,
      content,
      activityId,
    };
    setSaveState("saved");
    syncEngine.syncAll();
  }, [untitledLabel]);

  // 入力が止まったら自動保存（初期ロード時は persisted と一致するため no-op）
  useEffect(() => {
    if (!initialized) return;
    const timer = setTimeout(() => {
      void flush();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [initialized, flush, title, content, activityId]);

  // アンマウント時に未保存分を flush する（ベストエフォート）
  useEffect(() => {
    return () => {
      void flush();
    };
  }, [flush]);

  const startEditing = useCallback(() => {
    setMode("edit");
  }, []);

  const handleBack = useCallback(async () => {
    await flush();
    router.navigate("/(tabs)/notes");
  }, [flush, router]);

  return {
    isNew,
    isLoading,
    notFound,
    title,
    setTitle,
    content,
    setContent,
    activityId,
    setActivityId,
    mode,
    saveState,
    activities,
    startEditing,
    handleBack,
  };
}

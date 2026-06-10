import { useCallback, useEffect, useRef, useState } from "react";

import { deriveNoteTitleFromContent } from "@packages/frontend-shared/utils/noteMarkdownBlocks";
import { useTranslation } from "@packages/i18n";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";

import { noteRepository } from "../../db/noteRepository";
import { useActivities } from "../../hooks/useActivities";
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
  const { noteId } = useParams({ from: "/notes_/$noteId" });
  const navigate = useNavigate();
  const { activities } = useActivities();
  const { t } = useTranslation("note");

  const isNew = noteId === "new";

  const noteQueryResult = useLiveQuery(
    () =>
      !isNew
        ? noteRepository.getNoteById(noteId).then((n) => n ?? null)
        : undefined,
    [noteId, isNew],
  );

  const note = noteQueryResult ?? undefined;
  const notFound = !isNew && noteQueryResult === null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [initialized, setInitialized] = useState(isNew);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const persistedRef = useRef<PersistedSnapshot>({
    id: null,
    title: "",
    content: "",
    activityId: null,
  });
  const latestRef = useRef({ title, content, activityId });
  latestRef.current = { title, content, activityId };
  const leavingRef = useRef(false);
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
      setCreatedId(created.id);
      syncEngine.syncNotes();
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
    syncEngine.syncNotes();
  }, [untitledLabel]);

  // 入力が止まったら自動保存（初期ロード時は persisted と一致するため no-op）
  useEffect(() => {
    if (!initialized) return;
    const timer = setTimeout(() => {
      void flush();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [initialized, flush, title, content, activityId]);

  // 新規ノート作成後は URL を実 ID に置き換える（リロードしても編集を継続できる）。
  // 一覧へ戻る途中の flush では置換しない（戻るナビゲーションを上書きしてしまうため）
  useEffect(() => {
    if (!createdId || !isNew || leavingRef.current) return;
    navigate({
      to: "/notes/$noteId",
      params: { noteId: createdId },
      replace: true,
    });
  }, [createdId, isNew, navigate]);

  // タブを閉じる・切り替える時とアンマウント時に未保存分を flush する
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void flush();
    };
  }, [flush]);

  const handleBack = useCallback(async () => {
    leavingRef.current = true;
    await flush();
    navigate({ to: "/notes" });
  }, [flush, navigate]);

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
    saveState,
    activities,
    handleBack,
  };
}
